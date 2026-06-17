import { createFileRoute } from "@tanstack/react-router";
import CheckoutPage from "@/components/CheckoutPage";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

export const Route = createFileRoute("/checkout")({
  component: CheckoutRoute,
  errorComponent: RouteErrorBoundary,
  head: () => ({
    meta: [
      { title: "HUBMC Checkout" },
      {
        name: "description",
        content:
          "Purchase HUBMC packages via Discord — join our server and create a ticket.",
      },
    ],
  }),
});

function CheckoutRoute() {
  return <CheckoutPage />;
}
