import { eq } from "drizzle-orm";
import { devlog } from "@/lib/dev-log";
import { db } from "@/lib/db";
import { featuredStreams, streamBlacklist, youTubeCache } from "@/lib/db/schema";

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

  if (res.status === 403 || res.status === 429) {
  const text = await res.text().catch(() => "");
  if (
    text.includes("quotaExceeded") ||
    text.includes("quota") ||
    text.includes("Search Queries per day")
  ) {
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
    const rows = await db
      .select()
      .from(youTubeCache)
      .where(eq(youTubeCache.cacheKey, key))
      .limit(1);
    const entry = rows[0];
    if (!entry) return null;
    const cachedAt = entry.cachedAt instanceof Date ? entry.cachedAt.getTime() : new Date(entry.cachedAt).getTime();
    return { data: entry.data, cachedAt };
  } catch (err) {
    console.error(`[YouTubeCache] DB load error (${key}):`, err);
    return null;
  }
}

async function saveToDB(key: string, data: unknown): Promise<void> {
  try {
    const now = new Date();
    const existing = await db
      .select({ id: youTubeCache.id })
      .from(youTubeCache)
      .where(eq(youTubeCache.cacheKey, key))
      .limit(1);

    if (existing[0]) {
      await db
        .update(youTubeCache)
        .set({ data: data as any, cachedAt: now, updatedAt: now })
        .where(eq(youTubeCache.id, existing[0].id));
    } else {
      await db.insert(youTubeCache).values({
        id: crypto.randomUUID(),
        cacheKey: key,
        data: data as any,
        cachedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
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
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`;
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
  devlog(`[YouTube] Status refreshed`);
}

async function refreshVideosAndLivestream(): Promise<void> {
  // 1) Get uploads playlist from channel details
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`;
  const channelRaw = await ytFetch<any>("channel-content-details", channelUrl);
  const uploadsPlaylistId = channelRaw?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("Could not resolve YouTube uploads playlist ID");
  }

  // 2) Fetch latest uploaded videos using playlistItems (cheaper than search.list)
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=10&key=${YT_API_KEY}`;
  const playlistRaw = await ytFetch<any>("videos", playlistUrl);
  const items = playlistRaw?.items ?? [];

  const videos: VideoData[] = items
    .map((item: any) => {
      const snippet = item?.snippet;
      const videoId = item?.contentDetails?.videoId ?? snippet?.resourceId?.videoId ?? null;
      if (!videoId || !snippet) return null;

      return {
        videoId,
        title: snippet.title ?? "",
        description: snippet.description ?? "",
        thumbnail:
          snippet.thumbnails?.high?.url ??
          snippet.thumbnails?.medium?.url ??
          snippet.thumbnails?.default?.url ??
          "",
        publishedAt: snippet.publishedAt ?? "",
        channelTitle: snippet.channelTitle ?? "",
      } satisfies VideoData;
    })
    .filter(Boolean) as VideoData[];

  const now = Date.now();

  const vResult: VideosData = {
    connected: true,
    videos,
  };

  inMemoryCache.set("videos", { data: vResult, cachedAt: now });
  await saveToDB("videos", vResult);

  // 3) Livestream check separately (still search-based, but only one lightweight call)
  try {
  // Dev me ya quota-exceeded state me live lookup skip karo
  if (process.env.NODE_ENV !== "production" || _quotaExceeded) {
    const existingLive = await getCachedData<LivestreamData>("livestream");

    if (!existingLive) {
      const fallback: LivestreamData = {
        connected: true,
        isLive: false,
        livestream: null,
      };
      inMemoryCache.set("livestream", { data: fallback, cachedAt: now });
      await saveToDB("livestream", fallback);
    }

    devlog("[YouTube] Skipping livestream lookup in development or during quota cooldown");
  } else {
    const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL_ID}&eventType=live&type=video&maxResults=1&key=${YT_API_KEY}`;
    const liveRaw = await ytFetch<any>("livestream", liveUrl);
    const liveFound = liveRaw?.items?.[0];

    const lResult: LivestreamData = liveFound
      ? {
          connected: true,
          isLive: true,
          livestream: {
            videoId: liveFound.id?.videoId,
            title: liveFound.snippet?.title ?? "",
            thumbnail:
              liveFound.snippet?.thumbnails?.high?.url ??
              liveFound.snippet?.thumbnails?.medium?.url ??
              liveFound.snippet?.thumbnails?.default?.url ??
              "",
            channelTitle: liveFound.snippet?.channelTitle ?? "",
            liveBroadcastContent: liveFound.snippet?.liveBroadcastContent ?? "live",
          },
        }
      : {
          connected: true,
          isLive: false,
          livestream: null,
        };

    inMemoryCache.set("livestream", { data: lResult, cachedAt: now });
    await saveToDB("livestream", lResult);
  }
} catch (error) {
  const existingLive = await getCachedData<LivestreamData>("livestream");

  if (!existingLive) {
    const fallback: LivestreamData = {
      connected: true,
      isLive: false,
      livestream: null,
    };
    inMemoryCache.set("livestream", { data: fallback, cachedAt: now });
    await saveToDB("livestream", fallback);
  }

  console.warn("[YouTube] Livestream refresh failed, using cached/fallback livestream:", error);
}

  devlog(`[YouTube] Videos & livestream refreshed`);
}
async function refreshCommunityStreams(): Promise<void> {
  // Community search is quota-expensive.
  // Skip it entirely in development to avoid burning quota on every restart.
  if (process.env.NODE_ENV !== "production") {
    devlog("[YouTube] Skipping community streams refresh in development");
    return;
  }

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=HUBMC&type=video&eventType=live&maxResults=25&key=${YT_API_KEY}`;

  try {
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

        const [featured, blacklisted] = await Promise.all([
          db
            .select({ videoId: featuredStreams.videoId, status: featuredStreams.status, id: featuredStreams.id })
            .from(featuredStreams),
          db
            .select({ channelId: streamBlacklist.channelId })
            .from(streamBlacklist),
        ]);

        const featuredByVideo = new Map(featured.map((f) => [f.videoId, f]));
        const blacklistedChannels = new Set(blacklisted.map((b) => b.channelId));

        for (const item of items) {
          const videoId = item.id?.videoId;
          if (!videoId) continue;

          const existing = featuredByVideo.get(videoId);
          if (existing?.status === "REMOVED") continue;

          const channelId = item.snippet?.channelId;
          if (!channelId || blacklistedChannels.has(channelId)) continue;

          const detail = detailsMap.get(videoId);
          const liveViewers = detail?.liveStreamingDetails?.concurrentViewers
            ? parseInt(detail.liveStreamingDetails.concurrentViewers, 10)
            : 0;

          streams.push({
            videoId,
            channelId,
            channelTitle: item.snippet?.channelTitle ?? "",
            title: item.snippet?.title ?? "",
            description: item.snippet?.description ?? "",
            thumbnailUrl:
              item.snippet?.thumbnails?.high?.url ??
              item.snippet?.thumbnails?.medium?.url ??
              item.snippet?.thumbnails?.default?.url ??
              "",
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
    devlog(`[YouTube] Community streams refreshed (${streams.length} found)`);
  } catch (error) {
    console.warn("[YouTube] Community streams refresh failed, keeping cached data:", error);
  }
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
    devlog(`[YouTube] Quota recovered at ${new Date().toISOString()}`);
    return true;
  } catch {
    return false;
  }
}

// ─── Refresh Orchestrator ───────────────────────────────────

async function doFullRefresh(): Promise<void> {
  if (_refreshInFlight) return;
  _refreshInFlight = true;

  try {
    if (_quotaExceeded) {
      const cooldownMs = 30 * 60 * 1000;
      if (Date.now() - _quotaExceededAt < cooldownMs) {
        devlog(`[YouTube] In quota cooldown, skipping refresh`);
        return;
      }
      const recovered = await tryRecoverQuota();
      if (!recovered) {
        devlog(`[YouTube] Quota still exceeded, skipping refresh`);
        return;
      }
    }

    try {
  await refreshStatus();
} catch (err) {
  console.error("[YouTube] Status refresh failed:", err instanceof Error ? err.message : err);
}

try {
  await refreshVideosAndLivestream();
} catch (err) {
  console.error("[YouTube] Videos/livestream refresh failed:", err instanceof Error ? err.message : err);
}

if (!_quotaExceeded) {
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

  // In development, do not auto-refresh on startup.
  // Data can still refresh lazily via scheduleRefresh / route usage if needed.
  if (process.env.NODE_ENV !== "production") {
    devlog("[YouTube] Skipping startup cache refresh in development");
    return;
  }

  // Load quota state from DB to sync across isolates
  const meta = await loadMetaFromDB();
  if (meta?.quotaExceeded && meta.quotaExceededAt) {
    _quotaExceeded = true;
    _quotaExceededAt = meta.quotaExceededAt;
    devlog(`[YouTube] Loaded quota-exceeded state from DB (at ${new Date(meta.quotaExceededAt).toISOString()})`);
  }

  const refreshPromise = doFullRefresh();
  if (ctx?.waitUntil) {
    try {
      ctx.waitUntil(refreshPromise);
    } catch {
      // ignore
    }
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
