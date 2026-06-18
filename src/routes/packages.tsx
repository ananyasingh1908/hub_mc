import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { seoHead } from "@/lib/seo";

const PackagesPage = lazy(() => import("@/components/PackagesPage"));

export const Route = createFileRoute("/packages")({
  component: PackagesRoute,
  errorComponent: RouteErrorBoundary,
  head: () => seoHead({
    title: "HUBMC Packages — Minecraft Ranks & Store",
    description: "Browse HUBMC Minecraft server packages — ranks, coins, and premium rewards. Find the perfect upgrade for your gameplay.",
    path: "/packages",
  }),
});

function PackagesRoute() {
  return <PackagesPage />;
}

