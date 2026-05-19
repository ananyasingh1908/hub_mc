import { signToken, verifyToken, parseCookies, buildSetCookieHeader, SESSION_MAX_AGE_SECONDS } from "./session";

const CUSTOMER_SESSION_COOKIE = "hubmc.customer.session";

export type CustomerSessionData = {
  userId: string;
  minecraftUsername: string;
  minecraftUuid: string;
  minecraftAvatarUrl: string | null;
  minecraftSkinUrl: string | null;
  customerId: string | null;
  role: string;
  employeeId: string | null;
  email: string;
  verified: boolean;
};

export async function createCustomerSession(payload: CustomerSessionData, request: Request): Promise<{ token: string; headers: Headers }> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const token = await signToken({ ...payload, sessionType: "customer" });
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", buildSetCookieHeader(CUSTOMER_SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS, secure));
  return { token, headers };
}

export async function getCustomerSession(request: Request): Promise<CustomerSessionData | null> {
  const cookies = parseCookies(request);
  const token = cookies.get(CUSTOMER_SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.sessionType !== "customer") return null;
  return {
    userId: payload.userId as string,
    minecraftUsername: payload.minecraftUsername as string,
    minecraftUuid: payload.minecraftUuid as string,
    minecraftAvatarUrl: (payload.minecraftAvatarUrl as string) ?? null,
    minecraftSkinUrl: (payload.minecraftSkinUrl as string) ?? null,
    customerId: (payload.customerId as string) ?? null,
    role: payload.role as string,
    employeeId: (payload.employeeId as string) ?? null,
    email: payload.email as string,
    verified: (payload.verified as boolean) ?? false,
  };
}

export async function handleCustomerSessionRequest(request: Request): Promise<Response> {
  const session = await getCustomerSession(request);
  return Response.json(session);
}

export async function handleCustomerLogoutRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", buildSetCookieHeader(CUSTOMER_SESSION_COOKIE, "", 0, secure));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
