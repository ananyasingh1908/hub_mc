import { useMemo, useState, useEffect, useCallback } from "react";
import { ExternalLink, MessageSquare, Server } from "lucide-react";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { OrderSummaryCard } from "@/components/commerce/OrderSummaryCard";
import { buildCartLines, calculateOrderSummary } from "@/lib/commerce/pricing";
import { useCartStore } from "@/store/cart-store";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

const DISCORD_INVITE = "https://discord.gg/CwNVBCuSbj";
const MINECRAFT_IP = "play.hubmc.in";

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productError, setProductError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setAllProducts(d.products ?? []))
      .catch(() => setProductError("Failed to load product details."));
  }, []);

  const lines = useMemo(() => buildCartLines(items, allProducts), [items, allProducts]);
  const summary = useMemo(
    () => calculateOrderSummary(items, appliedCoupon, allProducts),
    [items, appliedCoupon, allProducts],
  );

  const handleDiscordClick = useCallback(() => {
    trackEvent(AnalyticsEvents.DISCORD_CHECKOUT_CLICK, {
      item_count: items.length,
      subtotal: summary.subtotal,
    });
  }, [items.length, summary.subtotal]);

  return (
    <StorePageLayout>
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--hub-blue)]">
            Checkout
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">
            Purchase via Discord
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/66 md:text-lg">
            All purchases are processed manually by HUBMC staff. Join our Discord, contact staff in #staff-chat, and they will assist you.
          </p>
        </div>

        {productError && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
            {productError}
          </div>
        )}

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
              <h2 className="text-2xl font-black text-white">Package Summary</h2>
              <div className="mt-6 space-y-4">
                {lines.map((line) => (
                  <div
                    key={line.product.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {line.product.name}
                      </div>
                      <div className="mt-1 text-sm text-white/56">
                        Qty {line.quantity}
                      </div>
                    </div>
                    <div className="text-right font-semibold text-white">
                      ₹{line.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-[rgba(88,101,242,0.25)] bg-[rgba(88,101,242,0.06)] p-6">
              <div className="flex items-start gap-4">
                <div className="inline-flex rounded-2xl bg-[rgba(88,101,242,0.12)] p-3 text-[#5865F2]">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white">
                    How to Purchase
                  </h2>
                  <ol className="mt-4 space-y-3 text-sm leading-6 text-white/72">
                    <li className="flex items-start gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/20 text-xs font-bold text-[#5865F2]">
                        1
                      </span>
                      <span>
                        Click the <strong className="text-white">"Join Discord"</strong> button below to join the HUBMC server.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/20 text-xs font-bold text-[#5865F2]">
                        2
                      </span>
                      <span>
                        Go to the <strong className="text-white">#staff-chat</strong> channel and mention you'd like to make a purchase.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/20 text-xs font-bold text-[#5865F2]">
                        3
                      </span>
                      <span>
                        Tell the staff your <strong className="text-white">Minecraft username</strong> and which package(s) you want.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/20 text-xs font-bold text-[#5865F2]">
                        4
                      </span>
                      <span>
                        Staff will assist you with payment and deliver the items to your account.
                      </span>
                    </li>
                  </ol>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <a
                      href={DISCORD_INVITE}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleDiscordClick}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5865F2] px-6 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#4752C4]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Join Discord
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[rgba(62,162,255,0.2)] bg-[rgba(62,162,255,0.06)] p-6">
              <div className="flex items-start gap-4">
                <div className="inline-flex rounded-2xl bg-[rgba(62,162,255,0.12)] p-3 text-[var(--hub-blue)]">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    Server Information
                  </h2>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-white/72">
                    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                      <span className="text-white/48">Minecraft Server IP </span>
                      <span className="ml-2 font-mono font-bold text-white select-all">
                        {MINECRAFT_IP}
                      </span>
                    </div>
                    <p>
                      Join the server, then reach out via Discord to complete your purchase. All transactions are handled manually by our staff team.
                    </p>
                  </div>
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
      </section>
    </StorePageLayout>
  );
}
