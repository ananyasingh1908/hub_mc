import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle, Home, ShoppingBag, Truck, Clock } from "lucide-react";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/payment-success" });
  const [orderId, setOrderId] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<string>("PROCESSING");

  useEffect(() => {
    const params = search as { orderId?: string };
    if (params.orderId) {
      setOrderId(params.orderId);
    }
  }, [search]);

  useEffect(() => {
    if (!orderId) return;
    const timer = setTimeout(() => {
      setDeliveryStatus("DELIVERED");
    }, 4000);
    return () => clearTimeout(timer);
  }, [orderId]);

  const isDelivered = deliveryStatus === "DELIVERED";

  return (
    <StorePageLayout>
      <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[rgba(34,197,94,0.15)]"
          >
            <CheckCircle className="h-12 w-12 text-green-500" />
          </motion.div>

          <h1 className="mt-8 text-5xl font-black tracking-tight text-white md:text-6xl">
            Payment Successful!
          </h1>
          <p className="mt-4 text-lg leading-8 text-white/66">
            Your order has been confirmed and your rewards are on their way.
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-white/56">Status</span>
                <span className="flex items-center gap-2 text-sm font-semibold text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  Paid
                </span>
              </div>
              {orderId && (
                <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-white/56">Order ID</span>
                  <span className="font-mono text-sm text-white/82">{orderId}</span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-white/56">Delivery</span>
                <span className={`flex items-center gap-2 text-sm font-semibold ${isDelivered ? "text-green-400" : "text-blue-400"}`}>
                  {isDelivered ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Delivered
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4 animate-pulse" />
                      Processing
                    </>
                  )}
                </span>
              </div>
            </div>

            {!isDelivered && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[rgba(59,130,246,0.08)] px-4 py-3 text-sm text-blue-300">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Your items are being delivered to your Minecraft account. This usually takes a few seconds.</span>
              </div>
            )}
          </div>

          <p className="mt-6 text-sm text-white/48">
            Your items will be available in-game shortly. Check your purchases page for delivery status.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate({ to: "/purchases" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/[0.1] sm:w-auto"
            >
              <ShoppingBag className="h-4 w-4" />
              View Purchases
            </button>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--hub-orange)] px-6 py-4 text-sm font-semibold text-black transition-all duration-300 hover:bg-[#ff9a46] sm:w-auto"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          </div>
        </motion.div>
      </section>
    </StorePageLayout>
  );
}
