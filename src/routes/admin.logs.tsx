import { createFileRoute } from "@tanstack/react-router";
import AdminLogs from "@/components/admin/AdminLogs";
import { requireAdminAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin/logs")({
  beforeLoad: () => requireAdminAuth("/admin-login"),
  component: AdminLogsPage,
  head: () => ({
    meta: [
      { title: "Activity Logs - HUBMC Admin" },
      { name: "description", content: "View HUBMC staff activity logs." },
    ],
  }),
});

function AdminLogsPage() {
  return <AdminLogs />;
}
