import { createFileRoute } from "@tanstack/react-router";
import EmployeeSupport from "@/components/employee/EmployeeSupport";
import { requireEmployeeAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/employee/support")({
  beforeLoad: () => requireEmployeeAuth("/employee-login"),
  component: EmployeeSupportPage,
  head: () => ({
    meta: [
      { title: "Support - HUBMC Staff" },
      { name: "description", content: "Manage HUBMC support tickets." },
    ],
  }),
});

function EmployeeSupportPage() {
  return <EmployeeSupport />;
}
