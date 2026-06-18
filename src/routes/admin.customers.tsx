import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const AdminCustomers = lazy(() => import("@/components/admin/AdminCustomers"));

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomersRoute,
  head: () => noindexHead("Customers — HUBMC Admin"),
});

function AdminCustomersRoute() {
  return <AdminCustomers />;
}

