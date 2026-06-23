import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import { z } from "zod";

const ForumCreateThreadPage = lazy(() => import("@/components/ForumCreateThreadPage"));

const createThreadSearchSchema = z.object({
  category: z.string().optional(),
});

export const Route = createFileRoute("/forum/create")({
  component: ForumCreateThreadRoute,
  validateSearch: (search: Record<string, unknown>) => createThreadSearchSchema.parse(search),
  head: () => seoHead({
    title: "Create Thread — HUBMC Forum",
    description: "Start a new discussion thread on the HUBMC community forum.",
    path: "/forum/create",
  }),
});

function ForumCreateThreadRoute() {
  return <ForumCreateThreadPage />;
}
