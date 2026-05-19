import { useMemo, useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CreditCard,
  Landmark,
  Mail,
  Smartphone,
  UserRound,
  Wallet,
  IdCard,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { OrderSummaryCard } from "@/components/commerce/OrderSummaryCard";
import { COUNTRIES } from "@/lib/commerce/countries";
import { buildCartLines, calculateOrderSummary } from "@/lib/commerce/pricing";
import { useCartStore } from "@/store/cart-store";
import { useAuthSession } from "@/lib/auth/client";
import type { CheckoutFormValues, PaymentMethod } from "@/lib/commerce/types";

const checkoutSchema = z.object({
  minecraftUsername: z.string().min(3, "Enter your Minecraft username."),
  minecraftUuid: z.string().min(1, "UUID is required."),
  email: z.string().email("Enter a valid email address."),
  country: z.string().min(2, "Choose your country."),
  paymentMethod: z.enum(["card", "upi", "netbanking", "wallet"]),
});

const paymentOptions: {
  id: PaymentMethod;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "card",
    title: "Credit / Debit Card",
    description: "Visa, Mastercard and premium issuer cards",
    icon: CreditCard,
  },
  {
    id: "upi",
    title: "UPI",
    description: "Fast mobile payments for Indian players",
    icon: Smartphone,
  },
  {
    id: "netbanking",
    title: "Net Banking",
    description: "Pay directly from your bank account",
    icon: Landmark,
  },
  {
    id: "wallet",
    title: "Wallets",
    description: "Paytm, PhonePe, Google Pay and more",
    icon: Wallet,
  },
];

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const completeCheckout = useCartStore((state) => state.completeCheckout);
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const { data: session } = useAuthSession();
  const user = session?.user;

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setAllProducts(d.products ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onerror = () => {
        setStatusMessage("Payment system failed to load. Please refresh and try again.");
        toast.error("Payment SDK unavailable", {
          description: "Could not load Razorpay. Check your internet connection.",
        });
      };
      document.body.appendChild(script);
    }
  }, []);

  const lines = useMemo(() => buildCartLines(items, allProducts), [items, allProducts]);
  const summary = useMemo(
    () => calculateOrderSummary(items, appliedCoupon, allProducts),
    [items, appliedCoupon, allProducts],
  );

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      minecraftUsername: user?.minecraftUsername ?? "",
      minecraftUuid: user?.minecraftUuid ?? "",
      email: "",
      country: "",
      paymentMethod: "card",
    },
  });

  useEffect(() => {
    if (user?.minecraftUsername) {
      setValue("minecraftUsername", user.minecraftUsername);
    }
    if (user?.minecraftUuid) {
      setValue("minecraftUuid", user.minecraftUuid);
    }
  }, [user, setValue]);

  const selectedPayment = watch("paymentMethod");

  const handlePayment = useCallback(async (values: CheckoutFormValues) => {
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const orderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minecraftUsername: values.minecraftUsername,
          minecraftUuid: values.minecraftUuid,
          email: values.email,
          country: values.country,
          paymentMethod: values.paymentMethod,
          couponCode: appliedCoupon?.code ?? null,
          items: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initiate checkout.");
      }

      const data = await orderResponse.json();

      const options = {
        key: data.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        name: "HUBMC",
        description: `Order for ${values.minecraftUsername}`,
        order_id: data.razorpayOrderId,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          if (!verifyRes.ok) {
            const errData = await verifyRes.json().catch(() => ({}));
            throw new Error(errData.error || "Payment verification failed.");
          }

          const verifyData = await verifyRes.json();
          completeCheckout(values);
          toast.success("Payment successful!", {
            description: "Your order is being processed.",
          });
          await navigate({ to: "/payment-success", search: { orderId: verifyData.orderId } });
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            setStatusMessage("Payment was cancelled.");
          },
        },
        prefill: {
          email: values.email,
          contact: "",
        },
        theme: { color: "#ff8a2a" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setIsSubmitting(false);
        setStatusMessage(response.error.description || "Payment failed.");
        toast.error("Payment failed", {
          description: response.error.description || "Something went wrong.",
        });
      });
      rzp.open();
    } catch (error) {
      setIsSubmitting(false);
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setStatusMessage(message);
      toast.error("Checkout failed", {
        description: message,
      });
    }
  }, [appliedCoupon, completeCheckout, lines, navigate]);

  const onSubmit = handleSubmit(handlePayment);

  return (
    <StorePageLayout>
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--hub-blue)]">
            Checkout
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">
            Secure Your Rewards
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/66 md:text-lg">
            Confirm your Minecraft account, choose a payment method, and finish your premium HUBMC order.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={onSubmit} className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
              <h2 className="text-2xl font-black text-white">Player Details</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 inline-flex items-center gap-2 text-sm text-white/68">
                    <UserRound className="h-4 w-4 text-[var(--hub-blue)]" />
                    Minecraft Username
                  </span>
                  <input
                    {...register("minecraftUsername")}
                    readOnly
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white/80 outline-none cursor-not-allowed"
                  />
                  {errors.minecraftUsername ? (
                    <span className="mt-2 block text-sm text-[var(--hub-orange)]">
                      {errors.minecraftUsername.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 inline-flex items-center gap-2 text-sm text-white/68">
                    <IdCard className="h-4 w-4 text-[var(--hub-blue)]" />
                    Minecraft UUID
                  </span>
                  <input
                    {...register("minecraftUuid")}
                    readOnly
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white/60 outline-none cursor-not-allowed font-mono"
                  />
                  {errors.minecraftUuid ? (
                    <span className="mt-2 block text-sm text-[var(--hub-orange)]">
                      {errors.minecraftUuid.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 inline-flex items-center gap-2 text-sm text-white/68">
                    <Mail className="h-4 w-4 text-[var(--hub-blue)]" />
                    Email
                  </span>
                  <input
                    {...register("email")}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors focus:border-[rgba(62,162,255,0.45)]"
                  />
                  {errors.email ? (
                    <span className="mt-2 block text-sm text-[var(--hub-orange)]">
                      {errors.email.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 inline-flex items-center gap-2 text-sm text-white/68">
                    <Landmark className="h-4 w-4 text-[var(--hub-blue)]" />
                    Country
                  </span>
                  <select
                    {...register("country")}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors focus:border-[rgba(62,162,255,0.45)]"
                  >
                    <option value="" disabled className="bg-[#111] text-white/60">
                      Select your country
                    </option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country} className="bg-[#111] text-white">
                        {country}
                      </option>
                    ))}
                  </select>
                  {errors.country ? (
                    <span className="mt-2 block text-sm text-[var(--hub-orange)]">
                      {errors.country.message}
                    </span>
                  ) : null}
                </label>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
              <h2 className="text-2xl font-black text-white">Payment Method</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = selectedPayment === option.id;

                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setValue("paymentMethod", option.id, { shouldValidate: true })}
                      className={`rounded-[24px] border p-5 text-left transition-all duration-300 ${
                        selected
                          ? "border-[rgba(62,162,255,0.45)] bg-[rgba(62,162,255,0.12)] shadow-[0_20px_60px_-30px_rgba(62,162,255,0.75)]"
                          : "border-white/10 bg-white/[0.03] hover:border-[rgba(255,138,42,0.28)] hover:bg-[rgba(255,138,42,0.08)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex rounded-2xl bg-black/35 p-3 text-[var(--hub-blue)]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="mt-4 text-lg font-black text-white">
                            {option.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-white/60">
                            {option.description}
                          </p>
                        </div>
                        <div
                          className={`mt-1 h-4 w-4 rounded-full border ${
                            selected
                              ? "border-[var(--hub-orange)] bg-[var(--hub-orange)]"
                              : "border-white/30"
                          }`}
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
              <h2 className="text-2xl font-black text-white">Order Summary</h2>
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

            {statusMessage ? (
              <div className="rounded-2xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4 text-sm text-red-300">
                {statusMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || lines.length === 0}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-300 ${
                isSubmitting || lines.length === 0
                  ? "cursor-not-allowed bg-white/8 text-white/35"
                  : "bg-[var(--hub-orange)] text-black hover:-translate-y-0.5 hover:bg-[#ff9a46]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Continue to Payment — ₹{summary.total.toFixed(2)}
                </>
              )}
            </button>
          </form>

          <OrderSummaryCard
            sticky
            ctaLabel={`Final Total: ₹${summary.total.toFixed(2)}`}
            ctaDisabled
            allProducts={allProducts}
          />
        </div>
      </section>
    </StorePageLayout>
  );
}
