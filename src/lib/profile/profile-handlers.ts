import { getHubMCSession } from "@/lib/auth/session";
import { getPrismaClient } from "@/lib/db/prisma";

export async function handleGetProfile(request: Request): Promise<Response> {
  try {
    const session = await getHubMCSession(request);
    if (!session?.user?.minecraftUsername) {
      return new Response(
        JSON.stringify({ error: "Authentication required." }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }

    const prisma = await getPrismaClient();
    const username = session.user.minecraftUsername;

    const orders = await prisma.order.findMany({
      where: { minecraftUsername: username },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    const ownedPackages = new Map<string, { name: string; quantity: number; lastPurchased: string }>();
    let totalSpent = 0;

    for (const order of orders) {
      if (order.status === "PAID" || order.status === "FULFILLED") {
        totalSpent += Number(order.total);
        for (const item of order.items) {
          const existing = ownedPackages.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            if (order.createdAt.toISOString() > existing.lastPurchased) {
              existing.lastPurchased = order.createdAt.toISOString();
            }
          } else {
            ownedPackages.set(item.productId, {
              name: item.productName,
              quantity: item.quantity,
              lastPurchased: order.createdAt.toISOString(),
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
          email: orders[0]?.email || session.user.email || "",
          totalOrders: orders.length,
          totalSpent,
          ownedPackages: Array.from(ownedPackages.values()),
          recentOrders: orders.slice(0, 5).map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            total: Number(o.total),
            status: o.status,
            deliveryStatus: o.deliveryStatus,
            createdAt: o.createdAt.toISOString(),
            items: o.items.map((i) => i.productName),
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
