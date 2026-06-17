import { createFileRoute } from "@tanstack/react-router";
import TournamentDetailPage from "@/components/TournamentDetailPage";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

export const Route = createFileRoute("/tournaments/$id")({
  component: TournamentDetailRoute,
  errorComponent: RouteErrorBoundary,
  head: () => ({
    meta: [
      { title: "Tournament Details - HUBMC" },
      { name: "description", content: "View HUBMC tournament details, brackets, leaderboard, and register to compete." },
    ],
  }),
});

function TournamentDetailRoute() {
  const { id } = Route.useParams();
  return <TournamentDetailPage tournamentId={id} />;
}
