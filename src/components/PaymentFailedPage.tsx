import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { XCircle, RefreshCcw, ShoppingCart } from "lucide-react";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";

export default function PaymentFailedPage() {
  const navigate = useNavigate();

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
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[rgba(239,68,68,0.15)]"
          >
            <XCircle className="h-12 w-12 text-red-500" />
          </motion.div>

          <h1 className="mt-8 text-5xl font-black tracking-tight text-white md:text-6xl">
            Payment Failed
          </h1>
          <p className="mt-4 text-lg leading-8 text-white/66">
            The payment was not completed. Your cart has been preserved so you can try again.
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-white/56">Status</span>
                <span className="flex items-center gap-2 text-sm font-semibold text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Failed
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/48">
              This could be due to insufficient funds, a declined transaction, or a
              temporary issue with your payment method. No charges have been made.
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate({ to: "/checkout" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/[0.1] sm:w-auto"
            >
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </button>
            <button
              onClick={() => navigate({ to: "/cart" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--hub-orange)] px-6 py-4 text-sm font-semibold text-black transition-all duration-300 hover:bg-[#ff9a46] sm:w-auto"
            >
              <ShoppingCart className="h-4 w-4" />
              Back to Cart
            </button>
          </div>
        </motion.div>
      </section>
    </StorePageLayout>
  );
}
