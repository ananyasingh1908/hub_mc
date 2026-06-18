import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const AdminLogs = lazy(() => import("@/components/admin/AdminLogs"));

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogsRoute,
  head: () => noindexHead("Logs — HUBMC Admin"),
});

function AdminLogsRoute() {
  return <AdminLogs />;
}

