import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/components/LoginPage";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
  head: () => ({
    meta: [
      { title: "HUBMC Login" },
      {
        name: "description",
        content: "Sign in to HUBMC with your Minecraft username.",
      },
    ],
  }),
});

function LoginRoute() {
  return <LoginPage />;
}
