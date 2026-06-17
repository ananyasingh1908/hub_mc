import { useState } from "react";
import { motion } from "framer-motion";
import { Info, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/commerce/types";
import { formatCurrency } from "@/lib/commerce/pricing";
import { useCartStore } from "@/store/cart-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const accentStyles = {
  blue: {
    glow: "rgba(62,162,255,0.35)",
    ring: "rgba(62,162,255,0.4)",
    button:
      "bg-[var(--hub-orange)] text-black hover:bg-[#ff9a46] shadow-[0_16px_36px_-18px_rgba(255,138,42,0.95)]",
    badge:
      "border border-[rgba(62,162,255,0.35)] bg-[rgba(62,162,255,0.16)] text-[var(--hub-blue)]",
    tint: "from-[rgba(62,162,255,0.34)] via-[rgba(5,5,5,0.08)] to-[rgba(5,5,5,0.88)]",
  },
  orange: {
    glow: "rgba(255,138,42,0.35)",
    ring: "rgba(255,138,42,0.38)",
    button:
      "bg-[var(--hub-orange)] text-black hover:bg-[#ff9a46] shadow-[0_16px_36px_-18px_rgba(255,138,42,0.95)]",
    badge:
      "border border-[rgba(255,138,42,0.35)] bg-[rgba(255,138,42,0.14)] text-[var(--hub-orange)]",
    tint: "from-[rgba(255,138,42,0.30)] via-[rgba(5,5,5,0.08)] to-[rgba(5,5,5,0.88)]",
  },
} as const;

export function PackageCard({ product }: { product: Product }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const accent = accentStyles[product.accent] ?? accentStyles.blue;
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem(product);
    toast.success(`${product.name} added to cart`, {
      description: "Your HUBMC order summary updated instantly.",
    });
  };

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(10,10,10,0.96)]"
      style={{
        boxShadow: `0 20px 60px -35px ${accent.glow}`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          boxShadow: `inset 0 0 0 1px ${accent.ring}, 0 0 0 1px ${accent.ring}`,
        }}
      />

      <div className="relative shrink-0 overflow-hidden bg-[rgba(11,11,11,0.96)] h-44 md:h-56 lg:h-60">
        <div className="absolute left-3 top-3 z-10">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] ${accent.badge}`}
          >
            {product.badge}
          </span>
        </div>
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-110"
          style={{ objectPosition: "top center" }}
          draggable={false}
        />
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${accent.tint}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black via-black/55 to-transparent" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col p-3">
        <div className="min-h-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-base font-black tracking-tight text-white">
                {product.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-white/60">
                {product.description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[9px] uppercase tracking-[0.28em] text-white/45">
                Price
              </div>
              <div className="mt-0.5 text-lg font-black text-white">
                {formatCurrency(product.price)}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {product.rewards.map((reward) => (
              <span
                key={reward}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/55"
              >
                {reward}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-2 shrink-0">
          <div className="flex flex-col gap-1.5 sm:flex-row">
            {product.description && (
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[rgba(62,162,255,0.4)] bg-[rgba(62,162,255,0.12)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--hub-blue)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[rgba(62,162,255,0.2)] hover:text-white"
              >
                <Info className="h-3 w-3" />
                Info
              </button>
            )}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-300 hover:-translate-y-0.5 ${accent.button}`}
            >
              <ShoppingCart className="h-3 w-3" />
              Add To Cart
            </button>
          </div>
        </div>

        <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
          <DialogContent className="border border-white/10 bg-[rgba(10,10,10,0.98)] text-white sm:max-w-md">
            {product.image && (
              <div className="-mx-6 -mt-6 mb-4 overflow-hidden rounded-t-lg bg-[rgba(11,11,11,0.96)]">
                <img src={product.image} alt={product.name} className="h-56 w-full object-contain" />
              </div>
            )}
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white">{product.name}</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-white/66">
                {product.description}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-sm text-white/50">Price</span>
              <span className="text-2xl font-black text-white">{formatCurrency(product.price)}</span>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </motion.article>
  );
}
