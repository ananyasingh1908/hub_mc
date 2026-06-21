import { SignJWT, jwtVerify } from "jose";
import { and, eq } from "drizzle-orm";
import type { HubMCSession } from "@/lib/auth/types";
import { lookupMinecraftIdentity } from "@/lib/auth/minecraft";
import { devlog } from "@/lib/dev-log";
import { db } from "@/lib/db";
import { customers, employees, users } from "@/lib/db/schema";

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

export async function handleLoginRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";

  try {
    const body = (await request.json()) as { username?: string };
    const username = body.username?.trim();

    if (!username || username.length < 3 || username.length > 16) {
      return Response.json(
        { ok: false, error: "Enter a valid Minecraft username (3-16 characters)." },
        { status: 400 },
      );
    }

    const identity = await lookupMinecraftIdentity(username);
    if ("error" in identity) {
      devlog("[Mojang] Verification rejected:", identity.error);
      return Response.json(
        { ok: false, error: identity.error },
        { status: identity.status },
      );
    }

    let customerId: string | null = null;
    let userRole: "CUSTOMER" | "EMPLOYEE" | "SUPER_ADMIN" = "CUSTOMER";
    let employeeId: string | null = null;
    const userEmail = `${identity.uuid}@minecraft.hubmc`;
    let userId: string | null = null;

    try {
      // 1) find user by email
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      let user = existingUsers[0];

      if (!user) {
        const newUserId = crypto.randomUUID();

        await db.insert(users).values({
          id: newUserId,
          email: userEmail,
          name: identity.username,
          image: identity.avatarUrl,
          role: "CUSTOMER",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const insertedUsers = await db
          .select()
          .from(users)
          .where(eq(users.id, newUserId))
          .limit(1);

        user = insertedUsers[0];
      } else {
        await db
          .update(users)
          .set({
            name: identity.username,
            image: identity.avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        const refreshedUsers = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        user = refreshedUsers[0];
      }

      if (user) {
        userId = user.id;
        userRole = (user.role as "CUSTOMER" | "EMPLOYEE" | "SUPER_ADMIN") ?? "CUSTOMER";
      }

      // 2) find customer by minecraft username
      const existingCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.minecraftUsername, identity.username))
        .limit(1);

      let customer = existingCustomers[0];

      if (!customer) {
        const newCustomerId = crypto.randomUUID();

        await db.insert(customers).values({
          id: newCustomerId,
          userId: userId!,
          minecraftUsername: identity.username,
          minecraftUuid: identity.uuid,
          avatarUrl: identity.avatarUrl,
          skinUrl: identity.skinUrl,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const insertedCustomers = await db
          .select()
          .from(customers)
          .where(eq(customers.id, newCustomerId))
          .limit(1);

        customer = insertedCustomers[0];
      } else {
        await db
          .update(customers)
          .set({
            minecraftUuid: identity.uuid,
            avatarUrl: identity.avatarUrl,
            skinUrl: identity.skinUrl,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customer.id));

        const refreshedCustomers = await db
          .select()
          .from(customers)
          .where(eq(customers.id, customer.id))
          .limit(1);

        customer = refreshedCustomers[0];
      }

      customerId = customer?.id ?? null;

      // 3) if employee/super admin, find employee row
      if ((userRole === "EMPLOYEE" || userRole === "SUPER_ADMIN") && userId) {
        const employeeRows = await db
          .select()
          .from(employees)
          .where(eq(employees.userId, userId))
          .limit(1);

        const employee = employeeRows[0];
        if (employee) {
          employeeId = employee.id;
        }
      }
    } catch (error) {
      console.warn("Failed to persist HUBMC user/customer record.", error);
    }

    const token = await signToken({
      sub: userId ?? identity.uuid,
      minecraftUsername: identity.username,
      minecraftUuid: identity.uuid,
      minecraftAvatarUrl: identity.avatarUrl,
      minecraftSkinUrl: identity.skinUrl,
      customerId,
      role: userRole,
      employeeId,
      email: userEmail,
      verified: identity.verified,
    });

    const headers = new Headers({ "content-type": "application/json" });
    headers.append(
      "set-cookie",
      buildSetCookieHeader(SESSION_COOKIE_NAME, token, SESSION_MAX_AGE_SECONDS, secure),
    );

    return new Response(JSON.stringify({ ok: true, redirectTo: "/" }), {
      status: 200,
      headers,
    });
  } catch {
    return Response.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
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

export async function handleLogoutRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const clearCookie = buildSetCookieHeader(SESSION_COOKIE_NAME, "", 0, secure);

  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", clearCookie);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export async function handleSessionRequest(request: Request): Promise<Response> {
  const session = await getHubMCSession(request);
  return Response.json(session);
}