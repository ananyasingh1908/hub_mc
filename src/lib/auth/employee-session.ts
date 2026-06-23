import { signToken, verifyToken, parseCookies, buildSetCookieHeader, SESSION_MAX_AGE_SECONDS } from "./session";

const EMPLOYEE_SESSION_COOKIE = "hubmc.employee.session";

export type EmployeeSessionData = {
  authenticated: true;
  sub: string;
  email: string;
  role: "EMPLOYEE" | "SUPER_ADMIN";
  employeeId: string;
  displayName: string;
  sessionType: "employee";
};

export async function createEmployeeSession(payload: {
  sub: string;
  email: string;
  role: "EMPLOYEE" | "SUPER_ADMIN";
  employeeId: string;
  displayName: string;
}, request: Request): Promise<{ token: string; headers: Headers }> {
  const token = await signToken({ ...payload, sessionType: "employee" });
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", buildSetCookieHeader(EMPLOYEE_SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS, true));
  return { token, headers };
}

export async function getEmployeeSession(request: Request): Promise<EmployeeSessionData | null> {
  const cookies = parseCookies(request);
  const token = cookies.get(EMPLOYEE_SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.sessionType !== "employee") return null;
  return {
    authenticated: true,
    sub: payload.sub as string,
    email: payload.email as string,
    role: payload.role as "EMPLOYEE" | "SUPER_ADMIN",
    employeeId: payload.employeeId as string,
    displayName: payload.displayName as string,
    sessionType: "employee",
  };
}

export async function handleEmployeeSessionRequest(request: Request): Promise<Response> {
  const session = await getEmployeeSession(request);
  return Response.json(session);
}

export async function handleEmployeeLogoutRequest(request: Request): Promise<Response> {
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", buildSetCookieHeader(EMPLOYEE_SESSION_COOKIE, "", 0, true));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
