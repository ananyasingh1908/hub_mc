import { devlog } from "@/lib/dev-log";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck, LoaderCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { useAdminSession } from "@/lib/auth/client";

async function loginAsAdmin(id: string, password: string): Promise<{ ok: boolean; error?: string; redirectTo?: string }> {
  const response = await fetch("/api/auth/admin-login", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, password }),
  });
  return await response.json() as { ok: boolean; error?: string; redirectTo?: string };
}

function LoginFormShell() {
  return (
    <AuthPageLayout>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(62,162,255,0.22),transparent_68%)] blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,138,42,0.18),transparent_70%)] blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,16,0.96),rgba(8,8,8,0.96))] p-8 shadow-[0_40px_120px_-42px_rgba(62,162,255,0.55)] backdrop-blur-xl md:p-10">
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[22px] border border-[rgba(62,162,255,0.22)] bg-black/65">
            <LoaderCircle className="h-9 w-9 animate-spin text-[var(--hub-blue)]" />
          </div>
        </div>
      </section>
    </AuthPageLayout>
  );
}



function AdminLoginForm() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!id.trim()) {
      setError("Enter your Admin ID.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginAsAdmin(id.trim(), password);
      if (result.ok) {
        devlog("[AdminLogin] login success");
        devlog("[AdminLogin] session created");
        devlog("[AdminLogin] redirect target: /admin");
        window.location.href = "/admin";
      } else {
        setError(result.error ?? "Invalid credentials.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(62,162,255,0.22),transparent_68%)] blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,138,42,0.18),transparent_70%)] blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,16,0.96),rgba(8,8,8,0.96))] p-8 shadow-[0_40px_120px_-42px_rgba(255,138,42,0.4)] backdrop-blur-xl md:p-10"
        >
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[22px] border border-[rgba(255,138,42,0.22)] bg-black/65 shadow-[0_0_40px_rgba(255,138,42,0.2)]">
            <ShieldCheck className="h-9 w-9 text-[var(--hub-orange)]" />
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[var(--hub-orange)]">
              Super Admin
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Admin Login
            </h1>
            <p className="mt-4 text-base leading-8 text-white/66">
              Enter your credentials to access the admin panel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-white/72">Admin ID</label>
              <input
                type="text"
                value={id}
                onChange={(e) => { setId(e.target.value); if (error) setError(null); }}
                placeholder="Enter your admin ID"
                disabled={isSubmitting}
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-base text-white outline-none transition-colors placeholder:text-white/30 focus:border-[rgba(255,138,42,0.45)] focus:ring-1 focus:ring-[rgba(255,138,42,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="mt-5 space-y-1">
              <label className="block text-sm font-medium text-white/72">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  className="h-14 w-full rounded-2xl border border-white/10 bg-black/60 px-4 pr-12 text-base text-white outline-none transition-colors placeholder:text-white/30 focus:border-[rgba(255,138,42,0.45)] focus:ring-1 focus:ring-[rgba(255,138,42,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 flex items-start gap-3 rounded-2xl border border-[rgba(255,138,42,0.25)] bg-[rgba(255,138,42,0.08)] px-4 py-3 text-sm leading-6 text-white/82"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hub-orange)]" />
                <span>{error}</span>
              </motion.div>
            ) : null}

            <div className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`h-14 w-full rounded-2xl text-base font-semibold transition-all duration-300 ${
                  isSubmitting
                    ? "cursor-not-allowed bg-white/8 text-white/40"
                    : "bg-[var(--hub-orange)] text-black hover:-translate-y-0.5 hover:bg-[#ff9a46]"
                }`}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>

          <p className="mt-5 text-center text-sm leading-7 text-white/46">
            This panel is restricted to authorized super administrators only.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              to="/"
              className="text-sm font-medium text-white/56 transition-colors hover:text-[var(--hub-blue)]"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </section>
    </AuthPageLayout>
  );
}

export default function AdminLoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    devlog("[AdminLogin] Page mounted, origin:", window.location.origin);
  }, []);

  const { data: admSession, isPending: isSessionLoading } = useAdminSession();

  useEffect(() => {
    if (admSession?.authenticated) {
      devlog("[AdminLogin] session detected on page load");
      devlog("[AdminLogin] redirect target: /admin");
      window.location.href = "/admin";
    }
  }, [admSession]);

  if (!mounted || isSessionLoading) {
    return <LoginFormShell />;
  }

  if (admSession?.authenticated) return null;

  return <AdminLoginForm />;
}
