import { devlog } from "@/lib/dev-log";
import type { MinecraftIdentity } from "@/lib/auth/types";

const PLAYERDB_API = "https://playerdb.co/api/player/minecraft";

function formatMinecraftUuid(raw: string): string {
  if (raw.length === 32 && !raw.includes("-")) {
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
  }
  return raw;
}

function createMinecraftAvatarUrl(uuid: string): string {
  return `https://mc-heads.net/avatar/${uuid}/160`;
}

interface PlayerDbPlayer {
  username: string;
  id: string;
  raw_id: string;
  avatar: string;
  skin_texture: string;
}

interface PlayerDbSuccess {
  success: true;
  data: { player: PlayerDbPlayer };
}

interface PlayerDbError {
  success: false;
  code: string;
  message: string;
}

type PlayerDbResponse = PlayerDbSuccess | PlayerDbError;

async function lookupPlayerDb(
  username: string,
): Promise<PlayerDbPlayer | { error: string; status: number }> {
  const url = `${PLAYERDB_API}/${encodeURIComponent(username)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    devlog("[PlayerDB] Attempt", attempt, "for:", username);
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json" },
      });

      devlog("[PlayerDB] HTTP", response.status, "for", username);

      if (response.status === 404 || response.status === 400) {
        return { error: "Player not found", status: 404 };
      }

      if (response.status === 429) {
        return { error: "Too many requests. Please try again.", status: 429 };
      }

      if (!response.ok) {
        if (attempt < 2) continue;
        return {
          error: "Player lookup service temporarily unavailable",
          status: 503,
        };
      }

      let data: PlayerDbResponse;
      try {
        data = (await response.json()) as PlayerDbResponse;
      } catch {
        if (attempt < 2) continue;
        return {
          error: "Player lookup service temporarily unavailable",
          status: 503,
        };
      }

      if (!data || typeof data !== "object") {
        if (attempt < 2) continue;
        return {
          error: "Player lookup service temporarily unavailable",
          status: 503,
        };
      }

      if (!data.success || !data.data?.player) {
        devlog("[PlayerDB] Player not found:", username, data);
        return { error: "Player not found", status: 404 };
      }

      devlog(
        "[PlayerDB] Found:",
        data.data.player.name,
        "UUID:",
        data.data.player.raw_id,
      );
      return data.data.player;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      devlog("[PlayerDB] Error:", { username, message: msg });
      if (attempt < 2) continue;
      return {
        error: "Player lookup service temporarily unavailable",
        status: 503,
      };
    }
  }

  return {
    error: "Player lookup service temporarily unavailable",
    status: 503,
  };
}

export async function lookupMinecraftIdentity(
  username: string,
): Promise<MinecraftIdentity | { error: string; status: number }> {
  const result = await lookupPlayerDb(username);
  if ("error" in result) {
    console.warn(
      "[Minecraft] Verification FAILED for:",
      username,
      "-",
      result.error,
    );
    return { error: result.error, status: result.status };
  }

  const uuid = formatMinecraftUuid(result.raw_id);

  return {
    username: result.username,
    uuid,
    avatarUrl: result.avatar || createMinecraftAvatarUrl(uuid),
    skinUrl: result.skin_texture || null,
    verified: true,
  };
}
