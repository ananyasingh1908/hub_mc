import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/commerce/pricing";
import type { CartLine } from "@/lib/commerce/types";
import { useCartStore } from "@/store/cart-store";

export function CartLineItem({ line }: { line: CartLine }) {
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <article className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="h-28 w-full shrink-0 overflow-hidden rounded-2xl md:w-40">
          <img
            src={line.product.image}
            alt={line.product.name}
            className="h-full w-full object-cover"
            style={{ objectPosition: line.product.imagePosition ?? "center center" }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-2xl font-black text-white">{line.product.name}</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
            {line.product.description}
          </p>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.28em] text-white/40">
              Subtotal
            </div>
            <div className="mt-1 text-2xl font-black text-white">
              {formatCurrency(line.subtotal)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => decreaseQuantity(line.product.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/72 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center text-sm font-semibold text-white">
                {line.quantity}
              </span>
              <button
                type="button"
                onClick={() => increaseQuantity(line.product.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/72 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => removeItem(line.product.id)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[rgba(255,138,42,0.2)] bg-[rgba(255,138,42,0.08)] px-4 text-sm font-semibold text-[var(--hub-orange)] transition-colors hover:bg-[rgba(255,138,42,0.16)] hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
