import { createFileRoute, redirect } from "@tanstack/react-router";
import ProfilePage from "@/components/ProfilePage";

export const Route = createFileRoute("/profile")({
  component: ProfileRoute,
  beforeLoad: async ({ context }) => {
    const auth = (context as any).auth;
    if (!auth?.authenticated) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "My Profile - HUBMC" },
      { name: "description", content: "View your HUBMC profile, owned packages, purchase history, and player details." },
    ],
  }),
});

function ProfileRoute() {
  return <ProfilePage />;
}
