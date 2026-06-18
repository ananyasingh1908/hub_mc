import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const AdminTournaments = lazy(() => import("@/components/admin/AdminTournaments"));

export const Route = createFileRoute("/admin/tournaments")({
  component: AdminTournamentsRoute,
  head: () => noindexHead("Tournaments — HUBMC Admin"),
});

function AdminTournamentsRoute() {
  return (
    <div className="p-6">
      <AdminTournaments />
    </div>
  );
}

