import { getHubMCSession } from "@/lib/auth/session";
import { getPrismaClient } from "@/lib/db/prisma";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleGetNotifications(request: Request): Promise<Response> {
  const session = await getHubMCSession(request);
  if (!session?.user?.customerId && !session?.user?.minecraftUuid) {
    return json({ notifications: [], unreadCount: 0 }, 200);
  }

  try {
    const prisma = await getPrismaClient();
    const userId = session.user.customerId;
    const where = userId ? { userId } : {};

    const notifications = await (prisma as any).notification?.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return json({
      notifications: (notifications ?? []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
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
  const session = await getHubMCSession(request);
  if (!session?.user?.customerId && !session?.user?.minecraftUuid) {
    return json({ unreadCount: 0 });
  }

  try {
    const prisma = await getPrismaClient();
    const userId = session.user.customerId;
    const where = userId ? { userId, read: false } : { read: false };

    const count = await (prisma as any).notification?.count({ where });
    return json({ unreadCount: count ?? 0 });
  } catch {
    return json({ unreadCount: 0 });
  }
}

export async function handleMarkRead(request: Request): Promise<Response> {
  const session = await getHubMCSession(request);
  if (!session?.user?.customerId && !session?.user?.minecraftUuid) {
    return json({ ok: false, error: "Not authenticated" }, 401);
  }

  try {
    const { notificationId } = (await request.json()) as { notificationId?: string };
    if (!notificationId) {
      return json({ ok: false, error: "Missing notificationId" }, 400);
    }

    const prisma = await getPrismaClient();
    await (prisma as any).notification?.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return json({ ok: true });
  } catch (err) {
    console.log("[Notifications] Failed to mark read:", err);
    return json({ ok: false, error: "Failed to mark as read" }, 500);
  }
}

export async function handleMarkAllRead(request: Request): Promise<Response> {
  const session = await getHubMCSession(request);
  if (!session?.user?.customerId && !session?.user?.minecraftUuid) {
    return json({ ok: false, error: "Not authenticated" }, 401);
  }

  try {
    const prisma = await getPrismaClient();
    const userId = session.user.customerId;
    if (userId) {
      await (prisma as any).notification?.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    }

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "Failed to mark all as read" }, 500);
  }
}
