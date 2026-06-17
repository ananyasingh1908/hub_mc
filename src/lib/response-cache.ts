type CacheEntry = {
  data: unknown;
  status: number;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function scheduleCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.expiresAt) store.delete(key);
    }
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export function cachedJson(
  request: Request,
  ttlSeconds: number,
  fetchFn: () => Promise<Response>,
): Promise<Response> {
  const key = new URL(request.url).pathname;
  const now = Date.now();

  const entry = store.get(key);
  if (entry && now < entry.expiresAt) {
    const remaining = Math.max(1, Math.floor((entry.expiresAt - now) / 1000));
    return Promise.resolve(
      new Response(JSON.stringify(entry.data), {
        status: entry.status,
        headers: {
          ...JSON_HEADERS,
          "cache-control": `public, max-age=${remaining}`,
          "x-cache": "HIT",
        },
      }),
    );
  }

  return fetchFn().then((response) => {
    if (response.status >= 200 && response.status < 300) {
      return response.clone().json().then((data) => {
        const expiresAt = now + ttlSeconds * 1000;
        store.set(key, { data, status: response.status, expiresAt });
        scheduleCleanup();
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: {
            ...JSON_HEADERS,
            "cache-control": `public, max-age=${ttlSeconds}`,
            "x-cache": "MISS",
          },
        });
      });
    }
    return response;
  });
}
