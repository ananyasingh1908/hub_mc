import { createFileRoute } from "@tanstack/react-router";
import HubMCLanding from "@/components/HubMCLanding";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => seoHead({
    title: "HUBMC — Official Minecraft Server, Store, Tournaments & Community",
    description: "HUBMC is the official HubMC Minecraft server community. Play on hubmc.in — featuring competitive tournaments, exclusive store packages, live streams, and an active player community.",
    path: "/",
    keywords: "HUBMC, HubMC, hubmc.in, Minecraft server, Minecraft community, Minecraft tournaments, Minecraft store, Minecraft ranks, PvP, gaming, Minecraft India",
  }),
});

function Index() {
  return <HubMCLanding />;
}

