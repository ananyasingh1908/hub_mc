import { createFileRoute } from "@tanstack/react-router";
import EmployeeTournaments from "@/components/employee/EmployeeTournaments";

export const Route = createFileRoute("/employee/tournaments")({
  component: EmployeeTournamentsRoute,
});

function EmployeeTournamentsRoute() {
  return (
    <div className="p-6">
      <EmployeeTournaments />
    </div>
  );
}
