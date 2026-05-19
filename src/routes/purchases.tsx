import { createFileRoute } from "@tanstack/react-router";
import PurchasesPage from "@/components/PurchasesPage";
import { requireAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/purchases")({
  beforeLoad: requireAuth,
  component: PurchasesRoute,
  head: () => ({
    meta: [
      { title: "HUBMC Purchases" },
      {
        name: "description",
        content:
          "View your HUBMC Minecraft server purchase history, active ranks, and premium rewards.",
      },
    ],
  }),
});

function PurchasesRoute() {
  return <PurchasesPage />;
}
