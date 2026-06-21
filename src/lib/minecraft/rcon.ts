import { devlog } from "@/lib/dev-log";

type RconClient = {
  send: (command: string) => Promise<string>;
  end: () => Promise<void>;
};

let rconInstance: RconClient | null = null;

export async function getRconConnection(): Promise<RconClient | null> {
  const host = process.env.MC_RCON_HOST;
  const port = process.env.MC_RCON_PORT;
  const password = process.env.MC_RCON_PASSWORD;

  if (!host || !port || !password) {
    return null;
  }

  if (rconInstance) return rconInstance;

  try {
    // Dynamic import for ESM/Workers compatibility (rcon is a CJS package using TCP sockets).
    // On Cloudflare Workers this will likely fail (no raw TCP), so getRconConnection returns null.
    const mod = await import("rcon");
    const Rcon = mod.default ?? mod;
    const conn = new Rcon(host, parseInt(port), password);

    let authed = false;
    let authResolve: (() => void) | null = null;
    const authPromise = new Promise<void>((resolve) => { authResolve = resolve; });

    conn.on("auth", () => {
      authed = true;
      if (authResolve) authResolve();
    });

    conn.connect();

    rconInstance = {
      send: async (cmd: string) => {
        if (!authed) {
          await authPromise;
        }
        return new Promise((resolve, reject) => {
          const onResponse = (response: string) => {
            conn.removeListener("response", onResponse);
            conn.removeListener("error", onError);
            resolve(response);
          };
          const onError = (err: Error) => {
            conn.removeListener("response", onResponse);
            conn.removeListener("error", onError);
            reject(err);
          };
          conn.on("response", onResponse);
          conn.on("error", onError);
          conn.send(cmd);
        });
      },
      end: async () => {
        conn.disconnect();
        rconInstance = null;
      },
    };
    return rconInstance;
  } catch (err) {
    console.warn("[RCON] Failed to initialize RCON connection:", err);
    return null;
  }
}

export async function executeMcCommand(command: string): Promise<string | null> {
  const rcon = await getRconConnection();
  if (!rcon) {
    devlog(`[RCON] No connection — would run: ${command}`);
    return null;
  }
  return rcon.send(command);
}
