import { getStorage } from "@/lib/storage/storage";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { devlog, devwarn } from "@/lib/dev-log";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function error(msg: string, status: number) {
  return json({ error: msg }, status);
}

export async function handleUpload(request: Request) {
  devlog("[Upload] Request received");

  const employeeSession = await getEmployeeSession(request);
  const adminSession = await getAdminSession(request);
  if (!employeeSession && !adminSession) {
    devwarn("[Upload] Rejected — no authenticated session");
    return error("Forbidden", 403);
  }
  const authed = employeeSession ?? adminSession;
  devlog("[Upload] Authenticated as", authed!.role, authed!.email);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return error("Invalid form data", 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) return error("No file provided", 400);

  if (!ALLOWED_TYPES.includes(file.type)) {
    return error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`, 400);
  }

  if (file.size > MAX_SIZE) {
    return error("File too large. Maximum size is 5MB", 400);
  }

  devlog("[Upload] File validated:", file.type, `${(file.size / 1024).toFixed(1)}KB`);

  const ext = EXTENSIONS[file.type] || "png";
  const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const buffer = await file.arrayBuffer();
  const storage = getStorage();
  const url = await storage.save(uniqueName, buffer, file.type);

  devlog("[Upload] Stored successfully —", url);

  return json({ ok: true, url });
}
