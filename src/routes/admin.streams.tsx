import { createFileRoute } from "@tanstack/react-router";
import AdminStreams from "@/components/admin/AdminStreams";
import { requireAdminAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin/streams")({
  beforeLoad: () => requireAdminAuth("/admin-login"),
  component: AdminStreamsRoute,
  head: () => ({
    meta: [
      { title: "Stream Moderation - HUBMC Admin" },
      { name: "description", content: "Manage community livestreams and blacklisted channels." },
    ],
  }),
});

function AdminStreamsRoute() {
  return <AdminStreams />;
}
