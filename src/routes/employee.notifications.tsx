import { createFileRoute } from "@tanstack/react-router";
import EmployeeNotifications from "@/components/employee/EmployeeNotifications";

export const Route = createFileRoute("/employee/notifications")({
  component: EmployeeNotificationsRoute,
});

function EmployeeNotificationsRoute() {
  return (
    <div className="p-6">
      <EmployeeNotifications />
    </div>
  );
}
