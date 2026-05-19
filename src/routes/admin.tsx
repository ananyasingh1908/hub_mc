import { Outlet, createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAdminAuth("/admin-login"),
  component: AdminRoute,
  head: () => ({
    meta: [
      { title: "Admin Dashboard - HUBMC" },
      { name: "description", content: "HUBMC super admin management dashboard." },
    ],
  }),
});

function AdminRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
