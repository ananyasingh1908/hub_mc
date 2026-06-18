import { createFileRoute } from "@tanstack/react-router";
import AdminEmployeeMonitor from "@/components/admin/AdminEmployeeMonitor";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/employees-monitor")({
  component: AdminEmployeeMonitorRoute,
  head: () => noindexHead("Employee Monitor — HUBMC Admin"),
});

function AdminEmployeeMonitorRoute() {
  return <div className="p-6"><AdminEmployeeMonitor /></div>;
}

