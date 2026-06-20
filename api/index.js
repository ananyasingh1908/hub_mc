import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import serverHandler from "../dist/server/server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const clientDir = path.join(projectRoot, "dist", "client");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function contentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function serveStaticFile(filePath, res) {
  try {
    const data = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader("content-type", contentType(filePath));

    // long cache only for assets
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
    }

    res.end(data);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const url = new URL(req.url, `${proto}://${host}`);
    const pathname = decodeURIComponent(url.pathname);

    // 1) Serve built assets directly from dist/client/assets
    if (pathname.startsWith("/assets/")) {
      const assetFile = path.join(clientDir, pathname.slice(1)); // assets/...
      const served = await serveStaticFile(assetFile, res);
      if (served) return;
    }

    // 2) Serve common root static files from dist/client
    const rootStaticCandidates = [
      "favicon.ico",
      "favicon.png",
      "robots.txt",
      "manifest.webmanifest",
      "manifest.json"
    ];

    if (rootStaticCandidates.includes(pathname.slice(1))) {
      const filePath = path.join(clientDir, pathname.slice(1));
      const served = await serveStaticFile(filePath, res);
      if (served) return;
    }

    // 3) API routes -> TanStack server handler
    if (pathname.startsWith("/api")) {
      const request = new Request(url.toString(), {
        method: req.method,
        headers: req.headers,
        body:
          req.method !== "GET" && req.method !== "HEAD"
            ? req
            : undefined,
        duplex: "half"
      });

      const response = await serverHandler.fetch(request);

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      res.end(buffer);
      return;
    }

    // 4) First try exact static file from dist/client
    const cleanPath = pathname === "/" ? "index.html" : pathname.slice(1);
    const directStaticFile = path.join(clientDir, cleanPath);
    const servedDirect = await serveStaticFile(directStaticFile, res);
    if (servedDirect) return;

    // 5) Everything else -> TanStack server render
    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? req
          : undefined,
      duplex: "half"
    });

    const response = await serverHandler.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    console.error("Vercel handler error:", error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}