import { desc, eq, inArray } from "drizzle-orm";
import { getHubMCSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { toNumber } from "@/lib/db/drizzle-helpers";

export async function handleGetProfile(request: Request): Promise<Response> {
  try {
    const session = await getHubMCSession(request);
    if (!session?.user?.minecraftUsername) {
      return new Response(
        JSON.stringify({ error: "Authentication required." }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }

    const username = session.user.minecraftUsername;

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.minecraftUsername, username))
      .orderBy(desc(orders.createdAt));

    const orderIds = userOrders.map((o) => o.id);
    const items =
      orderIds.length > 0
        ? await db
            .select()
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
        : [];

    const itemsByOrderId = new Map<string, typeof items>();
    for (const item of items) {
      const existing = itemsByOrderId.get(item.orderId) ?? [];
      existing.push(item);
      itemsByOrderId.set(item.orderId, existing);
    }

    const ownedPackages = new Map<string, { name: string; quantity: number; lastPurchased: string }>();
    let totalSpent = 0;

    for (const order of userOrders) {
      if (order.status === "PAID" || order.status === "FULFILLED") {
        totalSpent += toNumber(order.total);
        const orderItemList = itemsByOrderId.get(order.id) ?? [];
        for (const item of orderItemList) {
          const existing = ownedPackages.get(item.productId);
          const orderDate =
            order.createdAt instanceof Date
              ? order.createdAt.toISOString()
              : new Date(order.createdAt).toISOString();
          if (existing) {
            existing.quantity += item.quantity;
            if (orderDate > existing.lastPurchased) {
              existing.lastPurchased = orderDate;
            }
          } else {
            ownedPackages.set(item.productId, {
              name: item.productName,
              quantity: item.quantity,
              lastPurchased: orderDate,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        profile: {
          minecraftUsername: username,
          minecraftUuid: session.user.minecraftUuid,
          email: userOrders[0]?.email || session.user.email || "",
          totalOrders: userOrders.length,
          totalSpent,
          ownedPackages: Array.from(ownedPackages.values()),
          recentOrders: userOrders.slice(0, 5).map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            total: toNumber(o.total),
            status: o.status,
            deliveryStatus: o.deliveryStatus,
            createdAt:
              o.createdAt instanceof Date
                ? o.createdAt.toISOString()
                : new Date(o.createdAt).toISOString(),
            items: (itemsByOrderId.get(o.id) ?? []).map((i) => i.productName),
          })),
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    console.error("handleGetProfile error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
