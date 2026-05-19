import { createFileRoute } from "@tanstack/react-router";
import LivestreamPage from "@/components/LivestreamPage";

export const Route = createFileRoute("/livestream")({
  component: LivestreamRoute,
  head: () => ({
    meta: [
      { title: "Livestream & Reviews - HUBMC" },
      { name: "description", content: "Watch HUBMC live streams, join our Discord, and read community reviews." },
    ],
  }),
});

function LivestreamRoute() {
  return <LivestreamPage />;
}
