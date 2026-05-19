import { createFileRoute } from "@tanstack/react-router";
import EmployeeOrders from "@/components/employee/EmployeeOrders";
import { requireEmployeeAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/employee/orders")({
  beforeLoad: () => requireEmployeeAuth("/employee-login"),
  component: EmployeeOrdersPage,
  head: () => ({
    meta: [
      { title: "Orders - HUBMC Staff" },
      { name: "description", content: "View and manage HUBMC orders." },
    ],
  }),
});

function EmployeeOrdersPage() {
  return <EmployeeOrders />;
}
