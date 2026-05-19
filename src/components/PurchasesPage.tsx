import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  PackageOpen,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Download,
} from "lucide-react";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { useAuthSession } from "@/lib/auth/client";
import type { DeliveryStatusType } from "@/lib/commerce/types";
import { toast } from "sonner";

type OrderItem = {
  product: { id: string; name: string; price: number; image: string | null };
  quantity: number;
  subtotal: number;
};

type OrderDisplay = {
  id: string;
  orderNumber: string;
  createdAt: string;
  minecraftUsername: string;
  minecraftUuid: string;
  items: OrderItem[];
  total: number;
  paymentStatus: string;
  deliveryStatus: DeliveryStatusType;
  deliveredAt: string | null;
  razorpayPaymentId: string | null;
  refundedAt: string | null;
  refundReason: string | null;
};

const deliveryStatusConfig: Record<DeliveryStatusType, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending", color: "text-yellow-400", bg: "bg-[rgba(234,179,8,0.12)]", icon: Clock },
  PROCESSING: { label: "Processing", color: "text-blue-400", bg: "bg-[rgba(59,130,246,0.12)]", icon: Truck },
  DELIVERED: { label: "Delivered", color: "text-green-400", bg: "bg-[rgba(34,197,94,0.12)]", icon: CheckCircle2 },
  FAILED: { label: "Failed", color: "text-red-400", bg: "bg-[rgba(239,68,68,0.12)]", icon: XCircle },
  AWAITING_SERVER: { label: "Awaiting Server", color: "text-orange-400", bg: "bg-[rgba(255,138,42,0.12)]", icon: Clock },
};

const paymentStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: "Paid", color: "text-green-400", bg: "bg-[rgba(34,197,94,0.12)]" },
  PENDING: { label: "Pending", color: "text-yellow-400", bg: "bg-[rgba(234,179,8,0.12)]" },
  FAILED: { label: "Failed", color: "text-red-400", bg: "bg-[rgba(239,68,68,0.12)]" },
  REFUNDED: { label: "Refunded", color: "text-orange-400", bg: "bg-[rgba(255,138,42,0.12)]" },
};

export default function PurchasesPage() {
  const navigate = useNavigate();
  const { data: session } = useAuthSession();
  const user = session?.user;
  const [orders, setOrders] = useState<OrderDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [retryingOrder, setRetryingOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        credentials: "include",
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      toast.error("Failed to load orders", {
        description: "Could not fetch your purchase history.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.minecraftUsername) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user, fetchOrders]);

  const handleRetryDelivery = async (orderId: string) => {
    setRetryingOrder(orderId);
    try {
      const res = await fetch("/api/delivery/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) throw new Error("Retry failed");
      const data = await res.json();
      if (data.ok) {
        toast.success("Delivery retry initiated", {
          description: "Your items are being delivered again.",
        });
        fetchOrders();
      } else {
        toast.error(data.error || "Retry failed");
      }
    } catch {
      toast.error("Retry failed", {
        description: "Could not retry delivery. Please contact support.",
      });
    } finally {
      setRetryingOrder(null);
    }
  };

  const downloadInvoice = (orderId: string) => {
    window.open(`/api/orders/invoice?orderId=${orderId}`, "_blank");
  };

  if (!user?.minecraftUsername) {
    return (
      <StorePageLayout>
        <section className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-6 pb-20 pt-16">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
            <h2 className="mt-6 text-2xl font-black text-white">Sign in to view your purchases</h2>
            <p className="mt-3 text-white/56">Connect your Minecraft account to see your order history.</p>
            <button
              onClick={() => navigate({ to: "/login" })}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--hub-orange)] px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-[#ff9a46]"
            >
              Sign In
            </button>
          </div>
        </section>
      </StorePageLayout>
    );
  }

  return (
    <StorePageLayout>
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--hub-blue)]">
              Account
            </p>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-6xl">
              My Purchases
            </h1>
            <p className="mt-3 text-base text-white/56">
              {orders.length > 0
                ? `${orders.length} order${orders.length !== 1 ? "s" : ""} found`
                : "Your purchase history will appear here."}
            </p>
          </div>
          {orders.length > 0 && (
            <button
              onClick={fetchOrders}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/70 transition-all hover:bg-white/[0.1]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-12 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.6)]"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 text-center"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(62,162,255,0.1)]">
              <PackageOpen className="h-10 w-10 text-[var(--hub-blue)]" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-white">No purchases yet</h2>
            <p className="mt-3 text-white/56">
              Once you complete a purchase, your orders and delivery status will show here.
            </p>
            <button
              onClick={() => navigate({ to: "/packages" })}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--hub-orange)] px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-[#ff9a46]"
            >
              Browse Packages
            </button>
          </motion.div>
        ) : (
          <div className="mt-12 space-y-4">
            {orders.map((order, index) => {
              const deliveryCfg = deliveryStatusConfig[order.deliveryStatus] ?? deliveryStatusConfig.PENDING;
              const paymentCfg = paymentStatusConfig[order.paymentStatus] ?? paymentStatusConfig.PENDING;
              const DeliveryIcon = deliveryCfg.icon;
              const isExpanded = expandedOrder === order.id;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)]"
                >
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${deliveryCfg.bg}`}>
                      <DeliveryIcon className={`h-6 w-6 ${deliveryCfg.color}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">
                        {order.items.map((item) => `${item.quantity}x ${item.product.name}`).join(", ")}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/48">
                        <span>{new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                        <span className="font-mono">{order.orderNumber}</span>
                        <span>₹{Number(order.total).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="hidden items-center gap-3 sm:flex">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${paymentCfg.bg} ${paymentCfg.color}`}>
                        {paymentCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${deliveryCfg.bg} ${deliveryCfg.color}`}>
                        {deliveryCfg.label}
                      </span>
                    </div>

                    <div className="shrink-0 text-white/30">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 px-5 pb-5 pt-4"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Order Info</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white/48">Order ID</span>
                              <span className="font-mono text-white/70">{order.id}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-white/48">Order #</span>
                              <span className="font-mono text-white/70">{order.orderNumber}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-white/48">Date</span>
                              <span className="text-white/70">{new Date(order.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-white/48">Total</span>
                              <span className="font-semibold text-white">₹{Number(order.total).toFixed(2)}</span>
                            </div>
                            {order.razorpayPaymentId && (
                              <div className="flex justify-between text-sm">
                                <span className="text-white/48">Payment ID</span>
                                <span className="font-mono text-xs text-white/50">{order.razorpayPaymentId}</span>
                              </div>
                            )}
                            {order.refundedAt && (
                              <div className="flex justify-between text-sm">
                                <span className="text-white/48">Refund Reason</span>
                                <span className="text-white/70">{order.refundReason ?? "N/A"}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Delivery</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white/48">Status</span>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${deliveryCfg.bg} ${deliveryCfg.color}`}>
                                <DeliveryIcon className="h-3 w-3" />
                                {deliveryCfg.label}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-white/48">Payment</span>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentCfg.bg} ${paymentCfg.color}`}>
                                {paymentCfg.label}
                              </span>
                            </div>
                            {order.deliveredAt && (
                              <div className="flex justify-between text-sm">
                                <span className="text-white/48">Delivered At</span>
                                <span className="text-white/70">{new Date(order.deliveredAt).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Packages</h4>
                        <div className="space-y-2">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
                              {item.product.image && (
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                                  <img
                                    src={item.product.image}
                                    alt={item.product.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-white">{item.product.name}</div>
                                <div className="text-xs text-white/48">Qty {item.quantity}</div>
                              </div>
                              <div className="text-sm text-white/70">₹{Number(item.subtotal).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadInvoice(order.id); }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white/70 transition-all hover:bg-white/[0.1]"
                        >
                          <Download className="h-4 w-4" />
                          Invoice
                        </button>
                        {(order.deliveryStatus === "FAILED" || order.deliveryStatus === "AWAITING_SERVER") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryDelivery(order.id);
                            }}
                            disabled={retryingOrder === order.id}
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-sm font-medium text-red-300 transition-all hover:bg-[rgba(239,68,68,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {retryingOrder === order.id ? (
                              <>
                                <RotateCcw className="h-4 w-4 animate-spin" />
                                Retrying...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4" />
                                {order.deliveryStatus === "AWAITING_SERVER" ? "Resend to Server" : "Retry Delivery"}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </StorePageLayout>
  );
}
