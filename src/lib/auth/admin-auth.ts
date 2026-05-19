import { createAdminSession } from "@/lib/auth/admin-session";

const ADMIN_ID = process.env.SUPER_ADMIN_ID || "";
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "";

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

    if (id !== ADMIN_ID || password !== ADMIN_PASSWORD) {
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
