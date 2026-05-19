import { createFileRoute } from "@tanstack/react-router";
import AdminCustomers from "@/components/admin/AdminCustomers";
import { requireAdminAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin/customers")({
  beforeLoad: () => requireAdminAuth("/admin-login"),
  component: AdminCustomersPage,
  head: () => ({
    meta: [
      { title: "Customers - HUBMC Admin" },
      { name: "description", content: "View HUBMC customer database." },
    ],
  }),
});

function AdminCustomersPage() {
  return <AdminCustomers />;
}
