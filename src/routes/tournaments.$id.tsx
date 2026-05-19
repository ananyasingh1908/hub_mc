import { createFileRoute } from "@tanstack/react-router";
import TournamentDetailPage from "@/components/TournamentDetailPage";

export const Route = createFileRoute("/tournaments/$id")({
  component: TournamentDetailRoute,
});

function TournamentDetailRoute() {
  const { id } = Route.useParams();
  return <TournamentDetailPage tournamentId={id} />;
}
