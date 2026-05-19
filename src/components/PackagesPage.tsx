import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PackageCard } from "@/components/commerce/PackageCard";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";

export default function PackagesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <StorePageLayout>
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--hub-blue)]">
            Server Store
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">
            HUBMC Packages
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/66 md:text-lg">
            Choose ranks, coins and premium rewards for your adventure.
          </p>
        </div>

        {loading ? (
          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.6)]" />
            ))}
          </div>
        ) : (
          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <PackageCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </StorePageLayout>
  );
}
