import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/tournaments")({
  component: TournamentsLayout,
  errorComponent: RouteErrorBoundary,
  head: () => seoHead({
    title: "HUBMC Tournaments — Minecraft PvP Events",
    description: "Browse HUBMC Minecraft tournaments. Compete in PvP events, win prizes, and climb the leaderboard.",
    path: "/tournaments",
  }),
});

function TournamentsLayout() {
  return (
    <StorePageLayout>
      <Outlet />
    </StorePageLayout>
  );
}

