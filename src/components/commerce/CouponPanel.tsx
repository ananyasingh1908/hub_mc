import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift } from "lucide-react";
import { useCartStore } from "@/store/cart-store";

export function CouponPanel() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const applyCoupon = useCartStore((state) => state.applyCoupon);

  const onRedeem = async () => {
    setLoading(true);
    const result = await applyCoupon(code);
    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      setCode("");
      setLoading(false);
      return;
    }

    setMessage({ tone: "error", text: result.message });
    setLoading(false);
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[rgba(62,162,255,0.12)] p-3 text-[var(--hub-blue)]">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Apply Coupons
          </h2>
          <p className="mt-1 text-sm text-white/56">
            Enter a valid coupon code to get a discount.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Enter coupon code"
          className="h-12 flex-1 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors focus:border-[rgba(62,162,255,0.45)]"
        />
        <button
          type="button"
          onClick={onRedeem}
          disabled={loading}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--hub-blue)] px-6 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2a8de8] disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Redeem"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {message ? (
          <motion.div
            key={message.text}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mt-4 rounded-2xl border p-4 text-sm ${
              message.tone === "success"
                ? "border-[rgba(62,162,255,0.3)] bg-[rgba(62,162,255,0.08)] text-white/82"
                : "border-[rgba(255,138,42,0.28)] bg-[rgba(255,138,42,0.08)] text-white/82"
            }`}
          >
            {message.text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
