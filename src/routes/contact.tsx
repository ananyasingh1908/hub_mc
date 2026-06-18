import { createFileRoute, lazyRouteComponent as lazy } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";

const ContactPage = lazy(() => import("@/components/contact/ContactPage"));

export const Route = createFileRoute("/contact")({
  component: ContactRoute,
  head: () => seoHead({
    title: "Contact Us — HUBMC",
    description: "Get in touch with the HUBMC team. We're here to help with any questions about our server, store, or tournaments.",
    path: "/contact",
  }),
});

function ContactRoute() {
  return <ContactPage />;
}

