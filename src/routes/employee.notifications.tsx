import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const EmployeeNotifications = lazy(() => import("@/components/employee/EmployeeNotifications"));

export const Route = createFileRoute("/employee/notifications")({
  component: EmployeeNotificationsRoute,
  head: () => noindexHead("Notifications — HUBMC Staff"),
});

function EmployeeNotificationsRoute() {
  return <EmployeeNotifications />;
}

