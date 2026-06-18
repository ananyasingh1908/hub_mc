import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import { requireAuth } from "@/lib/auth/route-guard";

const PurchasesPage = lazy(() => import("@/components/PurchasesPage"));

export const Route = createFileRoute("/purchases")({
  component: PurchasesRoute,
  beforeLoad: () => requireAuth("/login"),
  head: () => seoHead({
    title: "My Purchases — HUBMC",
    description: "View your HUBMC purchase history and order details.",
    path: "/purchases",
  }),
});

function PurchasesRoute() {
  return <PurchasesPage />;
}

