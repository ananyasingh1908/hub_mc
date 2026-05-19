import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, TicketPercent, Trash2 } from "lucide-react";
import { calculateOrderSummary, formatCurrency } from "@/lib/commerce/pricing";
import { useCartStore } from "@/store/cart-store";
import type { UserAgreements } from "@/lib/commerce/types";

type OrderSummaryCardProps = {
  heading?: string;
  ctaLabel: string;
  ctaHref?: string;
  ctaDisabled?: boolean;
  warning?: string | null;
  sticky?: boolean;
  allProducts?: any[];
};

function agreementsComplete(agreements: UserAgreements) {
  return Object.values(agreements).every(Boolean);
}

export function OrderSummaryCard({
  heading = "Order Summary",
  ctaLabel,
  ctaHref,
  ctaDisabled = false,
  warning,
  sticky = false,
  allProducts = [],
}: OrderSummaryCardProps) {
  const items = useCartStore((state) => state.items);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);
  const clearCart = useCartStore((state) => state.clearCart);
  const agreements = useCartStore((state) => state.agreements);
  const summary = useMemo(
    () => calculateOrderSummary(items, appliedCoupon, allProducts),
    [items, appliedCoupon, allProducts],
  );

  const canProceed = !ctaDisabled && summary.itemCount > 0;
  const agreementWarning =
    !agreementsComplete(agreements) && ctaHref === "/checkout"
      ? "Complete the user agreement before continuing to checkout."
      : null;

  return (
    <aside
      className={`rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.95)] p-6 shadow-[0_24px_80px_-40px_rgba(62,162,255,0.45)] ${
        sticky ? "lg:sticky lg:top-28" : ""
      }`}
      style={{ position: "relative" }}
    >
      <h2 className="text-2xl font-black tracking-tight text-white">
        {heading}
      </h2>

      <div className="mt-6 space-y-4 text-sm text-white/72">
        <div className="flex items-center justify-between">
          <span>Products total</span>
          <span className="font-semibold text-white">
            {formatCurrency(summary.subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Discount</span>
          <span className="font-semibold text-[var(--hub-blue)]">
            -{formatCurrency(summary.discountAmount)}
          </span>
        </div>
        <div className="h-px bg-white/10" />
        <div className="flex items-center justify-between text-base">
          <span className="font-semibold text-white">Final Total</span>
          <span className="text-3xl font-black text-white">
            {formatCurrency(summary.total)}
          </span>
        </div>
      </div>

      {appliedCoupon ? (
        <div className="mt-6 rounded-2xl border border-[rgba(62,162,255,0.3)] bg-[rgba(62,162,255,0.08)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <TicketPercent className="mt-0.5 h-4 w-4 text-[var(--hub-blue)]" />
              <div>
                <div className="text-sm font-semibold text-white">
                  {appliedCoupon.code} applied
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {appliedCoupon.description}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={clearCoupon}
              className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--hub-orange)] transition-colors hover:text-white"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex gap-3">
        {ctaHref && canProceed ? (
          <Link
            to={ctaHref}
            className={`inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
              "bg-[var(--hub-orange)] text-black hover:-translate-y-0.5 hover:bg-[#ff9a46]"
            }`}
          >
            {ctaLabel}
          </Link>
        ) : (
          <div
            className={`inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
              canProceed
                ? "bg-[var(--hub-orange)] text-black"
                : "cursor-not-allowed bg-white/8 text-white/35"
            }`}
          >
            {ctaLabel}
          </div>
        )}

        <button
          type="button"
          onClick={clearCart}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/72 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,138,42,0.28)] hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {warning || agreementWarning ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[rgba(255,138,42,0.28)] bg-[rgba(255,138,42,0.08)] p-4 text-sm text-white/78">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hub-orange)]" />
          <span>{warning ?? agreementWarning}</span>
        </div>
      ) : null}
    </aside>
  );
}
