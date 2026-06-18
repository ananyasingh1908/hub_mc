import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const EmployeeDashboard = lazy(() => import("@/components/employee/EmployeeDashboard"));

export const Route = createFileRoute("/employee/")({
  component: EmployeeDashboardPage,
  head: () => noindexHead("Dashboard — HUBMC Staff"),
});

function EmployeeDashboardPage() {
  return <EmployeeDashboard />;
}

