const BASE_URL = process.env.BASE_URL || "https://hubmc.in";
const SITE_NAME = "HUBMC";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: "HUBMC is a premium Minecraft server community featuring competitive tournaments, exclusive store packages, live streams, and an active player community.",
    sameAs: [
      "https://discord.gg/CwNVBCuSbj",
      "https://www.youtube.com/@HUBMC",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@hubmc.in",
      contactType: "customer support",
    },
    foundingDate: "2024",
    slogan: "The World You Love",
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: BASE_URL,
    description: "Official HUBMC Minecraft server community — tournaments, store, livestreams, forum, and more.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/packages?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function gameSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "HUBMC Minecraft Server",
    description: "HUBMC is a premium Minecraft server featuring custom gameplay, competitive tournaments, and a vibrant community.",
    url: BASE_URL,
    applicationCategory: "GameApplication",
    operatingSystem: "Windows, macOS, Linux, Android, iOS",
    genre: "Sandbox, PvP, Survival",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

export function faqSchema(questions: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

export function productSchema(product: {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${BASE_URL}/api/products#${product.id}`,
    name: product.name,
    description: product.description,
    image: `${BASE_URL}${product.image}`,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}/packages?product=${product.id}`,
    },
  };
}

export function itemListSchema(itemListElement: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: itemListElement.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item,
    })),
  };
}

export function eventSchema(event: {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  eventAttendanceMode?: string;
  status: string;
  type: string;
  maxParticipants: number;
  registrationsCount: number;
  entryFee: number | null;
  prizePool: string | null;
  image?: string;
}) {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${BASE_URL}/api/tournaments/public#${event.id}`,
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    eventAttendanceMode: event.eventAttendanceMode || "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: event.status === "LIVE"
      ? "https://schema.org/EventScheduled"
      : event.status === "COMPLETED"
      ? "https://schema.org/EventEnded"
      : "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
    },
  };
  if (event.endDate) base.endDate = event.endDate;
  if (event.image) base.image = event.image;
  if (event.prizePool) {
    base.offers = {
      "@type": "Offer",
      price: event.entryFee ?? 0,
      priceCurrency: "INR",
      description: event.prizePool,
    };
  }
  if (event.location) base.location = { "@type": "Place", name: event.location };
  return base;
}

export function reviewAggregateSchema(data: {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  itemName: string;
  itemDescription: string;
  itemUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.itemName,
    description: data.itemDescription,
    url: `${BASE_URL}${data.itemUrl}`,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: data.ratingValue,
      reviewCount: data.reviewCount,
      bestRating: data.bestRating ?? 5,
    },
  };
}

export function jsonLdScript(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}
