import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const EmployeeForum = lazy(() => import("@/components/employee/EmployeeForum"));

export const Route = createFileRoute("/employee/forum")({
  component: EmployeeForumRoute,
  head: () => noindexHead("Forum — HUBMC Staff"),
});

function EmployeeForumRoute() {
  return <EmployeeForum />;
}
