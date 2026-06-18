import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const AdminPlayers = lazy(() => import("@/components/admin/AdminPlayers"));

export const Route = createFileRoute("/admin/players")({
  component: AdminPlayersRoute,
  head: () => noindexHead("Players — HUBMC Admin"),
});

function AdminPlayersRoute() {
  return <AdminPlayers />;
}

