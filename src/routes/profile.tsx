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
});

function ProfileRoute() {
  return <ProfilePage />;
}
