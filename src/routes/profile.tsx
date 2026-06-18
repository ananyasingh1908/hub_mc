import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import { requireAuth } from "@/lib/auth/route-guard";

const ProfilePage = lazy(() => import("@/components/ProfilePage"));

export const Route = createFileRoute("/profile")({
  component: ProfileRoute,
  beforeLoad: () => requireAuth("/login"),
  head: () => seoHead({
    title: "My Profile — HUBMC",
    description: "View your HUBMC profile, owned packages, purchase history, and player details.",
    path: "/profile",
  }),
});

function ProfileRoute() {
  return <ProfilePage />;
}

