import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, users } from "@/lib/db/schema";
import { signToken, buildSetCookieHeader, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

export async function handlePlayerLogin(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";

  try {
    const body = (await request.json()) as {
      phoneNumber?: string;
      fullName?: string;
    };
    const { phoneNumber, fullName } = body;

    if (!phoneNumber) {
      return Response.json({ ok: false, error: "Phone number is required." }, { status: 400 });
    }
    if (!fullName || !fullName.trim()) {
      return Response.json({ ok: false, error: "Name is required." }, { status: 400 });
    }

    const normalized = normalizePhone(phoneNumber);
    if (!normalized) {
      return Response.json({ ok: false, error: "Invalid phone number." }, { status: 400 });
    }

    const trimmedName = fullName.trim();
    const now = new Date();

    const existingCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.phoneNumber, normalized))
      .limit(1);

    let customer = existingCustomers[0];
    let user = null;
    let isNewUser = false;

    if (customer) {
      await db
        .update(customers)
        .set({ fullName: trimmedName, lastLoginAt: now, updatedAt: now })
        .where(eq(customers.id, customer.id));

      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.id, customer.userId))
        .limit(1);
      user = userRows[0];

      const refreshed = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customer.id))
        .limit(1);
      customer = refreshed[0];
    } else {
      const email = `phone_${normalized}@hubmc.local`;

      const existingEmailUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmailUsers[0]) {
        user = existingEmailUsers[0];
        const newCustomerId = crypto.randomUUID();
        await db.insert(customers).values({
          id: newCustomerId,
          userId: user.id,
          fullName: trimmedName,
          phoneNumber: normalized,
          phoneVerifiedAt: now,
          authProvider: "phone",
          minecraftUsername: "",
          minecraftUuid: "",
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now,
        });
        const insertedCustomers = await db
          .select()
          .from(customers)
          .where(eq(customers.id, newCustomerId))
          .limit(1);
        customer = insertedCustomers[0];
      } else {
        isNewUser = true;
        const newUserId = crypto.randomUUID();
        const newCustomerId = crypto.randomUUID();

        await db.insert(users).values({
          id: newUserId,
          email,
          name: trimmedName,
          image: null,
          microsoftAccountId: null,
          passwordHash: null,
          role: "CUSTOMER",
          createdAt: now,
          updatedAt: now,
        });

        await db.insert(customers).values({
          id: newCustomerId,
          userId: newUserId,
          fullName: trimmedName,
          phoneNumber: normalized,
          phoneVerifiedAt: now,
          authProvider: "phone",
          minecraftUsername: "",
          minecraftUuid: "",
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now,
        });

        const insertedCustomers = await db
          .select()
          .from(customers)
          .where(eq(customers.id, newCustomerId))
          .limit(1);
        customer = insertedCustomers[0];

        const insertedUsers = await db
          .select()
          .from(users)
          .where(eq(users.id, newUserId))
          .limit(1);
        user = insertedUsers[0];
      }
    }

    const token = await signToken({
      sub: user?.id ?? customer.id,
      customerId: customer.id,
      role: (user?.role as "CUSTOMER" | "EMPLOYEE" | "SUPER_ADMIN") ?? "CUSTOMER",
      email: user?.email ?? null,
      fullName: customer.fullName ?? null,
      phoneNumber: normalized,
      verified: true,
      authProvider: "phone",
    });

    const headers = new Headers({ "content-type": "application/json" });
    headers.append(
      "set-cookie",
      buildSetCookieHeader(SESSION_COOKIE_NAME, token, SESSION_MAX_AGE_SECONDS, secure),
    );

    return new Response(
      JSON.stringify({ ok: true, redirectTo: "/", isNewUser }),
      { status: 200, headers },
    );
  } catch (error: any) {
    console.error("[PlayerAuth] Login error:", error);
    return Response.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
