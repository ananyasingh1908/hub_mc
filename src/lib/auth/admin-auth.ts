import { createAdminSession } from "@/lib/auth/admin-session";

function getAdminCredentials() {
  return {
    id: process.env.SUPER_ADMIN_ID || "",
    password: process.env.SUPER_ADMIN_PASSWORD || "",
  };
}

function safeStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

export async function handleAdminLoginRequest(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { id?: string; password?: string };
    const { id, password } = body;

    if (!id || !password) {
      return Response.json(
        { ok: false, error: "ID and password are required." },
        { status: 400 },
      );
    }

    const { id: ADMIN_ID, password: ADMIN_PASSWORD } = getAdminCredentials();

    if (!safeStringCompare(id, ADMIN_ID) || !safeStringCompare(password, ADMIN_PASSWORD)) {
      return Response.json(
        { ok: false, error: "Invalid credentials." },
        { status: 401 },
      );
    }

    const { headers } = await createAdminSession({
      sub: ADMIN_ID,
      email: ADMIN_ID,
      role: "SUPER_ADMIN",
    }, request);

    return new Response(JSON.stringify({ ok: true, redirectTo: "/admin" }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return Response.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
