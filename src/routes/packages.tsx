import { createFileRoute } from "@tanstack/react-router";
import PackagesPage from "@/components/PackagesPage";

export const Route = createFileRoute("/packages")({
  component: PackagesRoute,
  head: () => ({
    meta: [
      { title: "HUBMC Packages" },
      {
        name: "description",
        content:
          "Browse HubMC ranks, coins, and premium rewards in the server store.",
      },
    ],
  }),
});

function PackagesRoute() {
  return <PackagesPage />;
}
