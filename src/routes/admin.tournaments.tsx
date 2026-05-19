import { createFileRoute } from "@tanstack/react-router";
import AdminTournaments from "@/components/admin/AdminTournaments";

export const Route = createFileRoute("/admin/tournaments")({
  component: AdminTournamentsRoute,
});

function AdminTournamentsRoute() {
  return (
    <div className="p-6">
      <AdminTournaments />
    </div>
  );
}
