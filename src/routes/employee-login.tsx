import { createFileRoute } from "@tanstack/react-router";
import EmployeeLoginPage from "@/components/EmployeeLoginPage";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/employee-login")({
  component: EmployeeLoginRoute,
  head: () => noindexHead("Staff Login — HUBMC"),
});

function EmployeeLoginRoute() {
  return <EmployeeLoginPage />;
}

