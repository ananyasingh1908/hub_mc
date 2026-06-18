import { Outlet, createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminAuth } from "@/lib/auth/route-guard";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAdminAuth("/admin-login"),
  component: AdminRoute,
  head: () => noindexHead("Admin Dashboard — HUBMC"),
});

function AdminRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

