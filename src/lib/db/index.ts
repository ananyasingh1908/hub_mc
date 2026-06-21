import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "@/lib/db/schema";

/**
 * Cloudflare Pages/Workers env shape for this project.
 * Hyperdrive provides the MySQL connection string through this binding.
 */
export interface CloudflareEnv {
  HYPERDRIVE?: { connectionString: string };
  UPLOADS_BUCKET?: {
    put(key: string, data: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
    delete(key: string): Promise<void>;
  };
  BASE_URL?: string;
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SUPER_ADMIN_ID?: string;
  SUPER_ADMIN_PASSWORD?: string;
  NODE_ENV?: string;
  [key: string]: unknown;
}

// ─── Lazy DB initialization ─────────────────────────────────
// On Cloudflare, `process.env.DATABASE_URL` is NOT available.
// The DB connection string comes from `env.HYPERDRIVE.connectionString`
// at request time (passed through the fetch handler).
//
// For local dev, we fall back to `process.env.DATABASE_URL`.

let _db: MySql2Database<typeof schema> | null = null;
let _connectionString: string | null = null;

/**
 * Wire the Hyperdrive connection string from Cloudflare's env binding.
 * Must be called once per request lifecycle (from the fetch handler).
 * Safe to call multiple times — only the first call takes effect.
 */
export function initDb(env: CloudflareEnv): void {
  if (_connectionString) return;
  _connectionString = env.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL ?? "";
  if (!_connectionString) {
    console.warn(
      "[DB] No connection string available. Set HYPERDRIVE binding (Cloudflare) or DATABASE_URL (local).",
    );
  }
}

/**
 * Returns the Drizzle `db` instance. Lazily created on first access.
 * The `db` export is a stable reference — all 14+ import sites can keep
 * `import { db } from "@/lib/db"` unchanged.
 */
function createDb(): MySql2Database<typeof schema> {
  if (!_connectionString) {
    initDb({});
  }
  if (!_connectionString) {
    throw new Error(
      "[DB] No connection string. Set HYPERDRIVE binding (Cloudflare) or DATABASE_URL (local).",
    );
  }
  const pool = mysql.createPool(_connectionString);
  _db = drizzle(pool, { schema, mode: "default" });
  return _db;
}

export const db: MySql2Database<typeof schema> = new Proxy({} as MySql2Database<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = _db ?? createDb();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
