import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PackageCard } from "@/components/commerce/PackageCard";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { ChevronDown } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { productSchema, itemListSchema, breadcrumbSchema } from "@/lib/json-ld";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

const CATEGORIES = ["All Packages", "Ranks", "Coins", "Crates", "Keys", "Cosmetics", "Bundles", "Misc"];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "name-asc", label: "Name: A-Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export default function PackagesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("All Packages");
  const [sort, setSort] = useState<SortValue>("featured");

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        const allProducts = d.products ?? [];
        setProducts(allProducts);
        allProducts.forEach((p: any) => {
          trackEvent(AnalyticsEvents.VIEW_PACKAGE, {
            product_id: p.id,
            product_name: p.name,
            product_category: p.category,
            price: p.price,
          });
        });
      })
      .catch(() => setError("Failed to load packages. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== "All Packages") {
      list = list.filter((p) => p.category === category);
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        list.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "popular":
      case "featured":
      default:
        break;
    }
    return list;
  }, [products, category, sort]);

  const productSchemas = useMemo(() => products.map((p) => productSchema(p)), [products]);

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Packages", url: "/packages" },
  ];

  return (
    <StorePageLayout>
      {!loading && !error && products.length > 0 && (
        <>
          <JsonLd data={itemListSchema(productSchemas)} />
          {products.slice(0, 8).map((p) => (
            <JsonLd key={p.id} data={productSchema(p)} />
          ))}
        </>
      )}
      <JsonLd data={breadcrumbSchema(breadcrumbItems)} />
      <section className="mx-auto max-w-[1200px] px-4 pb-20 pt-16 md:px-6 md:pb-28 md:pt-24">
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

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] pl-4 pr-10 text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-[rgba(62,162,255,0.45)] sm:w-48"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          </div>

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
              className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] pl-4 pr-10 text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-[rgba(62,162,255,0.45)] sm:w-48"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <div key={i} className="h-[360px] animate-pulse rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.6)]" />
            ))}
          </div>
        ) : !error ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product, index) => (
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
        ) : null}
      </section>
    </StorePageLayout>
  );
}
