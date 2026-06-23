import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const AdminForum = lazy(() => import("@/components/admin/AdminForum"));

export const Route = createFileRoute("/admin/forum")({
  component: AdminForumRoute,
  head: () => noindexHead("Forum Moderation — HUBMC Admin"),
});

function AdminForumRoute() {
  return <AdminForum />;
}
