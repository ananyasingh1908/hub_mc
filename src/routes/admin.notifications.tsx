import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const AdminNotifications = lazy(() => import("@/components/admin/AdminNotifications"));

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsRoute,
  head: () => noindexHead("Notifications — HUBMC Admin"),
});

function AdminNotificationsRoute() {
  return <AdminNotifications />;
}

