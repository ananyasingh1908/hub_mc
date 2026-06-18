import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const EmployeeTournaments = lazy(() => import("@/components/employee/EmployeeTournaments"));

export const Route = createFileRoute("/employee/tournaments")({
  component: EmployeeTournamentsRoute,
  head: () => noindexHead("Tournaments — HUBMC Staff"),
});

function EmployeeTournamentsRoute() {
  return <EmployeeTournaments />;
}

