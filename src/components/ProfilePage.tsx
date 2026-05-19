import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck, CreditCard, Headset, LoaderCircle, Pickaxe, ShieldCheck,
  Package, ShoppingCart, Trophy, Download, RefreshCw,
} from "lucide-react";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { useAuthSession } from "@/lib/auth/client";

type ProfileData = {
  minecraftUsername: string;
  minecraftUuid: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  ownedPackages: Array<{ name: string; quantity: number; lastPurchased: string }>;
  recentOrders: Array<{
    id: string; orderNumber: string; total: number;
    status: string; deliveryStatus: string;
    createdAt: string; items: string[];
  }>;
};

export default function ProfilePage() {
  const { data: session, isPending: authLoading } = useAuthSession();
  const user = session?.user;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.minecraftUsername) return;
    setLoading(true);
    fetch("/api/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfile(d.profile);
        else setError(d.error || "Failed to load profile");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [user?.minecraftUsername]);

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      PAID: { color: "bg-blue-500/15 text-blue-400", label: "Paid" },
      FULFILLED: { color: "bg-green-500/15 text-green-400", label: "Delivered" },
      REFUNDED: { color: "bg-red-500/15 text-red-400", label: "Refunded" },
      FAILED: { color: "bg-red-500/15 text-red-400", label: "Failed" },
      PENDING: { color: "bg-yellow-500/15 text-yellow-400", label: "Pending" },
    };
    const s = map[status] || map.PENDING;
    return <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${s.color}`}>{s.label}</span>;
  };

  const downloadInvoice = (orderId: string) => {
    window.open(`/api/orders/invoice?orderId=${orderId}`, "_blank");
  };

  return (
    <StorePageLayout>
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--hub-blue)]">
            Player Dashboard
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">
            My Profile
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/66 md:text-lg">
            Manage your purchases, packages, and player details.
          </p>
        </div>

        {authLoading ? (
          <div className="mt-14 flex min-h-64 items-center justify-center rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)]">
            <div className="flex items-center gap-3 text-white/68">
              <LoaderCircle className="h-5 w-5 animate-spin text-[var(--hub-blue)]" />
              Loading...
            </div>
          </div>
        ) : !user?.minecraftUsername ? (
          <div className="mt-14 rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 text-center">
            <div className="mx-auto inline-flex rounded-3xl bg-[rgba(62,162,255,0.12)] p-4 text-[var(--hub-blue)]">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-3xl font-black text-white">Login required</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/64">
              Sign in with your Minecraft username to view your profile.
            </p>
            <div className="mt-8">
              <Link to="/login"
                className="inline-flex h-12 items-center rounded-2xl bg-orange-500 px-6 text-sm font-semibold text-black opacity-100 hover:bg-orange-400"
              >
                Go to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Profile Header */}
              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(8,8,8,0.96))] p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-5">
                    <div className="flex h-24 w-24 overflow-hidden rounded-[24px] border border-[rgba(62,162,255,0.22)] bg-black/70">
                      <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                        {user.minecraftUsername?.slice(0, 1).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,138,42,0.25)] bg-[rgba(255,138,42,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--hub-orange)]">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Registered Player
                      </div>
                      <h2 className="mt-4 text-3xl font-black text-white">
                        {user.minecraftUsername}
                      </h2>
                      {user.minecraftUuid && (
                        <p className="mt-2 text-sm text-white/56">
                          UUID: {user.minecraftUuid}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm">
                    <div className="font-semibold text-white">Spending Summary</div>
                    <div className="mt-2 text-2xl font-black text-[var(--hub-orange)]">
                      ₹{profile?.totalSpent?.toLocaleString("en-IN") || "0"}
                    </div>
                    <div className="mt-1 text-xs text-white/40">total spent across {profile?.totalOrders || 0} orders</div>
                  </div>
                </div>
              </div>

              {/* Owned Packages */}
              <div className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[rgba(62,162,255,0.12)] p-3 text-[var(--hub-blue)]">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Owned Packages</h3>
                    <p className="mt-1 text-sm text-white/60">
                      Ranks, coins, and rewards purchased on your account.
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="mt-6 flex items-center gap-2 text-sm text-white/40">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Loading packages...
                  </div>
                ) : error ? (
                  <div className="mt-6 text-sm text-red-400">{error}</div>
                ) : !profile?.ownedPackages?.length ? (
                  <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-white/66">
                    No packages owned yet. <Link to="/packages" className="text-[var(--hub-blue)] hover:underline">Browse the store</Link> to purchase ranks and rewards.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {profile.ownedPackages.map((pkg, i) => (
                      <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{pkg.name}</span>
                          <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-xs font-bold text-[var(--hub-orange)]">x{pkg.quantity}</span>
                        </div>
                        <p className="mt-2 text-xs text-white/40">
                          Last: {new Date(pkg.lastPurchased).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Orders */}
              <div className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[rgba(255,138,42,0.12)] p-3 text-[var(--hub-orange)]">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Purchase History</h3>
                    <p className="mt-1 text-sm text-white/60">
                      Recent orders and delivery status.
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="mt-6 flex items-center gap-2 text-sm text-white/40">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Loading orders...
                  </div>
                ) : !profile?.recentOrders?.length ? (
                  <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-white/66">
                    No orders yet. Your completed purchases will appear here.
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {profile.recentOrders.map((order) => (
                      <div key={order.id}
                        className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{order.orderNumber}</span>
                              {statusBadge(order.status)}
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                order.deliveryStatus === "DELIVERED" ? "bg-green-500/15 text-green-400"
                                : order.deliveryStatus === "FAILED" ? "bg-red-500/15 text-red-400"
                                : order.deliveryStatus === "PROCESSING" ? "bg-blue-500/15 text-blue-400"
                                : "bg-yellow-500/15 text-yellow-400"
                              }`}>{order.deliveryStatus}</span>
                            </div>
                            <p className="mt-1 text-xs text-white/40">
                              {order.items.join(", ")} &middot; {new Date(order.createdAt).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-white">₹{order.total.toFixed(2)}</span>
                            <button onClick={() => downloadInvoice(order.id)}
                              className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-[var(--hub-blue)]"
                              title="Download Invoice"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <Link to="/purchases" className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white" title="View Details">
                              →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Link to="/purchases"
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-black opacity-100 hover:bg-orange-400"
                >
                  <ShoppingCart className="h-4 w-4" /> All Orders
                </Link>
                <Link to="/packages"
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/70 hover:bg-white/5"
                >
                  <Package className="h-4 w-4" /> Browse Store
                </Link>
              </div>
            </motion.section>

            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
                <h3 className="text-xl font-black text-white">Player Snapshot</h3>
                <div className="mt-6 space-y-4">
                  {[
                    { icon: Pickaxe, label: "Minecraft Username", value: user.minecraftUsername },
                    { icon: BadgeCheck, label: "UUID", value: user.minecraftUuid },
                    { icon: CreditCard, label: "Total Orders", value: String(profile?.totalOrders || 0) },
                    { icon: Trophy, label: "Total Spent", value: `₹${(profile?.totalSpent || 0).toLocaleString("en-IN")}` },
                  ].map((detail) => {
                    const Icon = detail.icon;
                    return (
                      <div key={detail.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="inline-flex rounded-2xl bg-black/50 p-2 text-[var(--hub-blue)]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/42">
                          {detail.label}
                        </div>
                        <div className="mt-2 break-all text-sm leading-6 text-white/78">
                          {detail.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
                <h3 className="text-xl font-black text-white">Quick Links</h3>
                <div className="mt-6 space-y-3">
                  <Link to="/packages"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-semibold text-black opacity-100 hover:bg-orange-400"
                  >
                    <Package className="h-4 w-4" /> Browse Packages
                  </Link>
                  <Link to="/purchases"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(62,162,255,0.28)] bg-[rgba(62,162,255,0.08)] text-sm font-semibold text-white hover:bg-[rgba(62,162,255,0.16)]"
                  >
                    <ShoppingCart className="h-4 w-4" /> View Purchases
                  </Link>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </section>
    </StorePageLayout>
  );
}
