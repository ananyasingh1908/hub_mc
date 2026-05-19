import { motion } from "framer-motion";
import { Info, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/commerce/types";
import { formatCurrency } from "@/lib/commerce/pricing";
import { useCartStore } from "@/store/cart-store";

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
  const accent = accentStyles[product.accent];
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem(product);
    toast.success(`${product.name} added to cart`, {
      description: "Your HUBMC order summary updated instantly.",
    });
  };

  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(10,10,10,0.96)]"
      style={{
        boxShadow: `0 28px 80px -40px ${accent.glow}`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          boxShadow: `inset 0 0 0 1px ${accent.ring}, 0 0 0 1px ${accent.ring}`,
        }}
      />
      <div className="relative overflow-hidden">
        <div className="absolute left-5 top-5 z-10">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${accent.badge}`}
          >
            {product.badge}
          </span>
        </div>
        <div className="relative h-56 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            style={{ objectPosition: product.imagePosition ?? "center center" }}
            draggable={false}
          />
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${accent.tint}`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/55 to-transparent" />
        </div>
      </div>

      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-white">
              {product.name}
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/66">
              {product.description}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">
              Price
            </div>
            <div className="mt-2 text-3xl font-black text-white">
              {formatCurrency(product.price)}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {product.rewards.map((reward) => (
            <span
              key={reward}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/55"
            >
              {reward}
            </span>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[rgba(62,162,255,0.4)] bg-[rgba(62,162,255,0.12)] px-4 py-3 text-sm font-semibold text-[var(--hub-blue)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[rgba(62,162,255,0.2)] hover:text-white"
          >
            <Info className="h-4 w-4" />
            Info
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${accent.button}`}
          >
            <ShoppingCart className="h-4 w-4" />
            Add To Cart
          </button>
        </div>
      </div>
    </motion.article>
  );
}
