import { createFileRoute } from "@tanstack/react-router";
import AdminLoginPage from "@/components/AdminLoginPage";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginRoute,
  head: () => ({
    meta: [
      { title: "Admin Login - HUBMC" },
      { name: "description", content: "Sign in to HUBMC super admin panel." },
    ],
  }),
});

function AdminLoginRoute() {
  return <AdminLoginPage />;
}
