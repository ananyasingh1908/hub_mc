import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LoaderCircle, User, Phone, AlertCircle, CheckCircle } from "lucide-react";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { loginWithPhone, useAuthSession, useInvalidateAuthSession } from "@/lib/auth/client";

function AlreadySignedIn({
  name,
  onGoToProfile,
}: {
  name: string;
  onGoToProfile: () => void;
}) {
  return (
    <StorePageLayout>
      <section className="relative flex min-h-[calc(100vh-7rem)] items-center justify-center overflow-hidden px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,16,0.96),rgba(8,8,8,0.96))] p-8 shadow-[0_40px_120px_-42px_rgba(62,162,255,0.55)] backdrop-blur-xl md:p-10"
        >
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[22px] border border-[rgba(62,162,255,0.22)] bg-black/65 shadow-[0_0_40px_rgba(62,162,255,0.2)]">
            <CheckCircle className="h-9 w-9 text-[var(--hub-blue)]" />
          </div>
          <div className="mt-8 text-center">
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Already Signed In</h1>
            <p className="mt-4 text-base leading-8 text-white/66">
              You are logged in as <span className="font-semibold text-white">{name}</span>.
            </p>
          </div>
          <div className="mt-8">
            <button
              type="button"
              onClick={onGoToProfile}
              className="h-14 w-full rounded-2xl bg-[var(--hub-blue)] text-base font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#51adff]"
            >
              Go to Profile
            </button>
          </div>
        </motion.div>
      </section>
    </StorePageLayout>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const invalidateAuth = useInvalidateAuthSession();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!trimmedPhone || trimmedPhone.length < 8) {
      setError("Please enter a valid phone number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginWithPhone(trimmedPhone, trimmedName);
      if (result.ok) {
        await invalidateAuth();
        navigate({ to: result.redirectTo ?? "/" });
      } else {
        setError(result.error ?? "Login failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StorePageLayout>
      <section className="relative flex min-h-[calc(100vh-7rem)] items-center justify-center overflow-hidden px-6 py-16">
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
            <User className="h-9 w-9 text-[var(--hub-blue)]" />
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[var(--hub-blue)]">
              Player Authentication
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Login to HUBMC
            </h1>
            <p className="mt-4 text-base leading-8 text-white/66">
              Enter your name and phone number to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/72">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); if (error) setError(null); }}
                placeholder="Enter your full name"
                maxLength={50}
                disabled={isSubmitting}
                className="mt-1.5 h-14 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-base text-white outline-none transition-colors placeholder:text-white/30 focus:border-[rgba(62,162,255,0.45)] focus:ring-1 focus:ring-[rgba(62,162,255,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/72">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => { setPhoneNumber(e.target.value); if (error) setError(null); }}
                placeholder="e.g. 9876543210"
                maxLength={15}
                disabled={isSubmitting}
                className="mt-1.5 h-14 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-base text-white outline-none transition-colors placeholder:text-white/30 focus:border-[rgba(62,162,255,0.45)] focus:ring-1 focus:ring-[rgba(62,162,255,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-2xl border border-[rgba(255,138,42,0.25)] bg-[rgba(255,138,42,0.08)] px-4 py-3 text-sm leading-6 text-white/82"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hub-orange)]" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`h-14 w-full rounded-2xl text-base font-semibold transition-all duration-300 ${
                isSubmitting
                  ? "cursor-not-allowed bg-white/8 text-white/40"
                  : "bg-[var(--hub-blue)] text-white hover:-translate-y-0.5 hover:bg-[#51adff]"
              }`}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Logging in...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm leading-7 text-white/46">
            Your phone number is used as your account identifier.
          </p>

          <div className="mt-8 flex justify-center gap-6">
            <Link to="/packages" className="text-sm font-medium text-white/56 transition-colors hover:text-[var(--hub-orange)]">
              Back to packages
            </Link>
            <Link to="/contact" className="text-sm font-medium text-white/56 transition-colors hover:text-[var(--hub-blue)]">
              Need help?
            </Link>
          </div>
        </motion.div>
      </section>
    </StorePageLayout>
  );
}

export default function LoginPage() {
  const { data: session, isPending } = useAuthSession();
  const [showAlreadySignedIn, setShowAlreadySignedIn] = useState(false);

  useEffect(() => {
    if (!isPending && (session?.user?.phoneNumber || session?.user?.customerId)) {
      setShowAlreadySignedIn(true);
    } else if (!isPending) {
      setShowAlreadySignedIn(false);
    }
  }, [session, isPending]);

  const displayName = session?.user?.fullName || session?.user?.phoneNumber || "Player";

  if (showAlreadySignedIn && (session?.user?.phoneNumber || session?.user?.customerId)) {
    return (
      <AlreadySignedIn
        name={displayName}
        onGoToProfile={() => window.location.href = "/profile"}
      />
    );
  }

  return <LoginForm />;
}
