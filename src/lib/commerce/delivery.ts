import { desc, eq, inArray } from "drizzle-orm";
import { devlog } from "@/lib/dev-log";
import { db } from "@/lib/db";
import { activityLogs, orderItems, orders, products } from "@/lib/db/schema";
import { toNumber } from "@/lib/db/drizzle-helpers";
import { getRconConnection } from "@/lib/minecraft/rcon";

function buildItemCommands(
  commands: string[],
  username: string,
  items: Array<{ productName: string; quantity: number }>,
): void {
  for (const item of items) {
    const slug = item.productName.toLowerCase().replace(/\s+/g, "_");
    commands.push(`lp user ${username} parent add ${slug}`);
    commands.push(
      `tellraw ${username} {"text":"[HUBMC] You received ${item.quantity}x ${item.productName}!","color":"gold"}`,
    );
  }
}

export async function triggerDelivery(
  orderId: string,
  data: {
    minecraftUsername: string;
    minecraftUuid: string;
    items: Array<{ productId: string; productName: string; quantity: number }>;
  },
): Promise<void> {
  await db
    .update(orders)
    .set({ deliveryStatus: "PROCESSING" })
    .where(eq(orders.id, orderId));

  const commands: string[] = [];
  buildItemCommands(commands, data.minecraftUsername, data.items);

  const rcon = await getRconConnection();

  if (!rcon) {
    const commandLog = commands.join("\n");
    devlog(`[RCON] No connection — commands queued for order ${orderId}:\n${commandLog}`);

    await logOrderActivity(
      orderId,
      "DELIVERY_AWAITING_SERVER",
      "Order",
      "WARN",
      `Minecraft server unavailable. ${data.items.length} item(s) queued for ${data.minecraftUsername}.\nCommands:\n${commandLog}`,
    );

    await db
      .update(orders)
      .set({ deliveryStatus: "AWAITING_SERVER" })
      .where(eq(orders.id, orderId));

    return;
  }

  try {
    let allSucceeded = true;
    const failedCommands: string[] = [];

    for (const cmd of commands) {
      try {
        await rcon.send(cmd);
      } catch (cmdErr) {
        allSucceeded = false;
        failedCommands.push(cmd);
        console.error(`[RCON] Command failed: ${cmd}`, cmdErr);
      }
    }

    if (allSucceeded) {
      await db
        .update(orders)
        .set({
          deliveryStatus: "DELIVERED",
          deliveredAt: new Date(),
          status: "FULFILLED",
        })
        .where(eq(orders.id, orderId));

      await logOrderActivity(
        orderId,
        "DELIVERY",
        "Order",
        "success",
        `Delivered ${data.items.length} item(s) to ${data.minecraftUsername}`,
      );
    } else {
      await db
        .update(orders)
        .set({ deliveryStatus: "FAILED" })
        .where(eq(orders.id, orderId));

      await logOrderActivity(
        orderId,
        "DELIVERY_FAILED",
        "Order",
        "error",
        `Delivery failed for order ${orderId}. ${failedCommands.length} command(s) failed.`,
      );
    }
  } catch (error) {
    console.error(`[DELIVERY] Failed for order ${orderId}:`, error);

    await db
      .update(orders)
      .set({ deliveryStatus: "FAILED" })
      .where(eq(orders.id, orderId));

    await logOrderActivity(
      orderId,
      "DELIVERY_FAILED",
      "Order",
      "error",
      `Delivery exception: ${String(error)}`,
    );
  }
}

export async function retryDelivery(orderId: string): Promise<boolean> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const order = orderRows[0];
  if (!order) return false;

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  await db
    .update(orders)
    .set({ deliveryStatus: "PROCESSING" })
    .where(eq(orders.id, orderId));

  const commands: string[] = [];
  buildItemCommands(
    commands,
    order.minecraftUsername,
    itemRows.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
    })),
  );

  const rcon = await getRconConnection();

  if (!rcon) {
    const commandLog = commands.join("\n");
    devlog(`[RCON] No connection — retry commands queued for order ${orderId}:\n${commandLog}`);

    await logOrderActivity(
      orderId,
      "DELIVERY_RETRY_AWAITING_SERVER",
      "Order",
      "WARN",
      `Minecraft server unavailable during retry. ${itemRows.length} item(s) queued for ${order.minecraftUsername}.\nCommands:\n${commandLog}`,
    );

    await db
      .update(orders)
      .set({ deliveryStatus: "AWAITING_SERVER" })
      .where(eq(orders.id, orderId));

    return false;
  }

  try {
    let allSucceeded = true;
    const failedCommands: string[] = [];

    for (const cmd of commands) {
      try {
        await rcon.send(cmd);
      } catch (cmdErr) {
        allSucceeded = false;
        failedCommands.push(cmd);
        console.error(`[RCON] Retry command failed: ${cmd}`, cmdErr);
      }
    }

    if (allSucceeded) {
      await db
        .update(orders)
        .set({
          deliveryStatus: "DELIVERED",
          deliveredAt: new Date(),
          status: "FULFILLED",
        })
        .where(eq(orders.id, orderId));

      await logOrderActivity(
        orderId,
        "DELIVERY_RETRY",
        "Order",
        "success",
        `Retry delivered ${itemRows.length} item(s) to ${order.minecraftUsername}`,
      );

      return true;
    } else {
      await db
        .update(orders)
        .set({ deliveryStatus: "FAILED" })
        .where(eq(orders.id, orderId));

      await logOrderActivity(
        orderId,
        "DELIVERY_RETRY_FAILED",
        "Order",
        "error",
        `Retry failed for order ${orderId}. ${failedCommands.length} command(s) failed.`,
      );

      return false;
    }
  } catch (error) {
    console.error(`[DELIVERY_RETRY] Failed for order ${orderId}:`, error);

    await db
      .update(orders)
      .set({ deliveryStatus: "FAILED" })
      .where(eq(orders.id, orderId));

    await logOrderActivity(
      orderId,
      "DELIVERY_RETRY_FAILED",
      "Order",
      "error",
      `Retry exception: ${String(error)}`,
    );

    return false;
  }
}

export async function getOrdersForUser(customerId: string) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt));

  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((o) => o.id);

  const itemRows = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      subtotal: orderItems.subtotal,
      imageUrl: products.imageUrl,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(inArray(orderItems.orderId, orderIds));

  const itemsByOrder = new Map<string, typeof itemRows>();

  for (const item of itemRows) {
    const existing = itemsByOrder.get(item.orderId) ?? [];
    existing.push(item);
    itemsByOrder.set(item.orderId, existing);
  }

  return orderRows.map((order) => {
    const items = itemsByOrder.get(order.id) ?? [];

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: new Date(order.createdAt).toISOString(),
      minecraftUsername: order.minecraftUsername,
      minecraftUuid: order.minecraftUuid,
      email: order.email,
      country: order.country,
      paymentMethod: order.paymentMethod,
      items: items.map((item) => ({
        product: {
          id: item.productId,
          name: item.productName,
          price: toNumber(item.unitPrice),
          image: item.imageUrl ?? null,
        },
        quantity: item.quantity,
        subtotal: toNumber(item.subtotal),
      })),
      couponCode: null,
      subtotal: toNumber(order.subtotal),
      discountAmount: toNumber(order.discountAmount),
      total: toNumber(order.total),
      razorpayOrderId: order.razorpayOrderId ?? "",
      razorpayPaymentId: order.razorpayPaymentId ?? "",
      paymentStatus: order.status,
      deliveryStatus: order.deliveryStatus,
      deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null,
      refundedAt: order.refundedAt ? new Date(order.refundedAt).toISOString() : null,
      refundReason: order.refundReason ?? null,
    };
  });
}

async function logOrderActivity(
  orderId: string,
  action: string,
  entity: string,
  severity: string,
  details: string,
): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      action,
      entity,
      entityId: orderId,
      details,
      severity,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[ACTIVITY_LOG] Failed to log:", err);
  }
}