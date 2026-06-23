import { Outlet, createFileRoute } from "@tanstack/react-router";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/forum")({
  component: ForumLayout,
  head: () => seoHead({
    title: "Community Forum — HUBMC",
    description: "Join the HUBMC community forum. Discuss Minecraft, ask questions, share builds, and connect with other players.",
    path: "/forum",
  }),
});

function ForumLayout() {
  return (
    <StorePageLayout>
      <Outlet />
    </StorePageLayout>
  );
}
