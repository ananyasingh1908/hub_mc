import { createFileRoute } from "@tanstack/react-router";
import EmployeePlayers from "@/components/employee/EmployeePlayers";

export const Route = createFileRoute("/employee/players")({
  component: EmployeePlayersRoute,
});

function EmployeePlayersRoute() {
  return (
    <div className="p-6">
      <EmployeePlayers />
    </div>
  );
}
