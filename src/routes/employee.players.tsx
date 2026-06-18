import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const EmployeePlayers = lazy(() => import("@/components/employee/EmployeePlayers"));

export const Route = createFileRoute("/employee/players")({
  component: EmployeePlayersRoute,
  head: () => noindexHead("Players — HUBMC Staff"),
});

function EmployeePlayersRoute() {
  return <EmployeePlayers />;
}

