import { createFileRoute } from "@tanstack/react-router";
import EmployeeLoginPage from "@/components/EmployeeLoginPage";

export const Route = createFileRoute("/employee-login")({
  component: EmployeeLoginRoute,
  head: () => ({
    meta: [
      { title: "Staff Login - HUBMC" },
      { name: "description", content: "Sign in to HUBMC staff panel with Google." },
    ],
  }),
});

function EmployeeLoginRoute() {
  return <EmployeeLoginPage />;
}
