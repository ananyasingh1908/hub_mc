import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { noindexHead } from "@/lib/seo";

const AdminStreams = lazy(() => import("@/components/admin/AdminStreams"));

export const Route = createFileRoute("/admin/streams")({
  component: AdminStreamsRoute,
  head: () => noindexHead("Streams — HUBMC Admin"),
});

function AdminStreamsRoute() {
  return <AdminStreams />;
}

