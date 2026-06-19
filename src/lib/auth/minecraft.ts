import { devlog } from "@/lib/dev-log";
import type { MinecraftIdentity, MinecraftProfile } from "@/lib/auth/types";

function formatMojangUuid(raw: string): string {
  if (raw.length === 32 && !raw.includes("-")) {
    return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`;
  }
  return raw;
}

function createMinecraftAvatarUrl(uuid: string): string {
  return `https://mc-heads.net/avatar/${uuid}/160`;
}

async function lookupMojangProfile(username: string): Promise<{ id: string; name: string } | { error: string; status: number }> {
  const url = `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    devlog("[Mojang] Attempt", attempt, "for:", username);
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: {
        "Accept": "application/json",
        },
      });

      devlog("[Mojang] HTTP", response.status, response.statusText, "for", username);

      if (response.status === 204 || response.status === 404) {
        devlog("[Mojang] Player not found (", response.status, "):", username);
        return { error: "Player not found", status: 404 };
      }

      if (response.status === 429) {
        devlog("[Mojang] Rate limited (429) for", username);
        return { error: "Too many requests", status: 429 };
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        devlog("[Mojang] API error", response.status, "for", username, "body:", text.slice(0, 200));
        if (attempt < 2) {
          devlog("[Mojang] Retrying after error", response.status, "...");
          continue;
        }
        return { error: "Mojang API temporarily unavailable", status: 503 };
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        devlog("[Mojang] Empty body for", username);
        if (attempt < 2) {
          devlog("[Mojang] Retrying after empty body...");
          continue;
        }
        return { error: "Mojang API temporarily unavailable", status: 503 };
      }

      if (!data || typeof data !== "object" || !("id" in data) || !("name" in data)) {
        devlog("[Mojang] Invalid response for", username, ":", data);
        if (attempt < 2) {
          devlog("[Mojang] Retrying after invalid response...");
          continue;
        }
        return { error: "Mojang API temporarily unavailable", status: 503 };
      }

      const profile = data as { id: string; name: string };
      devlog("[Mojang] Found:", profile.name, "UUID:", profile.id);
      return { id: profile.id, name: profile.name };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      devlog("[Mojang] FULL ERROR:", {
  username,
  message: msg,
  stack: err instanceof Error ? err.stack : null,
});
      if (attempt < 2) {
        devlog("[Mojang] Retrying after network error...");
        continue;
      }
      return { error: "Mojang API temporarily unavailable", status: 503 };
    }
  }

  return { error: "Mojang API temporarily unavailable", status: 503 };
}

async function fetchMinecraftProfile(uuid: string): Promise<MinecraftProfile | null> {
  const url = `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`;
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: {
        "Accept": "application/json",
      },
    });
  } catch {
    console.warn("[Mojang] Session server unreachable for UUID:", uuid);
    return null;
  }
  if (!response.ok) return null;
  try {
    return (await response.json()) as MinecraftProfile;
  } catch {
    return null;
  }
}

export async function lookupMinecraftIdentity(
  username: string,
): Promise<MinecraftIdentity | { error: string; status: number }> {
  const result = await lookupMojangProfile(username);
  if ("error" in result) {
    console.warn("[Mojang] Verification FAILED for:", username, "-", result.error);
    return { error: result.error, status: result.status };
  }

  const uuid = formatMojangUuid(result.id);
  const fullProfile = await fetchMinecraftProfile(result.id);
  const skinUrl = fullProfile?.skins?.[0]?.url ?? null;

  return {
    username: result.name,
    uuid,
    avatarUrl: createMinecraftAvatarUrl(uuid),
    skinUrl,
    verified: true,
  };
}
