import { devlog, devwarn } from "@/lib/dev-log";

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

interface RateLimitState {
  until: number;
  backoff: number;
  endpoint: string;
}

const responseCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const rateLimitMap = new Map<string, RateLimitState>();

const DEFAULT_TTL = 60_000;

export function getCached<T>(key: string): { data: T; age: number } | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.fetchedAt;
  return { data: entry.data as T, age };
}

function setCache(key: string, data: unknown): void {
  responseCache.set(key, { data, fetchedAt: Date.now() });
  clearStaleCache();
}

export async function dedupedFetch<T>(
  prefix: string,
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
  isEmpty?: (data: T) => boolean,
): Promise<T> {
  const cached = getCached<T>(cacheKey);

  if (cached && cached.age < ttl) {
    devlog(`[${prefix}] Using cache`);
    return cached.data;
  }

  const existing = inflight.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      if (isEmpty && isEmpty(data)) {
        if (cached) {
          devwarn(`[${prefix}] Fresh fetch returned empty — keeping cached data`);
          return cached.data;
        }
        devwarn(`[${prefix}] Fresh fetch returned empty, no cache to fall back to`);
      }
      setCache(cacheKey, data);
      return data;
    })
    .catch((err) => {
      if (cached) {
        const msg = err instanceof Error ? err.message : String(err);
        devwarn(`[${prefix}] Fetch failed — serving stale cache (age ${cached.age}ms): ${msg}`);
        return cached.data;
      }
      throw err;
    })
    .finally(() => { inflight.delete(cacheKey); });

  inflight.set(cacheKey, promise);
  return promise;
}

export function isRateLimited(endpoint: string): boolean {
  const state = rateLimitMap.get(endpoint);
  if (!state) return false;
  if (Date.now() >= state.until) {
    rateLimitMap.delete(endpoint);
    return false;
  }
  return true;
}

export function setRateLimited(endpoint: string, retryAfterSec: number): void {
  const existing = rateLimitMap.get(endpoint);
  const prevBackoff = existing?.backoff ?? 0;
  const nextBackoff = prevBackoff === 0 ? 1000 : Math.min(prevBackoff * 2, 10_000);
  const waitMs = Math.max(retryAfterSec * 1000, nextBackoff);
  rateLimitMap.set(endpoint, { until: Date.now() + waitMs, backoff: nextBackoff, endpoint });
  devlog(`[Discord] Waiting due to rate limit for ${waitMs}ms`);
}

export function clearStaleCache(): void {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (now - entry.fetchedAt >= DEFAULT_TTL * 2) responseCache.delete(key);
  }
}

// No global setInterval — Cloudflare Workers forbid I/O/timers at module scope.
// Clear stale entries lazily on each cache write instead.
