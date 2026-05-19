import { Outlet, createFileRoute } from "@tanstack/react-router";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { requireEmployeeAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/employee")({
  beforeLoad: () => requireEmployeeAuth("/employee-login"),
  component: EmployeeRoute,
  head: () => ({
    meta: [
      { title: "Employee Dashboard - HUBMC" },
      { name: "description", content: "HUBMC employee management dashboard." },
    ],
  }),
});

function EmployeeRoute() {
  return (
    <EmployeeLayout>
      <Outlet />
    </EmployeeLayout>
  );
}
