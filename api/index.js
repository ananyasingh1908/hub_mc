import server from "../dist/server/server.js";

async function readBody(req) {
  return await new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      if (chunks.length === 0) return resolve(undefined);
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  try {
    const host = req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const fullUrl = new URL(req.url || "/", `${proto}://${host}`);

    const method = req.method || "GET";
    const body =
      method !== "GET" && method !== "HEAD"
        ? await readBody(req)
        : undefined;

    const request = new Request(fullUrl.toString(), {
      method,
      headers: new Headers(req.headers),
      body,
      duplex: body ? "half" : undefined,
    });

    const env = {};
    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    const response = await server.fetch(request, env, ctx);

    res.statusCode = response.status;

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "content-length") return;
      res.setHeader(key, value);
    });

    if (!response.body) {
      res.end();
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Vercel adapter error:", error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(
      error instanceof Error
        ? `Internal Server Error\n\n${error.stack || error.message}`
        : "Internal Server Error"
    );
  }
}