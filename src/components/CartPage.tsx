import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, ExternalLink, MessageSquare } from "lucide-react";
import { CartLineItem } from "@/components/commerce/CartLineItem";
import { CouponPanel } from "@/components/commerce/CouponPanel";
import { OrderSummaryCard } from "@/components/commerce/OrderSummaryCard";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { UserAgreementPanel } from "@/components/commerce/UserAgreementPanel";
import { buildCartLines } from "@/lib/commerce/pricing";
import { useCartStore } from "@/store/cart-store";

const DISCORD_INVITE = "https://discord.gg/CwNVBCuSbj";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productError, setProductError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setAllProducts(d.products ?? []))
      .catch(() => setProductError("Failed to load product details."));
  }, []);

  const lines = useMemo(() => buildCartLines(items, allProducts), [items, allProducts]);

  return (
    <StorePageLayout>
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--hub-blue)]">
            Commerce Flow
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">
            Your Cart
          </h1>
        </div>

        {productError && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
            {productError}
          </div>
        )}

        {lines.length === 0 ? (
          <div className="mt-14 rounded-[32px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-10 text-center">
            <div className="mx-auto inline-flex rounded-full bg-[rgba(62,162,255,0.12)] p-5 text-[var(--hub-blue)]">
              <ShoppingCart className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-3xl font-black text-white">
              Your cart is empty
            </h2>
            <p className="mt-3 text-white/60">
              Pick up a rank, coins, or premium rewards to start your order.
            </p>
            <a
              href="/packages"
              className="mt-8 inline-flex rounded-full bg-[var(--hub-orange)] px-6 py-3 text-sm font-semibold text-black transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#ff9a46]"
            >
              Browse Packages
            </a>
          </div>
        ) : (
          <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              {lines.map((line, index) => (
                <motion.div
                  key={line.product.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                >
                  <CartLineItem line={line} />
                </motion.div>
              ))}

              <CouponPanel />
              <UserAgreementPanel />

              <section className="rounded-[28px] border border-[var(--hub-orange)]/20 bg-[rgba(255,138,42,0.06)] p-6">
                <div className="flex items-start gap-4">
                  <div className="inline-flex rounded-2xl bg-[var(--hub-orange)]/10 p-3 text-[var(--hub-orange)]">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-white">
                      How to Purchase
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      To buy these packages, join our Discord server and create a ticket. Our team will assist you with the purchase and delivery.
                    </p>
                    <a
                      href={DISCORD_INVITE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#5865F2] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#4752C4]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Join Discord
                    </a>
                  </div>
                </div>
              </section>
            </div>

            <OrderSummaryCard
              sticky
              ctaLabel="Join Discord & Contact Staff"
              ctaHref={DISCORD_INVITE}
              allProducts={allProducts}
            />
          </div>
        )}
      </section>
    </StorePageLayout>
  );
}
