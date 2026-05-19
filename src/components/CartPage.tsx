import { useEffect, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { CartLineItem } from "@/components/commerce/CartLineItem";
import { CouponPanel } from "@/components/commerce/CouponPanel";
import { OrderSummaryCard } from "@/components/commerce/OrderSummaryCard";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { UserAgreementPanel } from "@/components/commerce/UserAgreementPanel";
import { buildCartLines } from "@/lib/commerce/pricing";
import { useCartStore } from "@/store/cart-store";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const agreements = useCartStore((state) => state.agreements);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setAllProducts(d.products ?? []))
      .catch(() => {});
  }, []);

  const lines = useMemo(() => buildCartLines(items, allProducts), [items, allProducts]);
  const agreementsIncomplete = !Object.values(agreements).every(Boolean);

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
            <Link
              to="/packages"
              className="mt-8 inline-flex rounded-full bg-[var(--hub-orange)] px-6 py-3 text-sm font-semibold text-black transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#ff9a46]"
            >
              Browse Packages
            </Link>
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
            </div>

            <OrderSummaryCard
              sticky
              ctaLabel="Proceed to Checkout"
              ctaHref="/checkout"
              ctaDisabled={agreementsIncomplete}
              allProducts={allProducts}
              warning={
                agreementsIncomplete
                  ? "Complete the agreement confirmations before continuing."
                  : null
              }
            />
          </div>
        )}
      </section>
    </StorePageLayout>
  );
}
