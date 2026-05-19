import { createFileRoute } from "@tanstack/react-router";
import AdminPlayers from "@/components/admin/AdminPlayers";

export const Route = createFileRoute("/admin/players")({
  component: AdminPlayersRoute,
});

function AdminPlayersRoute() {
  return <div className="p-6"><AdminPlayers /></div>;
}
