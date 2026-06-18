import { createFileRoute } from "@tanstack/react-router";
import HubMCLanding from "@/components/HubMCLanding";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => seoHead({
    title: "HUBMC — The World You Love",
    description: "Premium Minecraft server with tournaments, livestreams, store, community and events.",
    path: "/",
  }),
});

function Index() {
  return <HubMCLanding />;
}

