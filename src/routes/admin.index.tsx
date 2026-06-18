import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";

const AdminDashboard = lazy(() => import("@/components/admin/AdminDashboard"));

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  return <AdminDashboard />;
}

