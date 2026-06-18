import { devlog } from "@/lib/dev-log";
import { getPrismaClient } from "@/lib/db/prisma";
import { getRconConnection } from "@/lib/minecraft/rcon";

function buildItemCommands(commands: string[], username: string, items: Array<{ productName: string; quantity: number }>): void {
  for (const item of items) {
    const slug = item.productName.toLowerCase().replace(/\s+/g, "_");
    commands.push(`lp user ${username} parent add ${slug}`);
    commands.push(`tellraw ${username} {"text":"[HUBMC] You received ${item.quantity}x ${item.productName}!","color":"gold"}`);
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
  const prisma = await getPrismaClient();
  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryStatus: "PROCESSING" },
  });

  const commands: string[] = [];
  buildItemCommands(commands, data.minecraftUsername, data.items);

  const rcon = getRconConnection();

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

    const prisma2 = await getPrismaClient();
    await prisma2.order.update({
      where: { id: orderId },
      data: { deliveryStatus: "AWAITING_SERVER" },
    });
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

    const prisma2 = await getPrismaClient();

    if (allSucceeded) {
      await prisma2.order.update({
        where: { id: orderId },
        data: {
          deliveryStatus: "DELIVERED",
          deliveredAt: new Date(),
          status: "FULFILLED",
        },
      });
      await logOrderActivity(orderId, "DELIVERY", "Order", "success", `Delivered ${data.items.length} item(s) to ${data.minecraftUsername}`);
    } else {
      await prisma2.order.update({
        where: { id: orderId },
        data: { deliveryStatus: "FAILED" },
      });
      await logOrderActivity(orderId, "DELIVERY_FAILED", "Order", "error", `Delivery failed for order ${orderId}. ${failedCommands.length} command(s) failed.`);
    }
  } catch (error) {
    console.error(`[DELIVERY] Failed for order ${orderId}:`, error);
    const prisma2 = await getPrismaClient();
    await prisma2.order.update({
      where: { id: orderId },
      data: { deliveryStatus: "FAILED" },
    });
    await logOrderActivity(orderId, "DELIVERY_FAILED", "Order", "error", `Delivery exception: ${error}`);
  }
}

export async function retryDelivery(orderId: string): Promise<boolean> {
  const prisma = await getPrismaClient();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return false;

  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryStatus: "PROCESSING" },
  });

  const commands: string[] = [];
  buildItemCommands(commands, order.minecraftUsername, order.items);

  const rcon = getRconConnection();

  if (!rcon) {
    const commandLog = commands.join("\n");
    devlog(`[RCON] No connection — retry commands queued for order ${orderId}:\n${commandLog}`);

    await logOrderActivity(
      orderId,
      "DELIVERY_RETRY_AWAITING_SERVER",
      "Order",
      "WARN",
      `Minecraft server unavailable during retry. ${order.items.length} item(s) queued for ${order.minecraftUsername}.\nCommands:\n${commandLog}`,
    );

    const prisma2 = await getPrismaClient();
    await prisma2.order.update({
      where: { id: orderId },
      data: { deliveryStatus: "AWAITING_SERVER" },
    });
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

    const prisma2 = await getPrismaClient();

    if (allSucceeded) {
      await prisma2.order.update({
        where: { id: orderId },
        data: { deliveryStatus: "DELIVERED", deliveredAt: new Date(), status: "FULFILLED" },
      });
      await logOrderActivity(orderId, "DELIVERY_RETRY", "Order", "success", `Retry delivered ${order.items.length} item(s) to ${order.minecraftUsername}`);
      return true;
    } else {
      await prisma2.order.update({
        where: { id: orderId },
        data: { deliveryStatus: "FAILED" },
      });
      await logOrderActivity(orderId, "DELIVERY_RETRY_FAILED", "Order", "error", `Retry failed for order ${orderId}. ${failedCommands.length} command(s) failed.`);
      return false;
    }
  } catch (error) {
    console.error(`[DELIVERY_RETRY] Failed for order ${orderId}:`, error);
    const prisma2 = await getPrismaClient();
    await prisma2.order.update({
      where: { id: orderId },
      data: { deliveryStatus: "FAILED" },
    });
    await logOrderActivity(orderId, "DELIVERY_RETRY_FAILED", "Order", "error", `Retry exception: ${error}`);
    return false;
  }
}

export async function getOrdersForUser(username: string) {
  const prisma = await getPrismaClient();
  const orders = await prisma.order.findMany({
    where: { minecraftUsername: username },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    minecraftUsername: order.minecraftUsername,
    minecraftUuid: order.minecraftUuid,
    email: order.email,
    country: order.country,
    paymentMethod: order.paymentMethod,
    items: (order.items ?? []).map((item) => ({
      product: {
        id: item.productId,
        name: item.productName,
        price: Number(item.unitPrice),
        image: item.product?.imageUrl ?? null,
      },
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    })),
    couponCode: null,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    total: Number(order.total),
    razorpayOrderId: order.razorpayOrderId ?? "",
    razorpayPaymentId: order.razorpayPaymentId ?? "",
    paymentStatus: order.status,
    deliveryStatus: order.deliveryStatus,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    refundedAt: order.refundedAt?.toISOString() ?? null,
    refundReason: order.refundReason ?? null,
  }));
}

async function logOrderActivity(
  orderId: string,
  action: string,
  entity: string,
  severity: string,
  details: string,
): Promise<void> {
  try {
    const prisma = await getPrismaClient();
    await prisma.activityLog.create({
      data: {
        action,
        entity,
        entityId: orderId,
        details,
        severity,
      },
    });
  } catch (err) {
    console.error("[ACTIVITY_LOG] Failed to log:", err);
  }
}
