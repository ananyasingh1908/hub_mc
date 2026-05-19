import { createFileRoute } from "@tanstack/react-router";
import AdminEmployees from "@/components/admin/AdminEmployees";
import { requireAdminAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin/employees")({
  beforeLoad: () => requireAdminAuth("/admin-login"),
  component: AdminEmployeesPage,
  head: () => ({
    meta: [
      { title: "Employees - HUBMC Admin" },
      { name: "description", content: "Manage HUBMC staff accounts." },
    ],
  }),
});

function AdminEmployeesPage() {
  return <AdminEmployees />;
}
