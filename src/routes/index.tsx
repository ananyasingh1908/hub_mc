import { createFileRoute } from "@tanstack/react-router";
import HubMCLanding from "@/components/HubMCLanding";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "HubMC — The World You Love. Evolved." },
      { name: "description", content: "Enter the premium Minecraft server universe. New biomes, new mobs, new adventures. Endless possibilities." },
      { property: "og:title", content: "HubMC — The World You Love. Evolved." },
      { property: "og:description", content: "A premium Minecraft server experience. New biomes, new mobs, endless adventures." },
    ],
  }),
});

function Index() {
  return <HubMCLanding />;
}
