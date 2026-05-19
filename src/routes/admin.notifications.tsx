import { createFileRoute } from "@tanstack/react-router";
import AdminNotifications from "@/components/admin/AdminNotifications";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsRoute,
});

function AdminNotificationsRoute() {
  return <div className="p-6"><AdminNotifications /></div>;
}
