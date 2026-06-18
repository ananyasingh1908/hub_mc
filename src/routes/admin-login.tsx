import { createFileRoute } from "@tanstack/react-router";
import AdminLoginPage from "@/components/AdminLoginPage";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginRoute,
  head: () => noindexHead("Admin Login — HUBMC"),
});

function AdminLoginRoute() {
  return <AdminLoginPage />;
}

