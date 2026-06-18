import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/components/LoginPage";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
  head: () => seoHead({
    title: "Login — HUBMC",
    description: "Sign in to HUBMC with your Minecraft username to access your profile, purchases, and more.",
    path: "/login",
  }),
});

function LoginRoute() {
  return <LoginPage />;
}

