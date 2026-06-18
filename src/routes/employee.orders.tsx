import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const EmployeeOrders = lazy(() => import("@/components/employee/EmployeeOrders"));

export const Route = createFileRoute("/employee/orders")({
  component: EmployeeOrdersRoute,
  head: () => noindexHead("Orders — HUBMC Staff"),
});

function EmployeeOrdersRoute() {
  return <EmployeeOrders />;
}

