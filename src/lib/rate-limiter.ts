import { devwarn } from "@/lib/dev-log";

type WindowEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, WindowEntry>();

const WINDOW_MS = 60_000;

function extractIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1"
  );
}

export type RateLimitConfig = {
  limit: number;
  windowMs?: number;
  label: string;
};

const DEFAULT_WINDOW_MS = WINDOW_MS;

export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(Math.ceil(retryAfterSec)),
    },
  });
}

export function checkRateLimit(request: Request, config: RateLimitConfig): Response | null {
  const ip = extractIp(request);
  const key = `${config.label}:${ip}`;
  const now = Date.now();
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;

  let entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    buckets.set(key, entry);
    return null;
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    devwarn(`[RateLimit] ${config.label} exceeded by ${ip} — ${entry.count}/${config.limit} (retry ${retryAfterSec}s)`);
    return rateLimitResponse(retryAfterSec);
  }

  return null;
}

export function clearExpiredBuckets(): void {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
}

// Periodic cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(clearExpiredBuckets, 300_000);
}
