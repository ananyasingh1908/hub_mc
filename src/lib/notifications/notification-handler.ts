import { and, count, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteNotifications } from "@/lib/db/schema";
import { devlog } from "@/lib/dev-log";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleGetNotifications(_request: Request): Promise<Response> {
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(siteNotifications)
      .where(
        and(
          eq(siteNotifications.active, true),
          lte(siteNotifications.startAt, now),
          or(
            isNull(siteNotifications.expireAt),
            gte(siteNotifications.expireAt, now),
          ),
        ),
      )
      .orderBy(desc(siteNotifications.createdAt))
      .limit(50);

    return json({
      notifications: rows.map((n) => ({
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
    devlog("[Notifications] Failed to fetch:", err);
    return json({ notifications: [] }, 200);
  }
}

export async function handleUnreadCount(_request: Request): Promise<Response> {
  try {
    const now = new Date();
    const result = await db
      .select({ count: count() })
      .from(siteNotifications)
      .where(
        and(
          eq(siteNotifications.active, true),
          lte(siteNotifications.startAt, now),
          or(
            isNull(siteNotifications.expireAt),
            gte(siteNotifications.expireAt, now),
          ),
        ),
      );

    return json({ unreadCount: Number(result[0]?.count ?? 0) });
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
