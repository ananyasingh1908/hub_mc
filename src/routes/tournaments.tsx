import { createFileRoute } from "@tanstack/react-router";
import TournamentsPage from "@/components/TournamentsPage";

export const Route = createFileRoute("/tournaments")({
  component: TournamentsPageRoute,
});

function TournamentsPageRoute() {
  return <TournamentsPage />;
}
