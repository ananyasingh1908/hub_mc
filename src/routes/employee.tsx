import { Outlet, createFileRoute } from "@tanstack/react-router";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { requireEmployeeAuth } from "@/lib/auth/route-guard";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/employee")({
  beforeLoad: () => requireEmployeeAuth("/employee-login"),
  component: EmployeeRoute,
  head: () => noindexHead("Employee Dashboard — HUBMC"),
});

function EmployeeRoute() {
  return (
    <EmployeeLayout>
      <Outlet />
    </EmployeeLayout>
  );
}

