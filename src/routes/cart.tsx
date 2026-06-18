import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { seoHead } from "@/lib/seo";
import { requireAuth } from "@/lib/auth/route-guard";

const CartPage = lazy(() => import("@/components/CartPage"));

export const Route = createFileRoute("/cart")({
  component: CartRoute,
  beforeLoad: () => requireAuth("/login"),
  errorComponent: RouteErrorBoundary,
  head: () => seoHead({
    title: "Cart — HUBMC Store",
    description: "Review your HUBMC cart and proceed to checkout.",
    path: "/cart",
  }),
});

function CartRoute() {
  return <CartPage />;
}

