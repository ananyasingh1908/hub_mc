import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { SiteFooter } from "@/components/SiteFooter";
import { organizationSchema, websiteSchema, gameSchema } from "@/lib/json-ld";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { initSentry } from "@/lib/sentry";

import appCss from "../styles.css?url";
import heroPng from "@/assets/last_home_hub.png";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const siteUrl = process.env.BASE_URL || "https://hubmc.in";
const siteName = "HUBMC";
const ogImage = heroPng;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "wxWk5BwBCWjWmwK1yopQlxttiDZOOo17VDg1mKQVBII" },
      { title: "HUBMC — Official Minecraft Server, Store, Tournaments & Community" },
      { name: "description", content: "HUBMC is the official HubMC Minecraft server community. Play on hubmc.in — competitive tournaments, exclusive store packages, live streams, and an active player community." },
      { name: "author", content: "HUBMC" },
      { name: "keywords", content: "HUBMC, HubMC, hubmc.in, Minecraft server, Minecraft community, Minecraft tournaments, Minecraft store, Minecraft ranks, PvP, gaming" },
      { name: "theme-color", content: "#050505" },
      { name: "application-name", content: siteName },
      { name: "referrer", content: "origin-when-cross-origin" },
      { property: "og:title", content: "HUBMC — Official Minecraft Server, Store, Tournaments & Community" },
      { property: "og:description", content: "HUBMC is the official HubMC Minecraft server community. Play on hubmc.in — competitive tournaments, exclusive store packages, live streams, and an active player community." },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1920" },
      { property: "og:image:height", content: "1080" },
      { property: "og:url", content: siteUrl },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: siteName },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@HUBMC" },
      { name: "twitter:title", content: "HUBMC — Official Minecraft Server, Store, Tournaments & Community" },
      { name: "twitter:description", content: "HUBMC is the official HubMC Minecraft server community. Play on hubmc.in — competitive tournaments, exclusive store packages, live streams, and an active player community." },
      { name: "twitter:image", content: ogImage },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentry();
    initAnalytics();
  }, []);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicPage = !pathname.startsWith("/admin") && !pathname.startsWith("/employee") && !pathname.startsWith("/admin-login") && !pathname.startsWith("/employee-login");

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        {isPublicPage && (
          <>
            <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }} />
            <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema()) }} />
            <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema()) }} />
          </>
        )}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useRouterState({ select: (s) => s.location });
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    const path = location.pathname;
    const search = location.searchStr ? `?${location.searchStr}` : "";
    const fullPath = `${path}${search}`;

    if (prevPath.current !== path) {
      prevPath.current = path;
      trackPageView(fullPath, document.title);
    }
  }, [location.pathname, location.searchStr]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <SiteFooter />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

