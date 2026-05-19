import { dedupedFetch, getCached, isRateLimited, setRateLimited } from "@/lib/api-cache";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const DS_SERVER_ID = process.env.DISCORD_SERVER_ID?.trim() || "";
const DS_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim() || "";
const DS_INVITE = process.env.DISCORD_INVITE?.trim() || "";

function isConfigured(): boolean {
  return Boolean(DS_SERVER_ID);
}

function serveCached<T>(key: string): T | null {
  const entry = getCached<T>(key);
  return entry?.data ?? null;
}

type DiscordWidget = {
  id: string;
  name: string;
  presence_count: number;
  members: Array<{
    id: string; username: string; discriminator: string;
    avatar_url: string | null; status: string;
  }>;
};

export async function handleDiscordStatus(): Promise<Response> {
  if (!isConfigured()) {
    return json({ connected: false, invite: DS_INVITE || null });
  }

  if (isRateLimited("Discord:status")) {
    const cached = serveCached<DiscordWidget>("Discord:status");
    if (cached) {
      return json({
        connected: true, serverId: DS_SERVER_ID, invite: DS_INVITE || null,
        serverName: cached.name ?? null, onlineCount: cached.presence_count ?? 0,
        members: (cached.members ?? []).slice(0, 20).map((m) => ({
          id: m.id, username: m.username, discriminator: m.discriminator,
          avatar: m.avatar_url ?? null, status: m.status ?? "offline",
        })),
      });
    }
    return json({ connected: true, serverId: DS_SERVER_ID, invite: DS_INVITE || null });
  }

  try {
    const widgetUrl = `https://discord.com/api/v10/guilds/${DS_SERVER_ID}/widget.json`;
    const widget = await dedupedFetch<DiscordWidget | null>("Discord", "Discord:status", async () => {
      const res = await fetch(widgetUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { "Accept": "application/json" },
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({ retry_after: 5 }));
        setRateLimited("Discord:status", body.retry_after ?? 5);
        throw new Error("Discord rate limited");
      }

      if (res.status === 403 || res.status === 404) {
        return null;
      }

      if (!res.ok) {
        throw new Error(`Discord API error ${res.status}`);
      }

      return (await res.json()) as DiscordWidget;
    }, 60_000);

    if (!widget) {
      return json({
        connected: true, serverId: DS_SERVER_ID, invite: DS_INVITE || null,
        serverName: null, onlineCount: 0, members: [],
      });
    }

    return json({
      connected: true, serverId: DS_SERVER_ID, invite: DS_INVITE || null,
      serverName: widget.name ?? null, onlineCount: widget.presence_count ?? 0,
      members: (widget.members ?? []).slice(0, 20).map((m) => ({
        id: m.id, username: m.username, discriminator: m.discriminator,
        avatar: m.avatar_url ?? null, status: m.status ?? "offline",
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("rate limited")) {
      return json({ connected: true, serverId: DS_SERVER_ID, invite: DS_INVITE || null });
    }
    return json({ connected: false, invite: DS_INVITE || null });
  }
}

export async function handleDiscordEvents(): Promise<Response> {
  if (!isConfigured()) {
    return json({ connected: false, events: [] });
  }

  if (!DS_BOT_TOKEN) {
    return json({ connected: true, events: [] });
  }

  if (isRateLimited("Discord:events")) {
    const cached = serveCached<any[]>("Discord:events");
    if (cached) return json({ connected: true, events: cached });
    return json({ connected: true, events: [] });
  }

  try {
    const url = `https://discord.com/api/v10/guilds/${DS_SERVER_ID}/scheduled-events`;
    const events = await dedupedFetch<any[]>("Discord", "Discord:events", async () => {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          "Accept": "application/json",
          "Authorization": `Bot ${DS_BOT_TOKEN}`,
        },
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({ retry_after: 5 }));
        setRateLimited("Discord:events", body.retry_after ?? 5);
        throw new Error("Discord rate limited");
      }

      if (!res.ok) {
        throw new Error(`Discord API error ${res.status}`);
      }

      return (await res.json()) as any[];
    }, 120_000);

    const mapped = (Array.isArray(events) ? events : []).map((e: any) => ({
      id: e.id,
      name: e.name,
      description: e.description ?? "",
      scheduledStart: e.scheduled_start_time,
      scheduledEnd: e.scheduled_end_time ?? null,
      memberCount: e.user_count ?? 0,
      status: e.status,
      entityType: e.entity_type,
      image: e.image ? `https://cdn.discordapp.com/guild-events/${e.id}/${e.image}.png` : null,
    }));

    return json({ connected: true, events: mapped });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("rate limited")) {
      return json({ connected: true, events: [] });
    }
    return json({ connected: false, events: [] });
  }
}
