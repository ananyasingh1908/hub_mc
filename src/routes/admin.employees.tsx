import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const AdminEmployees = lazy(() => import("@/components/admin/AdminEmployees"));

export const Route = createFileRoute("/admin/employees")({
  component: AdminEmployeesRoute,
  head: () => noindexHead("Employees — HUBMC Admin"),
});

function AdminEmployeesRoute() {
  return <AdminEmployees />;
}

