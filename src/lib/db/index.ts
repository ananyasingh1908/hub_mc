import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@/lib/db/schema";

export interface CloudflareEnv {
  HYPERDRIVE?: {
    connectionString?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
  UPLOADS_BUCKET?: {
    put(
      key: string,
      data: ArrayBuffer,
      opts?: { httpMetadata?: { contentType?: string } }
    ): Promise<unknown>;
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

// Store env reference for use by getDbInstance().
// This is safe because env is a plain object (not an I/O object).
let _env: CloudflareEnv | null = null;

export function initDb(env: CloudflareEnv): void {
  if (!env) {
    throw new Error("[DB] Cannot initialize DB: env is undefined.");
  }
  // Just store the env reference. Pool creation is deferred to each request.
  _env = env;
}

function createPool(): mysql.Pool {
  if (!_env) {
    // Try globalThis fallback (set by Nitro entry before routing)
    const globalEnv = (globalThis as Record<string, unknown>).__env__ as
      | CloudflareEnv
      | undefined;
    if (globalEnv) {
      _env = globalEnv;
    }
  }

  if (!_env) {
    throw new Error("[DB] No env available. Cannot create pool.");
  }

  const hd = _env.HYPERDRIVE;
  if (!hd) {
    throw new Error("[DB] Hyperdrive binding missing.");
  }

  // Use individual properties when available (required for Workers + Hyperdrive)
  if (hd.host && hd.port && hd.user && hd.password && hd.database) {
    return mysql.createPool({
      host: hd.host,
      port: hd.port,
      user: hd.user,
      password: hd.password,
      database: hd.database,
      connectionLimit: 2,
      enableKeepAlive: true,
      waitForConnections: true,
      queueLimit: 0,
      disableEval: true,
    });
  }

  // Fallback to connection string
  const cs = hd.connectionString;
  if (!cs || typeof cs !== "string") {
    throw new Error("[DB] Hyperdrive connection string missing.");
  }

  return mysql.createPool({
    uri: cs,
    connectionLimit: 2,
    enableKeepAlive: true,
    waitForConnections: true,
    queueLimit: 0,
    disableEval: true,
  });
}

// Each call creates a fresh pool. In Cloudflare Workers, pools (and their
// TCP sockets) are request-scoped — they cannot be shared across requests.
function getDbInstance(): MySql2Database<typeof schema> {
  const pool = createPool();
  return drizzle(pool, { schema, mode: "default" });
}

export const db: MySql2Database<typeof schema> = new Proxy(
  {} as MySql2Database<typeof schema>,
  {
    get(_target, prop, receiver) {
      const instance = getDbInstance();
      const value = Reflect.get(instance, prop, receiver);

      if (typeof value === "function") {
        return value.bind(instance);
      }

      return value;
    },
  }
);

export async function testDbConnection() {
  const pool = createPool();
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    return rows;
  } finally {
    await pool.end().catch(() => {});
  }
}
