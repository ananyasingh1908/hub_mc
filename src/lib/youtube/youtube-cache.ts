import { devlog } from "@/lib/dev-log";
import { getPrismaClient } from "@/lib/db/prisma";

// ─── Cache Types (processed data ready to serve) ──────────────

export interface StatusData {
  connected: boolean;
  channelId: string | null;
  channelTitle: string | null;
  channelAvatar: string | null;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}

export interface VideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
}

export interface VideosData {
  connected: boolean;
  videos: VideoData[];
}

export interface LivestreamData {
  connected: boolean;
  isLive: boolean;
  livestream: {
    videoId: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
    liveBroadcastContent: string;
  } | null;
}

export interface CommunityStream {
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

export interface CommunityStreamsData {
  streams: CommunityStream[];
}

// ─── L1 In-Memory Cache ─────────────────────────────────────

const inMemoryCache = new Map<string, { data: unknown; cachedAt: number }>();

// ─── Quota State (per-isolate) ───────────────────────────────

let _quotaExceeded = false;
let _quotaExceededAt = 0;

// ─── Refresh Dedup (prevents concurrent YT API calls) ───────

let _refreshInFlight = false;

// ─── YouTube Config ─────────────────────────────────────────

const YT_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID?.trim() || "";
const YT_API_KEY = process.env.YOUTUBE_API_KEY?.trim() || "";

function isConfigured(): boolean {
  return Boolean(YT_CHANNEL_ID && YT_API_KEY);
}

// ─── YouTube API Fetch ──────────────────────────────────────

async function ytFetch<T>(label: string, url: string): Promise<T> {
  devlog(`[YouTube] Fetching ${label}: ${url.replace(YT_API_KEY, "REDACTED")}`);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
  });

  if (res.status === 403) {
    const text = await res.text().catch(() => "");
    if (text.includes("quotaExceeded") || text.includes("quota")) {
      _quotaExceeded = true;
      _quotaExceededAt = Date.now();
      console.error(`[YouTube] QUOTA EXCEEDED at ${new Date().toISOString()}`);
      await saveMetaToDB({ quotaExceeded: true, quotaExceededAt: Date.now() });
      throw new Error("YouTube quota exceeded");
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`YouTube API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as T;
  devlog(`[YouTube] ${label} response:`, JSON.stringify(data).slice(0, 500));
  return data;
}

// ─── DB Cache Operations ────────────────────────────────────

async function loadFromDB(key: string): Promise<{ data: unknown; cachedAt: number } | null> {
  try {
    const prisma = await getPrismaClient();
    const entry = await prisma.youTubeCache.findUnique({ where: { cacheKey: key } });
    if (!entry) return null;
    return { data: entry.data, cachedAt: entry.cachedAt.getTime() };
  } catch (err) {
    console.error(`[YouTubeCache] DB load error (${key}):`, err);
    return null;
  }
}

async function saveToDB(key: string, data: unknown): Promise<void> {
  try {
    const prisma = await getPrismaClient();
    await prisma.youTubeCache.upsert({
      where: { cacheKey: key },
      update: { data: data as any, cachedAt: new Date() },
      create: { cacheKey: key, data: data as any, cachedAt: new Date() },
    });
  } catch (err) {
    console.error(`[YouTubeCache] DB save error (${key}):`, err);
  }
}

// ─── Meta (Quota Tracking) in DB ─────────────────────────────

const META_KEY = "__meta__";

interface MetaData {
  quotaExceeded: boolean;
  quotaExceededAt: number | null;
}

async function loadMetaFromDB(): Promise<MetaData | null> {
  const entry = await loadFromDB(META_KEY);
  return entry ? (entry.data as MetaData) : null;
}

async function saveMetaToDB(meta: MetaData): Promise<void> {
  await saveToDB(META_KEY, meta);
}

// ─── Public Cache Read ──────────────────────────────────────

export async function getCachedData<T>(key: string): Promise<{ data: T; cachedAt: number } | null> {
  const mem = inMemoryCache.get(key);
  if (mem) return mem as { data: T; cachedAt: number };

  const db = await loadFromDB(key);
  if (db) {
    inMemoryCache.set(key, db);
    return db as { data: T; cachedAt: number };
  }

  return null;
}

// ─── Refresh Functions (call YouTube API, process, cache) ───

async function refreshStatus(): Promise<void> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`;
  const raw = await ytFetch<any>("status", url);
  const channel = raw?.items?.[0];

  const result: StatusData = channel
    ? {
        connected: true,
        channelId: YT_CHANNEL_ID,
        channelTitle: channel.snippet?.title ?? null,
        channelAvatar: channel.snippet?.thumbnails?.default?.url ?? null,
        subscriberCount: channel.statistics?.subscriberCount ?? "0",
        videoCount: channel.statistics?.videoCount ?? "0",
        viewCount: channel.statistics?.viewCount ?? "0",
      }
    : {
        connected: false,
        channelId: null,
        channelTitle: null,
        channelAvatar: null,
        subscriberCount: "0",
        videoCount: "0",
        viewCount: "0",
      };

  const now = Date.now();
  inMemoryCache.set("status", { data: result, cachedAt: now });
  await saveToDB("status", result);
  console.log(`[YouTube] Status refreshed`);
}

async function refreshVideosAndLivestream(): Promise<void> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL_ID}&maxResults=10&order=date&type=video&key=${YT_API_KEY}`;
  const raw = await ytFetch<any>("videos", url);
  const items = raw?.items ?? [];

  const videos: VideoData[] = items.map((item: any) => ({
    videoId: item.id?.videoId,
    title: item.snippet?.title,
    description: item.snippet?.description,
    thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url,
    publishedAt: item.snippet?.publishedAt,
    channelTitle: item.snippet?.channelTitle,
  }));

  const liveItem = items.find((item: any) => item.snippet?.liveBroadcastContent === "live");
  const now = Date.now();

  const vResult: VideosData = { connected: true, videos };
  inMemoryCache.set("videos", { data: vResult, cachedAt: now });
  await saveToDB("videos", vResult);

  if (liveItem) {
    const lResult: LivestreamData = {
      connected: true,
      isLive: true,
      livestream: {
        videoId: liveItem.id?.videoId,
        title: liveItem.snippet?.title,
        thumbnail: liveItem.snippet?.thumbnails?.high?.url ?? liveItem.snippet?.thumbnails?.default?.url,
        channelTitle: liveItem.snippet?.channelTitle,
        liveBroadcastContent: liveItem.snippet?.liveBroadcastContent,
      },
    };
    inMemoryCache.set("livestream", { data: lResult, cachedAt: now });
    await saveToDB("livestream", lResult);
  } else {
    // No live found in the top 10 — check separately via eventType=live search
    try {
      const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`;
      const liveRaw = await ytFetch<any>("livestream", liveUrl);
      const liveFound = liveRaw?.items?.[0];
      const lResult: LivestreamData = liveFound
        ? {
            connected: true,
            isLive: true,
            livestream: {
              videoId: liveFound.id?.videoId,
              title: liveFound.snippet?.title,
              thumbnail: liveFound.snippet?.thumbnails?.high?.url ?? liveFound.snippet?.thumbnails?.default?.url,
              channelTitle: liveFound.snippet?.channelTitle,
              liveBroadcastContent: liveFound.snippet?.liveBroadcastContent,
            },
          }
        : { connected: true, isLive: false, livestream: null };
      inMemoryCache.set("livestream", { data: lResult, cachedAt: now });
      await saveToDB("livestream", lResult);
    } catch {
      // Failed to fetch live search — set not-live rather than crash
      const lResult: LivestreamData = { connected: true, isLive: false, livestream: null };
      inMemoryCache.set("livestream", { data: lResult, cachedAt: now });
      await saveToDB("livestream", lResult);
    }
  }

  console.log(`[YouTube] Videos & livestream refreshed`);
}

async function refreshCommunityStreams(): Promise<void> {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=HUBMC&type=video&eventType=live&maxResults=25&key=${YT_API_KEY}`;
  const searchRaw = await ytFetch<any>("community-search", searchUrl);
  const items = searchRaw?.items ?? [];

  const streams: CommunityStream[] = [];

  if (items.length > 0) {
    const videoIds = items.map((i: any) => i.id?.videoId).filter(Boolean);

    if (videoIds.length > 0) {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoIds.join(",")}&key=${YT_API_KEY}`;
      const detailsRaw = await ytFetch<any>("community-details", detailsUrl);
      const detailsMap = new Map<string, any>();
      for (const v of detailsRaw?.items ?? []) {
        detailsMap.set(v.id, v);
      }

      const prisma = await getPrismaClient();
      const [featured, blacklisted] = await Promise.all([
        prisma.featuredStream.findMany({ select: { videoId: true, status: true, id: true } }),
        prisma.streamBlacklist.findMany({ select: { channelId: true } }),
      ]);

      const featuredByVideo = new Map(featured.map((f) => [f.videoId, f]));
      const blacklistedChannels = new Set(blacklisted.map((b) => b.channelId));

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
          status: (existing?.status as "PENDING" | "APPROVED" | "REMOVED" | null) ?? null,
          featuredId: existing?.id ?? null,
        });
      }
    }
  }

  const result: CommunityStreamsData = { streams };
  const now = Date.now();
  inMemoryCache.set("community-streams", { data: result, cachedAt: now });
  await saveToDB("community-streams", result);
  console.log(`[YouTube] Community streams refreshed (${streams.length} found)`);
}

async function tryRecoverQuota(): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`;
    await ytFetch<any>("quota-check", url);
    _quotaExceeded = false;
    _quotaExceededAt = 0;
    const meta = await loadMetaFromDB();
    if (meta) {
      await saveMetaToDB({ quotaExceeded: false, quotaExceededAt: null });
    }
    console.log(`[YouTube] Quota recovered at ${new Date().toISOString()}`);
    return true;
  } catch {
    return false;
  }
}

// ─── Refresh Orchestrator ───────────────────────────────────

let refreshCycle = 0;

async function doFullRefresh(): Promise<void> {
  if (_refreshInFlight) return;
  _refreshInFlight = true;

  try {
    if (_quotaExceeded) {
      const cooldownMs = 30 * 60 * 1000;
      if (Date.now() - _quotaExceededAt < cooldownMs) {
        console.log(`[YouTube] In quota cooldown, skipping refresh`);
        return;
      }
      const recovered = await tryRecoverQuota();
      if (!recovered) {
        console.log(`[YouTube] Quota still exceeded, skipping refresh`);
        return;
      }
    }

    refreshCycle++;

    try {
      await refreshStatus();
    } catch (err) {
      console.error("[YouTube] Status refresh failed:", err instanceof Error ? err.message : err);
    }

    if (refreshCycle % 2 === 1) {
      try {
        await refreshVideosAndLivestream();
      } catch (err) {
        console.error("[YouTube] Videos/livestream refresh failed:", err instanceof Error ? err.message : err);
      }
    } else {
      try {
        await refreshCommunityStreams();
      } catch (err) {
        console.error("[YouTube] Community streams refresh failed:", err instanceof Error ? err.message : err);
      }
    }
  } finally {
    _refreshInFlight = false;
  }
}

// ─── Public API ─────────────────────────────────────────────

const MIN_INTERVAL = 10 * 60 * 1000;
const MAX_INTERVAL = 15 * 60 * 1000;

function getNextInterval(): number {
  return MIN_INTERVAL + Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1));
}

export async function getStatusData(): Promise<StatusData | null> {
  const cached = await getCachedData<StatusData>("status");
  return cached?.data ?? null;
}

export async function getVideosData(): Promise<VideosData | null> {
  const cached = await getCachedData<VideosData>("videos");
  return cached?.data ?? null;
}

export async function getLivestreamData(): Promise<LivestreamData | null> {
  const cached = await getCachedData<LivestreamData>("livestream");
  return cached?.data ?? null;
}

export async function getCommunityStreamsData(): Promise<CommunityStreamsData | null> {
  const cached = await getCachedData<CommunityStreamsData>("community-streams");
  return cached?.data ?? null;
}

export function isQuotaExceeded(): boolean {
  return _quotaExceeded;
}

export async function initializeCache(ctx?: { waitUntil?: (p: Promise<unknown>) => void }): Promise<void> {
  if (!isConfigured()) {
    console.warn("[YouTube] Not configured, skipping cache init");
    return;
  }

  // Load quota state from DB to sync across isolates
  const meta = await loadMetaFromDB();
  if (meta?.quotaExceeded && meta.quotaExceededAt) {
    _quotaExceeded = true;
    _quotaExceededAt = meta.quotaExceededAt;
    console.log(`[YouTube] Loaded quota-exceeded state from DB (at ${new Date(meta.quotaExceededAt).toISOString()})`);
  }

  // Attempt immediate refresh (non-blocking for response)
  const refreshPromise = doFullRefresh();
  if (ctx?.waitUntil) {
    try { ctx.waitUntil(refreshPromise); } catch { /* ctx not available */ }
  } else {
    refreshPromise.catch(() => {});
  }
}

export function scheduleRefresh(ctx: { waitUntil: (p: Promise<unknown>) => void }): void {
  if (_refreshInFlight) return;

  // Check if we have at least some cached data — if not, always refresh
  const hasStatus = inMemoryCache.has("status");
  const hasVideos = inMemoryCache.has("videos");
  const hasLive = inMemoryCache.has("livestream");
  const hasCommunity = inMemoryCache.has("community-streams");

  if (!hasStatus || !hasVideos || !hasLive || !hasCommunity) {
    const refreshPromise = doFullRefresh();
    try { ctx.waitUntil(refreshPromise); } catch { /* ctx not available */ }
    return;
  }

  // Check if data is stale
  const now = Date.now();
  const staleAge = MAX_INTERVAL;

  for (const [key, entry] of inMemoryCache) {
    if (key === "__meta__") continue;
    if (now - entry.cachedAt > staleAge) {
      const refreshPromise = doFullRefresh();
      try { ctx.waitUntil(refreshPromise); } catch { /* ctx not available */ }
      return;
    }
  }
}
