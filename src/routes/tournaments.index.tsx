import { createFileRoute } from "@tanstack/react-router";
import TournamentsPage from "@/components/TournamentsPage";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

export const Route = createFileRoute("/tournaments/")({
  component: TournamentsPageRoute,
  errorComponent: RouteErrorBoundary,
});

function TournamentsPageRoute() {
  return <TournamentsPage />;
}
