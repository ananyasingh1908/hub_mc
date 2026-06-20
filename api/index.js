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

async function serveFile(filePath) {
  try {
    const data = await fs.readFile(filePath);
    return new Response(data, {
      status: 200,
      headers: {
        "content-type": contentType(filePath),
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const url = new URL(req.url, `${proto}://${host}`);
  const pathname = url.pathname;

  // 1) API routes -> TanStack server
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

  // 2) static assets under /assets/*
  if (pathname.startsWith("/assets/")) {
    const assetPath = path.join(clientDir, pathname);
    const fileResponse = await serveFile(assetPath);
    if (fileResponse) {
      res.statusCode = fileResponse.status;
      fileResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const buffer = Buffer.from(await fileResponse.arrayBuffer());
      res.end(buffer);
      return;
    }
  }

  // 3) common static root files
  const rootStatic = path.join(clientDir, pathname === "/" ? "index.html" : pathname.slice(1));
  const maybeStatic = await serveFile(rootStatic);
  if (maybeStatic) {
    res.statusCode = maybeStatic.status;
    maybeStatic.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const buffer = Buffer.from(await maybeStatic.arrayBuffer());
    res.end(buffer);
    return;
  }

  // 4) SPA fallback -> index.html
  const indexPath = path.join(clientDir, "index.html");
  const indexHtml = await fs.readFile(indexPath);
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(indexHtml);
}