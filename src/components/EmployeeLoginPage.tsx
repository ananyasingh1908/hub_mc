import { devlog } from "@/lib/dev-log";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shield, LoaderCircle, AlertCircle } from "lucide-react";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { useEmployeeSession } from "@/lib/auth/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; cancel_on_tap_outside?: boolean }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

let gsiInitialized = false;
let gsiAttempted = false;

async function loginWithGoogle(credential: string): Promise<{ ok: boolean; error?: string; redirectTo?: string }> {
  const response = await fetch("/api/auth/employee-login", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as { ok: boolean; error?: string; redirectTo?: string };
  } catch {
    return { ok: false, error: "Server returned: " + text.slice(0, 200) };
  }
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



function EmployeeLoginForm() {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [googleClientId, setGoogleClientId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef<(response: { credential: string }) => void>(null);

  callbackRef.current = async (response) => {
    setIsSubmitting(true);
    setError(null);
    devlog("[EmployeeLogin] Google credential received, sending to server...");
    try {
      const result = await loginWithGoogle(response.credential);
      if (result.ok) {
        devlog("[EmployeeLogin] login success");
        devlog("[EmployeeLogin] session created");
        devlog("[EmployeeLogin] redirect target: /employee");
        window.location.href = "/employee";
      } else {
        devlog("[EmployeeLogin] Login denied:", result.error);
        setError(result.error ?? "Access denied.");
      }
    } catch (err) {
      console.error("[EmployeeLogin] Network error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    devlog("[EmployeeLogin] Fetching Google client ID...");
    fetch("/api/auth/google-client-id")
      .then((r) => r.json())
      .then((d) => {
        devlog("[EmployeeLogin] Client ID loaded, configured:", d.configured);
        if (!d.clientId) {
          setError("Google Sign-In is not configured. Contact administrator.");
          return;
        }
        setGoogleClientId(d.clientId);
      })
      .catch((e) => {
        console.error("[EmployeeLogin] Failed to load config:", e);
        setError("Failed to load Google configuration.");
      });
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    if (gsiAttempted) {
      devlog("[EmployeeLogin] GSI already attempted once, skipping");
      return;
    }
    gsiAttempted = true;

    const doInit = () => {
      if (!window.google || !googleButtonRef.current) {
        console.error("[EmployeeLogin] Google library not available");
        setError("Google Sign-In failed to load. Refresh the page.");
        return;
      }
      if (gsiInitialized) {
        devlog("[EmployeeLogin] GSI already initialized, just re-rendering button");
        try {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            width: 360,
          });
        } catch (e) {
          console.error("[EmployeeLogin] Re-render failed:", e);
        }
        return;
      }
      gsiInitialized = true;
      devlog("[EmployeeLogin] Initializing Google Sign-In...");
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (resp) => callbackRef.current?.(resp),
          cancel_on_tap_outside: false,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          width: 360,
        });
        devlog("[EmployeeLogin] Google Sign-In initialized and rendered");
      } catch (e) {
        console.error("[EmployeeLogin] GSI init error:", e);
        setError("Google Sign-In initialization failed.");
      }
    };

    if (window.google) {
      doInit();
      return;
    }

    devlog("[EmployeeLogin] Loading Google GSI script...");
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      devlog("[EmployeeLogin] GSI script loaded");
      doInit();
    };
    script.onerror = () => {
      console.error("[EmployeeLogin] Failed to load GSI script");
      setError("Failed to load Google Sign-In. Check your connection.");
    };
    document.body.appendChild(script);

    return () => {
      devlog("[EmployeeLogin] Cleanup: cancelling GSI");
      try {
        window.google?.accounts.id.cancel();
      } catch { }
    };
  }, [googleClientId]);

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
          className="relative z-10 w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,16,0.96),rgba(8,8,8,0.96))] p-8 shadow-[0_40px_120px_-42px_rgba(62,162,255,0.55)] backdrop-blur-xl md:p-10"
        >
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[22px] border border-[rgba(62,162,255,0.22)] bg-black/65 shadow-[0_0_40px_rgba(62,162,255,0.2)]">
            <Shield className="h-9 w-9 text-[var(--hub-blue)]" />
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[var(--hub-blue)]">
              Staff Authentication
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Employee Login
            </h1>
            <p className="mt-4 text-base leading-8 text-white/66">
              Sign in with your Google account to access the staff panel.
            </p>
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-start gap-3 rounded-2xl border border-[rgba(255,138,42,0.25)] bg-[rgba(255,138,42,0.08)] px-4 py-3 text-sm leading-6 text-white/82"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hub-orange)]" />
              <span>{error}</span>
            </motion.div>
          ) : null}

          <div className="mt-8 flex justify-center">
            {isSubmitting ? (
              <div className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white/8 text-white/40">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              <div ref={googleButtonRef} className="min-h-[48px]" />
            )}
          </div>

          {!googleClientId && !error && (
            <div className="mt-4 text-center text-sm text-white/46">Loading Google Sign-In...</div>
          )}

          <p className="mt-5 text-center text-sm leading-7 text-white/46">
            Only authorized staff members with a valid HUBMC employee account can access this panel.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              to="/"
              className="text-sm font-medium text-white/56 transition-colors hover:text-[var(--hub-orange)]"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </section>
    </AuthPageLayout>
  );
}

export default function EmployeeLoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    devlog("[EmployeeLogin] Page mounted, origin:", window.location.origin);
  }, []);

  const { data: empSession, isPending: isSessionLoading } = useEmployeeSession();

  useEffect(() => {
    if (empSession?.authenticated) {
      devlog("[EmployeeLogin] session detected on page load");
      devlog("[EmployeeLogin] redirect target: /employee");
      window.location.href = "/employee";
    }
  }, [empSession]);

  if (!mounted || isSessionLoading) {
    return <LoginFormShell />;
  }

  if (empSession?.authenticated) return null;

  return <EmployeeLoginForm />;
}
