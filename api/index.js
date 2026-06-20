import server from "../dist/server/server.js";

export default async function handler(req) {
  const host = req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host && host.includes("localhost") ? "http" : "https");

  const url = new URL(req.url, `${proto}://${host}`);

  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body:
      req.method !== "GET" && req.method !== "HEAD"
        ? req.body
        : undefined,
    duplex: "half",
  });

  return server.fetch(request);
}