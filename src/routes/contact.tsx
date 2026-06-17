import { createFileRoute } from "@tanstack/react-router";
import ContactPage from "@/components/contact/ContactPage";

export const Route = createFileRoute("/contact")({
  component: ContactRoute,
  head: () => ({
    meta: [
      { title: "Contact HUBMC – Support & Help Center" },
      {
        name: "description",
        content:
          "Get in touch with the HUBMC team. Contact support, ask questions, or browse our FAQ for Minecraft server help.",
      },
    ],
  }),
});

function ContactRoute() {
  return <ContactPage />;
}
