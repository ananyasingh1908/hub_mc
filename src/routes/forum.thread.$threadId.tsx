import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";

const ForumThreadPage = lazy(() => import("@/components/ForumThreadPage"));

export const Route = createFileRoute("/forum/thread/$threadId")({
  component: ForumThreadRoute,
  head: () => seoHead({
    title: "Forum Thread — HUBMC",
    description: "View forum thread and replies.",
    path: "/forum",
  }),
});

function ForumThreadRoute() {
  return <ForumThreadPage />;
}
