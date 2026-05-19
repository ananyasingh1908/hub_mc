import { createFileRoute } from "@tanstack/react-router";
import CheckoutPage from "@/components/CheckoutPage";
import { requireAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/checkout")({
  beforeLoad: requireAuth,
  component: CheckoutRoute,
  head: () => ({
    meta: [
      { title: "HUBMC Checkout" },
      {
        name: "description",
        content:
          "Complete your HUBMC Minecraft server store order and choose a payment method.",
      },
    ],
  }),
});

function CheckoutRoute() {
  return <CheckoutPage />;
}
