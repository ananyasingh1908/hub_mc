import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const EmployeeProducts = lazy(() => import("@/components/employee/EmployeeProducts"));

export const Route = createFileRoute("/employee/products")({
  component: EmployeeProductsRoute,
  head: () => noindexHead("Products — HUBMC Staff"),
});

function EmployeeProductsRoute() {
  return <EmployeeProducts />;
}

