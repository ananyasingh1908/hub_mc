import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { seoHead } from "@/lib/seo";

const TournamentsPage = lazy(() => import("@/components/TournamentsPage"));

export const Route = createFileRoute("/tournaments/")({
  component: TournamentsRoute,
  errorComponent: RouteErrorBoundary,
  head: () => seoHead({
    title: "HUBMC Tournaments — Minecraft PvP Events",
    description: "Browse HUBMC Minecraft tournaments. Compete in PvP events, win prizes, and climb the leaderboard.",
    path: "/tournaments",
  }),
});

function TournamentsRoute() {
  return <TournamentsPage />;
}

