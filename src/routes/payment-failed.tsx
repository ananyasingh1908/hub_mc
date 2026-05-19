import { createFileRoute } from "@tanstack/react-router";
import PaymentFailedPage from "@/components/PaymentFailedPage";

export const Route = createFileRoute("/payment-failed")({
  component: PaymentFailedRoute,
  head: () => ({
    meta: [
      { title: "Payment Failed - HUBMC" },
      {
        name: "description",
        content: "Your HUBMC payment did not go through. Please try again.",
      },
    ],
  }),
});

function PaymentFailedRoute() {
  return <PaymentFailedPage />;
}
