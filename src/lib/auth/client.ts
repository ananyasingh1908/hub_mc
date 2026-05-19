import { useQuery, useQueryClient } from "@tanstack/react-query";

export const authSessionQueryKey = ["auth", "session"] as const;
export const employeeSessionQueryKey = ["auth", "employee", "session"] as const;
export const adminSessionQueryKey = ["auth", "admin", "session"] as const;
export const allSessionsQueryKey = ["auth", "all-sessions"] as const;

export async function fetchAuthSession() {
  const response = await fetch("/api/auth/session", { credentials: "include", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Unable to load session.");
  return (await response.json());
}

export async function fetchEmployeeSession() {
  const response = await fetch("/api/auth/employee/session", { credentials: "include", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Unable to load employee session.");
  return (await response.json());
}

export async function fetchAdminSession() {
  const response = await fetch("/api/auth/admin/session", { credentials: "include", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Unable to load admin session.");
  return (await response.json());
}

export async function fetchAllSessions() {
  const response = await fetch("/api/auth/all-sessions", { credentials: "include", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Unable to load sessions.");
  return (await response.json());
}

export function useAuthSession() {
  const isBrowser = typeof window !== "undefined";
  return useQuery({
    queryKey: authSessionQueryKey,
    queryFn: fetchAuthSession,
    staleTime: 60_000,
    retry: false,
    enabled: isBrowser,
  });
}

export function useEmployeeSession() {
  const isBrowser = typeof window !== "undefined";
  return useQuery({
    queryKey: employeeSessionQueryKey,
    queryFn: fetchEmployeeSession,
    staleTime: 60_000,
    retry: false,
    enabled: isBrowser,
  });
}

export function useAdminSession() {
  const isBrowser = typeof window !== "undefined";
  return useQuery({
    queryKey: adminSessionQueryKey,
    queryFn: fetchAdminSession,
    staleTime: 60_000,
    retry: false,
    enabled: isBrowser,
  });
}

export function useAllSessions() {
  const isBrowser = typeof window !== "undefined";
  return useQuery({
    queryKey: allSessionsQueryKey,
    queryFn: fetchAllSessions,
    staleTime: 30_000,
    retry: false,
    enabled: isBrowser,
  });
}

export async function beginSignOut() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function beginEmployeeSignOut() {
  await fetch("/api/auth/employee/logout", { method: "POST", credentials: "include" });
}

export async function beginAdminSignOut() {
  await fetch("/api/auth/admin/logout", { method: "POST", credentials: "include" });
}

export function useInvalidateAuthSession() {
  const queryClient = useQueryClient();
  return async () => { await queryClient.invalidateQueries({ queryKey: authSessionQueryKey }); };
}

export function useInvalidateEmployeeSession() {
  const queryClient = useQueryClient();
  return async () => { await queryClient.invalidateQueries({ queryKey: employeeSessionQueryKey }); };
}

export function useInvalidateAdminSession() {
  const queryClient = useQueryClient();
  return async () => { await queryClient.invalidateQueries({ queryKey: adminSessionQueryKey }); };
}

export function useInvalidateAllSessions() {
  const queryClient = useQueryClient();
  return async () => { await queryClient.invalidateQueries({ queryKey: allSessionsQueryKey }); };
}

export async function loginWithMinecraft(username: string): Promise<{ ok: boolean; error?: string; redirectTo?: string }> {
  const response = await fetch("/api/auth/login", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ username }) });
  return await response.json();
}
