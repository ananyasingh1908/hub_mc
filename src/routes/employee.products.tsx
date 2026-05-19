import { createFileRoute } from "@tanstack/react-router";
import EmployeeProducts from "@/components/employee/EmployeeProducts";
import { requireEmployeeAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/employee/products")({
  beforeLoad: () => requireEmployeeAuth("/employee-login"),
  component: EmployeeProductsPage,
  head: () => ({
    meta: [
      { title: "Products - HUBMC Staff" },
      { name: "description", content: "Manage HUBMC store products." },
    ],
  }),
});

function EmployeeProductsPage() {
  return <EmployeeProducts />;
}
