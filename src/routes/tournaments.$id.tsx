import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { seoHead } from "@/lib/seo";

const TournamentDetailPage = lazy(() => import("@/components/TournamentDetailPage"));

export const Route = createFileRoute("/tournaments/$id")({
  component: TournamentDetailRoute,
  errorComponent: RouteErrorBoundary,
  head: () => seoHead({
    title: "Tournament Details — HUBMC Minecraft PvP Events",
    description: "View HUBMC tournament details including brackets, leaderboard, rules, and registration. Compete in Minecraft PvP events for prizes.",
    path: "/tournaments",
  }),
});

function TournamentDetailRoute() {
  const { id } = Route.useParams();
  return <TournamentDetailPage tournamentId={id} />;
}

