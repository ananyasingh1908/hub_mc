import { devlog } from "@/lib/dev-log";

type RconClient = {
  send: (command: string) => Promise<string>;
  end: () => Promise<void>;
};

let rconInstance: RconClient | null = null;

export function getRconConnection(): RconClient | null {
  const host = process.env.MINECRAFT_RCON_HOST;
  const port = process.env.MINECRAFT_RCON_PORT;
  const password = process.env.MINECRAFT_RCON_PASSWORD;

  if (!host || !port || !password) {
    return null;
  }

  if (rconInstance) return rconInstance;

  try {
    const { Rcon } = require("rcon");
    const conn = new Rcon(host, parseInt(port), password);
    conn.connect();
    rconInstance = {
      send: async (cmd: string) => {
        return new Promise((resolve, reject) => {
          conn.send(cmd, (result: string) => resolve(result), (err: Error) => reject(err));
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
  const rcon = getRconConnection();
  if (!rcon) {
    devlog(`[RCON] No connection — would run: ${command}`);
    return null;
  }
  return rcon.send(command);
}
