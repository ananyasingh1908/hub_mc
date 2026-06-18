const BASE_URL = process.env.BASE_URL || "https://hubmc.in";
const SITE_NAME = "HUBMC";
const DEFAULT_OG_IMAGE = "/og-default.png";
const TWITTER_HANDLE = "@HUBMC";

export interface SeoProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  noindex?: boolean;
}

type MetaRecord = Record<string, string>;

export function seoHead(props: SeoProps) {
  const url = props.path ? `${BASE_URL}${props.path}` : BASE_URL;
  const image = props.ogImage || DEFAULT_OG_IMAGE;
  const metaArray: MetaRecord[] = [
    { title: props.title },
    { name: "description", content: props.description },
    { property: "og:title", content: props.title },
    { property: "og:description", content: props.description },
    { property: "og:image", content: image },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "twitter:title", content: props.title },
    { name: "twitter:description", content: props.description },
    { name: "twitter:image", content: image },
  ];

  if (props.noindex) {
    metaArray.push({ name: "robots", content: "noindex, nofollow" });
  }

  const linkArray: MetaRecord[] = [];
  if (props.path) {
    linkArray.push({ rel: "canonical", href: url });
  }

  return { meta: metaArray, links: linkArray };
}

export function noindexHead(title: string) {
  return seoHead({ title, description: "", noindex: true });
}
