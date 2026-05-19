import { devlog } from "@/lib/dev-log";
import { dedupedFetch } from "@/lib/api-cache";
import { getPrismaClient } from "@/lib/db/prisma";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const YT_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID?.trim() || "";
const YT_API_KEY = process.env.YOUTUBE_API_KEY?.trim() || "";

function isConfigured(): boolean {
  return Boolean(YT_CHANNEL_ID && YT_API_KEY);
}

async function ytFetch<T>(label: string, url: string): Promise<T> {
  devlog(`[YouTube] Fetching ${label}: ${url.replace(YT_API_KEY, "REDACTED")}`);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`YouTube API error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  devlog(`[YouTube] ${label} response:`, JSON.stringify(data).slice(0, 500));
  return data as T;
}

function isEmptyItems(data: { items?: unknown[] } | null | undefined): boolean {
  return !data || !Array.isArray(data.items) || data.items.length === 0;
}

export async function handleYouTubeStatus(): Promise<Response> {
  if (!isConfigured()) {
    console.warn("[YouTube] Not configured — YOUTUBE_CHANNEL_ID or YOUTUBE_API_KEY missing");
    return json({ connected: false });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`;
    const data = await dedupedFetch<any>("YouTube", "YouTube:status", () =>
      ytFetch<any>("status", url), 60_000, isEmptyItems);

    const channel = data?.items?.[0];
    if (!channel) {
      console.warn("[YouTube] Channel not found for ID:", YT_CHANNEL_ID);
      return json({ connected: false });
    }

    return json({
      connected: true,
      channelId: YT_CHANNEL_ID,
      channelTitle: channel.snippet?.title ?? null,
      channelAvatar: channel.snippet?.thumbnails?.default?.url ?? null,
      subscriberCount: channel.statistics?.subscriberCount ?? "0",
      videoCount: channel.statistics?.videoCount ?? "0",
      viewCount: channel.statistics?.viewCount ?? "0",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[YouTube] Status fetch failed:", msg);
    return json({ connected: false });
  }
}

export async function handleYouTubeVideos(): Promise<Response> {
  if (!isConfigured()) {
    return json({ connected: false, videos: [] });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL_ID}&maxResults=10&order=date&type=video&key=${YT_API_KEY}`;
    const data = await dedupedFetch<any>("YouTube", "YouTube:videos", () =>
      ytFetch<any>("videos", url), 60_000, isEmptyItems);

    const items = data?.items ?? [];
    const videos = items.map((item: any) => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url,
      publishedAt: item.snippet?.publishedAt,
      channelTitle: item.snippet?.channelTitle,
    }));

    return json({ connected: true, videos });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[YouTube] Videos fetch failed:", msg);
    return json({ connected: true, videos: [] });
  }
}

export async function handleYouTubeLivestream(): Promise<Response> {
  if (!isConfigured()) {
    return json({ connected: false, isLive: false, livestream: null });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`;
    const data = await dedupedFetch<any>("YouTube", "YouTube:livestream", () =>
      ytFetch<any>("livestream", url), 60_000, isEmptyItems);

    const liveItem = data?.items?.[0];

    if (!liveItem) {
      return json({ connected: true, isLive: false, livestream: null });
    }

    return json({
      connected: true,
      isLive: true,
      livestream: {
        videoId: liveItem.id?.videoId,
        title: liveItem.snippet?.title,
        thumbnail: liveItem.snippet?.thumbnails?.high?.url ?? liveItem.snippet?.thumbnails?.default?.url,
        channelTitle: liveItem.snippet?.channelTitle,
        liveBroadcastContent: liveItem.snippet?.liveBroadcastContent,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[YouTube] Livestream fetch failed:", msg);
    return json({ connected: true, isLive: false, livestream: null });
  }
}

// ─── COMMUNITY STREAM DISCOVERY ──────────────────────────────

interface CommunityStream {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  liveViewers: number;
  status: "PENDING" | "APPROVED" | "REMOVED" | null;
  featuredId: string | null;
}

async function searchCommunityStreams(): Promise<CommunityStream[]> {
  if (!isConfigured()) return [];

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=HUBMC&type=video&eventType=live&maxResults=25&key=${YT_API_KEY}`;
  const searchData = await dedupedFetch<any>("YouTube", "YouTube:community-search", () =>
    ytFetch<any>("community-search", searchUrl), 60_000, isEmptyItems);

  const items = searchData?.items ?? [];
  if (items.length === 0) return [];

  const videoIds = items.map((i: any) => i.id?.videoId).filter(Boolean);
  if (videoIds.length === 0) return [];

  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoIds.join(",")}&key=${YT_API_KEY}`;
  const detailsData = await dedupedFetch<any>("YouTube", "YouTube:community-details", () =>
    ytFetch<any>("community-details", detailsUrl), 60_000, isEmptyItems);

  const detailsMap = new Map<string, any>();
  for (const v of (detailsData?.items ?? [])) {
    detailsMap.set(v.id, v);
  }

  const prisma = await getPrismaClient();
  const [featured, blacklisted] = await Promise.all([
    prisma.featuredStream.findMany({ select: { videoId: true, status: true, id: true } }),
    prisma.streamBlacklist.findMany({ select: { channelId: true } }),
  ]);

  const featuredByVideo = new Map(featured.map((f) => [f.videoId, f]));
  const blacklistedChannels = new Set(blacklisted.map((b) => b.channelId));

  const streams: CommunityStream[] = [];

  for (const item of items) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;
    if (featuredByVideo.has(videoId) && featuredByVideo.get(videoId)!.status === "REMOVED") continue;

    const channelId = item.snippet?.channelId;
    if (blacklistedChannels.has(channelId)) continue;

    const detail = detailsMap.get(videoId);
    const liveViewers = detail?.liveStreamingDetails?.concurrentViewers
      ? parseInt(detail.liveStreamingDetails.concurrentViewers, 10)
      : 0;

    const existing = featuredByVideo.get(videoId);
    streams.push({
      videoId,
      channelId,
      channelTitle: item.snippet?.channelTitle ?? "",
      title: item.snippet?.title ?? "",
      description: item.snippet?.description ?? "",
      thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? "",
      liveViewers,
      status: existing?.status as "PENDING" | "APPROVED" | "REMOVED" | null ?? null,
      featuredId: existing?.id ?? null,
    });
  }

  return streams;
}

export async function handleYouTubeCommunityStreams(): Promise<Response> {
  try {
    const streams = await searchCommunityStreams();
    return json({ streams });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[YouTube] Community streams fetch failed:", msg);
    return json({ streams: [] });
  }
}

// ─── ADMIN STREAM MODERATION ──────────────────────────────────

import { getEmployeeSession } from "@/lib/auth/employee-session";
import { getAdminSession } from "@/lib/auth/admin-session";

async function getStaffSession(request: Request): Promise<{ employeeId: string | null; email: string | null } | null> {
  let s = await getAdminSession(request);
  if (s) return { employeeId: s.sub, email: s.email };
  s = await getEmployeeSession(request);
  if (s) return { employeeId: s.employeeId, email: s.email };
  return null;
}

function error(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleAdminApproveStream(request: Request): Promise<Response> {
  const staff = await getStaffSession(request);
  if (!staff) return error("Unauthorized", 401);

  let body: { videoId?: string; channelId?: string; channelTitle?: string; title?: string; description?: string; thumbnailUrl?: string; liveViewers?: number };
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  if (!body.videoId) return error("videoId required", 400);

  const prisma = await getPrismaClient();
  const existing = await prisma.featuredStream.findUnique({ where: { videoId: body.videoId } });

  if (existing) {
    await prisma.featuredStream.update({
      where: { id: existing.id },
      data: { status: "APPROVED", moderatedById: staff.employeeId, moderatedAt: new Date() },
    });
  } else {
    await prisma.featuredStream.create({
      data: {
        videoId: body.videoId,
        channelId: body.channelId ?? "",
        channelTitle: body.channelTitle ?? "",
        title: body.title ?? "",
        description: body.description ?? "",
        thumbnailUrl: body.thumbnailUrl ?? null,
        liveViewers: body.liveViewers ?? 0,
        status: "APPROVED",
        moderatedById: staff.employeeId,
        moderatedAt: new Date(),
      },
    });
  }

  return json({ success: true });
}

export async function handleAdminRemoveStream(request: Request): Promise<Response> {
  const staff = await getStaffSession(request);
  if (!staff) return error("Unauthorized", 401);

  let body: { videoId?: string };
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  if (!body.videoId) return error("videoId required", 400);

  const prisma = await getPrismaClient();
  const existing = await prisma.featuredStream.findUnique({ where: { videoId: body.videoId } });

  if (existing) {
    await prisma.featuredStream.update({
      where: { id: existing.id },
      data: { status: "REMOVED", moderatedById: staff.employeeId, moderatedAt: new Date() },
    });
  }

  return json({ success: true });
}

export async function handleAdminBlacklistChannel(request: Request): Promise<Response> {
  const staff = await getStaffSession(request);
  if (!staff) return error("Unauthorized", 401);

  let body: { channelId?: string; channelTitle?: string; reason?: string };
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  if (!body.channelId) return error("channelId required", 400);

  const prisma = await getPrismaClient();
  await prisma.streamBlacklist.upsert({
    where: { channelId: body.channelId },
    update: { reason: body.reason ?? null, channelTitle: body.channelTitle ?? null },
    create: {
      channelId: body.channelId,
      channelTitle: body.channelTitle ?? null,
      reason: body.reason ?? null,
      createdById: staff.employeeId,
    },
  });

  return json({ success: true });
}

export async function handleAdminGetFeaturedStreams(request: Request): Promise<Response> {
  const staff = await getStaffSession(request);
  if (!staff) return error("Unauthorized", 401);

  const prisma = await getPrismaClient();
  const streams = await prisma.featuredStream.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return json({
    streams: streams.map((s) => ({
      id: s.id,
      videoId: s.videoId,
      channelId: s.channelId,
      channelTitle: s.channelTitle,
      title: s.title,
      description: s.description,
      thumbnailUrl: s.thumbnailUrl,
      liveViewers: s.liveViewers,
      status: s.status,
      moderatedAt: s.moderatedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
