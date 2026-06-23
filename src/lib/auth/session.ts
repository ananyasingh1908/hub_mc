import { SignJWT, jwtVerify } from "jose";
import type { HubMCSession } from "@/lib/auth/types";

export const SESSION_COOKIE_NAME = "hubmc.customer.session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set. Authentication cannot work without it.");
  }
  return secret;
}

function getEncodedSecret(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

export function buildSetCookieHeader(
  cookieName: string,
  value: string,
  maxAge: number,
  secure: boolean,
): string {
  return `${cookieName}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

function getExpirationDate(): Date {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

export function parseCookies(request: Request): Map<string, string> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return new Map();

  const cookies = new Map<string, string>();
  for (const cookie of cookieHeader.split(";")) {
    const trimmed = cookie.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    cookies.set(trimmed.slice(0, eqIdx).trim(), trimmed.slice(eqIdx + 1).trim());
  }
  return cookies;
}

export function getClientVisibleAuthState() {
  return { enabled: true };
}

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getEncodedSecret());
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedSecret());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildSessionFromToken(token: Record<string, unknown> | null): HubMCSession | null {
  if (!token) return null;

  return {
    user: {
      minecraftUsername: (token.minecraftUsername as string) ?? null,
      minecraftUuid: (token.minecraftUuid as string) ?? null,
      minecraftAvatarUrl: (token.minecraftAvatarUrl as string) ?? null,
      minecraftSkinUrl: (token.minecraftSkinUrl as string) ?? null,
      customerId: (token.customerId as string) ?? null,
      role: (token.role as "CUSTOMER" | "EMPLOYEE" | "SUPER_ADMIN") ?? "CUSTOMER",
      employeeId: (token.employeeId as string) ?? null,
      email: (token.email as string) ?? null,
      verified: (token.verified as boolean) ?? false,
      fullName: (token.fullName as string) ?? null,
      phoneNumber: (token.phoneNumber as string) ?? null,
      authProvider: (token.authProvider as string) ?? null,
    },
    expires: getExpirationDate().toISOString(),
  };
}

export async function getHubMCSession(request: Request): Promise<HubMCSession | null> {
  const cookies = parseCookies(request);
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return null;

  const payload = await verifyToken(token);
  return buildSessionFromToken(payload);
}

export async function handleSessionRequest(request: Request): Promise<Response> {
  const session = await getHubMCSession(request);
  return Response.json(session);
}

export async function handleLogoutRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const clearCookie = buildSetCookieHeader(SESSION_COOKIE_NAME, "", 0, secure);

  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", clearCookie);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export async function createSession(
  payload: Record<string, unknown>,
  request: Request,
): Promise<{ token: string; headers: Headers }> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";

  const token = await signToken(payload);
  const headers = new Headers({ "content-type": "application/json" });
  headers.append(
    "set-cookie",
    buildSetCookieHeader(SESSION_COOKIE_NAME, token, SESSION_MAX_AGE_SECONDS, secure),
  );

  return { token, headers };
}
