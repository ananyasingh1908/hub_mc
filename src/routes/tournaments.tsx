import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";

export const Route = createFileRoute("/tournaments")({
  component: TournamentsLayout,
  errorComponent: RouteErrorBoundary,
  head: () => ({
    meta: [
      { title: "HUBMC Tournaments" },
      { name: "description", content: "Browse HUBMC Minecraft tournaments. Compete in PvP events, win prizes, and climb the leaderboard." },
    ],
  }),
});

function TournamentsLayout() {
  return (
    <StorePageLayout>
      <Outlet />
    </StorePageLayout>
  );
}
