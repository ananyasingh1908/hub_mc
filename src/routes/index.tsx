import { createFileRoute } from "@tanstack/react-router";
import HubMCLanding from "@/components/HubMCLanding";
import heroPng from "@/assets/last_home_hub.png";

const siteUrl = process.env.BASE_URL || "https://hubmc.net";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "HUBMC — The World You Love" },
      { name: "description", content: "Premium Minecraft server with tournaments, livestreams, store, community and events." },
      { property: "og:title", content: "HUBMC — The World You Love" },
      { property: "og:description", content: "Premium Minecraft server with tournaments, livestreams, store, community and events." },
      { property: "og:image", content: heroPng },
      { property: "og:image:width", content: "1672" },
      { property: "og:image:height", content: "941" },
      { property: "og:url", content: siteUrl },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HUBMC — The World You Love" },
      { name: "twitter:description", content: "Premium Minecraft server with tournaments, livestreams, store, community and events." },
      { name: "twitter:image", content: heroPng },
    ],
  }),
});

function Index() {
  return <HubMCLanding />;
}
