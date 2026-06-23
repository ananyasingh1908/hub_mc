import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { seoHead } from "@/lib/seo";

const TournamentsPage = lazy(() => import("@/components/TournamentsPage"));

export const Route = createFileRoute("/tournaments/")({
  component: TournamentsRoute,
  errorComponent: RouteErrorBoundary,
  head: () => seoHead({
    title: "HUBMC Tournaments — Minecraft PvP Events, Prizes & Live Brackets",
    description: "Browse HUBMC Minecraft tournaments. Compete in PvP events like Bedwars, Skywars, and KitPvP. Free and paid entry tournaments with prize pools, live brackets, and real-time leaderboards.",
    path: "/tournaments",
  }),
});

function TournamentsRoute() {
  return <TournamentsPage />;
}

