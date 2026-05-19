import { createFileRoute } from "@tanstack/react-router";
import CartPage from "@/components/CartPage";

export const Route = createFileRoute("/cart")({
  component: CartRoute,
  head: () => ({
    meta: [
      { title: "HUBMC Cart" },
      {
        name: "description",
        content: "Review your HUBMC packages, coupons, and order summary.",
      },
    ],
  }),
});

function CartRoute() {
  return <CartPage />;
}
