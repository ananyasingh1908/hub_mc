import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const AdminDelivery = lazy(() => import("@/components/admin/AdminDelivery"));

export const Route = createFileRoute("/admin/delivery")({
  component: AdminDeliveryRoute,
  head: () => noindexHead("Delivery — HUBMC Admin"),
});

function AdminDeliveryRoute() {
  return <AdminDelivery />;
}

