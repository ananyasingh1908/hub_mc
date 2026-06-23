import { redirect } from "@tanstack/react-router";
import type { UserRoleType } from "@/lib/auth/types";

const DEFAULT_LOGIN_PATH = "/login";

export async function requireAuth(loginPath?: string) {
  if (typeof window === "undefined") return;
  const path = loginPath ?? DEFAULT_LOGIN_PATH;
  try {
    const res = await fetch("/api/auth/session", { credentials: "include", headers: { accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch session");
    const session = await res.json();
    if (!session?.user?.customerId) throw redirect({ to: path, replace: true });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as any).code === "REDIRECT") throw err;
    throw redirect({ to: path, replace: true });
  }
}

export async function requireRole(allowedRoles: UserRoleType[], loginPath?: string) {
  if (typeof window === "undefined") return;
  const path = loginPath ?? DEFAULT_LOGIN_PATH;
  try {
    const res = await fetch("/api/auth/session", { credentials: "include", headers: { accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch session");
    const session = await res.json();
    if (!session?.user?.customerId && !session?.user?.role) throw redirect({ to: path, replace: true });
    if (!session?.user?.customerId && session?.user?.role !== "SUPER_ADMIN") throw redirect({ to: path, replace: true });
    const userRole = (session?.user?.role ?? "CUSTOMER") as UserRoleType;
    if (!allowedRoles.includes(userRole)) throw redirect({ to: "/", replace: true });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as any).code === "REDIRECT") throw err;
    throw redirect({ to: path, replace: true });
  }
}

export async function requireEmployeeAuth(loginPath?: string) {
  if (typeof window === "undefined") return;
  const path = loginPath ?? "/employee-login";
  try {
    const res = await fetch("/api/auth/employee/session", { credentials: "include", headers: { accept: "application/json" } });
    if (!res.ok) throw redirect({ to: path, replace: true });
    const data = await res.json();
    if (!data?.authenticated || !["EMPLOYEE", "SUPER_ADMIN"].includes(data.role)) throw redirect({ to: path, replace: true });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as any).code === "REDIRECT") throw err;
    throw redirect({ to: path, replace: true });
  }
}

export async function requireAdminAuth(loginPath?: string) {
  if (typeof window === "undefined") return;
  const path = loginPath ?? "/admin-login";
  try {
    const res = await fetch("/api/auth/admin/session", { credentials: "include", headers: { accept: "application/json" } });
    if (!res.ok) throw redirect({ to: path, replace: true });
    const data = await res.json();
    if (!data?.authenticated || data.role !== "SUPER_ADMIN") throw redirect({ to: path, replace: true });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as any).code === "REDIRECT") throw err;
    throw redirect({ to: path, replace: true });
  }
}
