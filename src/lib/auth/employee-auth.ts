import { devlog } from "@/lib/dev-log";
import { getPrismaClient } from "@/lib/db/prisma";
import { createEmployeeSession } from "@/lib/auth/employee-session";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

type EmployeeResult = {
  id: string;
  displayName: string;
  role: "EMPLOYEE" | "SUPER_ADMIN";
  isActive: boolean;
  user: { id: string; name: string | null; image: string | null };
};

async function findEmployeeByEmail(email: string): Promise<EmployeeResult | null> {
  const prisma = await getPrismaClient();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const role = user.role as "EMPLOYEE" | "SUPER_ADMIN";
  const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!employee) return null;

  return {
    id: employee.id,
    displayName: employee.displayName,
    role,
    isActive: employee.isActive,
    user: { id: user.id, name: user.name, image: user.image },
  };
}

async function verifyGoogleToken(credential: string): Promise<{ email: string; name: string; sub: string } | null> {
  try {
    if (!GOOGLE_CLIENT_ID) {
      console.error("[EmployeeAuth] GOOGLE_CLIENT_ID is empty in .env");
      return null;
    }

    devlog("[EmployeeAuth] Verifying Google token with tokeninfo endpoint...");
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);

    if (!response.ok) {
      const text = await response.text();
      console.error("[EmployeeAuth] Google tokeninfo responded", response.status, text);
      return null;
    }

    const payload = (await response.json()) as Record<string, unknown>;

    if (payload.aud !== GOOGLE_CLIENT_ID) {
      console.error("[EmployeeAuth] Token audience mismatch: got", payload.aud, "expected", GOOGLE_CLIENT_ID);
      return null;
    }
    if (!payload.email) {
      console.error("[EmployeeAuth] Google token has no email field");
      return null;
    }

    devlog("[EmployeeAuth] Google token verified — email:", payload.email);
    return {
      email: payload.email as string,
      name: (payload.name as string) ?? "",
      sub: (payload.sub as string) ?? "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[EmployeeAuth] Google tokeninfo threw:", message);
    return null;
  }
}

export async function handleEmployeeLoginRequest(request: Request): Promise<Response> {
  devlog("[EmployeeAuth] === Login request ===");

  if (!GOOGLE_CLIENT_ID) {
    console.error("[EmployeeAuth] GOOGLE_CLIENT_ID not configured");
    return Response.json(
      { ok: false, error: "Server misconfiguration: Google Client ID not set." },
      { status: 500 },
    );
  }

  let body: { credential?: string };
  try {
    body = await request.json() as { credential?: string };
  } catch {
    console.error("[EmployeeAuth] Invalid JSON body");
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.credential) {
    console.error("[EmployeeAuth] Missing credential in request body");
    return Response.json({ ok: false, error: "Missing Google credential." }, { status: 400 });
  }

  devlog("[EmployeeAuth] Credential received, length:", body.credential.length);

  const googleUser = await verifyGoogleToken(body.credential);
  if (!googleUser || !googleUser.email) {
    console.error("[EmployeeAuth] Token verification FAILED");
    return Response.json(
      { ok: false, error: "Invalid Google token. Could not verify your identity." },
      { status: 401 },
    );
  }

  devlog("[EmployeeAuth] Google email received:", googleUser.email);
  devlog("[EmployeeAuth] Google name received:", googleUser.name);

  const employee = await findEmployeeByEmail(googleUser.email);
  if (!employee) {
    console.warn("[EmployeeAuth] Unauthorized employee account for email:", googleUser.email);
    return Response.json(
      { ok: false, error: "Unauthorized employee account." },
      { status: 403 },
    );
  }

  if (!employee.isActive) {
    console.warn("[EmployeeAuth] Employee", employee.id, "is deactivated");
    return Response.json(
      { ok: false, error: "Your account has been deactivated. Contact your administrator." },
      { status: 403 },
    );
  }

  devlog("[EmployeeAuth] Auth SUCCESS —", googleUser.email, "role:", employee.role);

  let headers: Headers;
  try {
    const result = await createEmployeeSession({
      sub: employee.user.id,
      email: googleUser.email,
      role: employee.role,
      employeeId: employee.id,
      displayName: employee.user.name ?? employee.displayName,
    }, request);
    headers = result.headers;
  } catch (sessionError) {
    const msg = sessionError instanceof Error ? sessionError.message : String(sessionError);
    console.error("[EmployeeAuth] Session creation FAILED:", msg);
    return Response.json(
      { ok: false, error: "Session creation failed: " + msg },
      { status: 500 },
    );
  }

  devlog("[EmployeeAuth] Session created — redirecting to /employee");
  return new Response(JSON.stringify({ ok: true, redirectTo: "/employee" }), {
    status: 200,
    headers,
  });
}

export function handleGoogleClientIdRequest(): Response {
  const configured = !!GOOGLE_CLIENT_ID;
  devlog("[EmployeeAuth] Google client ID requested, configured:", configured);
  return Response.json({
    clientId: GOOGLE_CLIENT_ID,
    configured,
    origin: "server",
  });
}
