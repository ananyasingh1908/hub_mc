import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";

const ForumPage = lazy(() => import("@/components/ForumPage"));

export const Route = createFileRoute("/forum/")({
  component: ForumIndexRoute,
  head: () => seoHead({
    title: "HUBMC Community Forum — Minecraft Discussions, Support & Events",
    description: "Join the HUBMC community forum. Discuss Minecraft strategies, get support, share builds, and stay updated on server events and tournaments.",
    path: "/forum",
  }),
});

function ForumIndexRoute() {
  return <ForumPage />;
}
