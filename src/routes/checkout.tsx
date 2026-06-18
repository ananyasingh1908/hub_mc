import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { seoHead } from "@/lib/seo";
import { requireAuth } from "@/lib/auth/route-guard";

const CheckoutPage = lazy(() => import("@/components/CheckoutPage"));

export const Route = createFileRoute("/checkout")({
  component: CheckoutRoute,
  beforeLoad: () => requireAuth("/login"),
  errorComponent: RouteErrorBoundary,
  head: () => seoHead({
    title: "Checkout — HUBMC Store",
    description: "Purchase HUBMC packages via Discord — join our server and create a ticket to complete your order.",
    path: "/checkout",
  }),
});

function CheckoutRoute() {
  return <CheckoutPage />;
}

