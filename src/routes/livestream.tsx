import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";

const LivestreamPage = lazy(() => import("@/components/LivestreamPage"));

export const Route = createFileRoute("/livestream")({
  component: LivestreamRoute,
  head: () => seoHead({
    title: "Livestream & Reviews — HUBMC",
    description: "Watch HUBMC live streams, join our Minecraft community on Discord, and read server reviews from players.",
    path: "/livestream",
  }),
});

function LivestreamRoute() {
  return <LivestreamPage />;
}

