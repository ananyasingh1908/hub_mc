import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";

const ForumCategoryPage = lazy(() => import("@/components/ForumCategoryPage"));

export const Route = createFileRoute("/forum/$categorySlug")({
  component: ForumCategoryRoute,
  head: () => seoHead({
    title: "Forum Category — HUBMC",
    description: "Browse forum threads in this category.",
    path: "/forum",
  }),
});

function ForumCategoryRoute() {
  return <ForumCategoryPage />;
}
