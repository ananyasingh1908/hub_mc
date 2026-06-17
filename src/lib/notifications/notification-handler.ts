import { getPrismaClient } from "@/lib/db/prisma";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleGetNotifications(request: Request): Promise<Response> {
  try {
    const prisma = await getPrismaClient();
    const now = new Date();
    const notifications = await prisma.siteNotification.findMany({
      where: {
        active: true,
        startAt: { lte: now },
        OR: [{ expireAt: null }, { expireAt: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return json({
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: false,
        link: n.link,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    console.log("[Notifications] Failed to fetch:", err);
    return json({ notifications: [] }, 200);
  }
}

export async function handleUnreadCount(request: Request): Promise<Response> {
  try {
    const prisma = await getPrismaClient();
    const now = new Date();
    const count = await prisma.siteNotification.count({
      where: {
        active: true,
        startAt: { lte: now },
        OR: [{ expireAt: null }, { expireAt: { gte: now } }],
      },
    });
    return json({ unreadCount: count ?? 0 });
  } catch {
    return json({ unreadCount: 0 });
  }
}

export async function handleMarkRead(_request: Request): Promise<Response> {
  return json({ ok: true });
}

export async function handleMarkAllRead(_request: Request): Promise<Response> {
  return json({ ok: true });
}
