import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const EmployeeSupport = lazy(() => import("@/components/employee/EmployeeSupport"));

export const Route = createFileRoute("/employee/support")({
  component: EmployeeSupportRoute,
  head: () => noindexHead("Support — HUBMC Staff"),
});

function EmployeeSupportRoute() {
  return <EmployeeSupport />;
}

