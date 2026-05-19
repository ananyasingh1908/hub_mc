import { createFileRoute } from "@tanstack/react-router";
import AdminEmployeeMonitor from "@/components/admin/AdminEmployeeMonitor";

export const Route = createFileRoute("/admin/employees-monitor")({
  component: AdminEmployeeMonitorRoute,
});

function AdminEmployeeMonitorRoute() {
  return <div className="p-6"><AdminEmployeeMonitor /></div>;
}
