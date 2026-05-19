import { signToken, verifyToken, parseCookies, buildSetCookieHeader, SESSION_MAX_AGE_SECONDS } from "./session";

const ADMIN_SESSION_COOKIE = "hubmc.admin.session";

export type AdminSessionData = {
  authenticated: true;
  sub: string;
  email: string;
  role: "SUPER_ADMIN";
  sessionType: "admin";
};

export async function createAdminSession(payload: {
  sub: string;
  email: string;
  role: "SUPER_ADMIN";
}, request: Request): Promise<{ token: string; headers: Headers }> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const token = await signToken({ ...payload, sessionType: "admin" });
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", buildSetCookieHeader(ADMIN_SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS, secure));
  return { token, headers };
}

export async function getAdminSession(request: Request): Promise<AdminSessionData | null> {
  const cookies = parseCookies(request);
  const token = cookies.get(ADMIN_SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.sessionType !== "admin") return null;
  return {
    authenticated: true,
    sub: payload.sub as string,
    email: payload.email as string,
    role: payload.role as "SUPER_ADMIN",
    sessionType: "admin",
  };
}

export async function handleAdminSessionRequest(request: Request): Promise<Response> {
  const session = await getAdminSession(request);
  return Response.json(session);
}

export async function handleAdminLogoutRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", buildSetCookieHeader(ADMIN_SESSION_COOKIE, "", 0, secure));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
