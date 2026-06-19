type CacheEntry = {
  data: unknown;
  status: number;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.expiresAt) store.delete(key);
  }
}

export function cachedJson(
  request: Request,
  ttlSeconds: number,
  fetchFn: () => Promise<Response>,
): Promise<Response> {
  const key = new URL(request.url).pathname;
  const now = Date.now();

  // Lazy cleanup on each request (no setInterval in Workers)
  cleanupExpired();

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
