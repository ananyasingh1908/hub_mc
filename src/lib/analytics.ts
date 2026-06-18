interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID as string | undefined;

let initialized = false;

function isProduction(): boolean {
  try {
    return import.meta.env.PROD;
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

function acceptCookies(): boolean {
  if (typeof document === "undefined") return false;
  const raw = localStorage.getItem("hubmc-cookie-consent");
  if (raw === "accepted") return true;
  if (raw === "rejected") return false;
  return isProduction();
}

export function initAnalytics() {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (!acceptCookies()) return;

  if (GA_ID) {
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);

    const inline = document.createElement("script");
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`;
    document.head.appendChild(inline);
  }

  if (CLARITY_ID) {
    const script = document.createElement("script");
    script.textContent = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','${CLARITY_ID}');`;
    document.head.appendChild(script);
  }

  initialized = true;
}

export function trackPageView(path: string, title?: string) {
  if (typeof window === "undefined") return;
  if (!acceptCookies()) return;

  const gtag = (window as unknown as Record<string, unknown>).gtag;
  if (typeof gtag === "function") {
    gtag("event", "page_view", {
      page_path: path,
      page_title: title ?? document.title,
      page_location: window.location.href,
    });
  }

  const clarity = (window as unknown as Record<string, unknown>).clarity;
  if (typeof clarity === "function") {
    clarity("set", "page", path);
  }
}

export function trackEvent(name: string, properties?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  if (!acceptCookies()) return;

  const gtag = (window as unknown as Record<string, unknown>).gtag;
  if (typeof gtag === "function") {
    gtag("event", name, properties);
  }

  const clarity = (window as unknown as Record<string, unknown>).clarity;
  if (typeof clarity === "function") {
    clarity("event", name, properties);
  }
}

export const AnalyticsEvents = {
  VIEW_PACKAGE: "view_package",
  VIEW_TOURNAMENT: "view_tournament",
  ADD_TO_CART: "add_to_cart",
  DISCORD_CHECKOUT_CLICK: "discord_checkout_click",
  TOURNAMENT_REGISTRATION: "tournament_registration",
} as const;

export function setCookieConsent(accepted: boolean) {
  localStorage.setItem("hubmc-cookie-consent", accepted ? "accepted" : "rejected");
  if (accepted) {
    initAnalytics();
  }
}
