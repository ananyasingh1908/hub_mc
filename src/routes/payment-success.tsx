import { createFileRoute } from "@tanstack/react-router";
import PaymentSuccessPage from "@/components/PaymentSuccessPage";

export const Route = createFileRoute("/payment-success")({
  component: PaymentSuccessRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: search.orderId as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payment Successful - HUBMC" },
      {
        name: "description",
        content: "Your HUBMC payment was successful. Your rewards are being processed.",
      },
    ],
  }),
});

function PaymentSuccessRoute() {
  return <PaymentSuccessPage />;
}
