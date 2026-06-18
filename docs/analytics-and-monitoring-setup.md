# HUBMC — Analytics & Monitoring Setup

## 1. Google Analytics 4 (GA4)

### Setup

1.  Go to [Google Analytics](https://analytics.google.com/) and create a new
    property (Web stream).
2.  Copy the **Measurement ID** (format `G-XXXXXXXXXX`).
3.  Set it as the environment variable:
    ```
    VITE_GA_ID=G-XXXXXXXXXX
    ```

### How it works

- `src/lib/analytics.ts` injects the GA4 gtag script only when
  `VITE_GA_ID` is set and cookies are accepted.
- Every route change fires a `page_view` event automatically.
- Custom events (add to cart, tournament registration, etc.) fire the
  corresponding `gtag("event", ...)` call.

---

## 2. Microsoft Clarity

### Setup

1.  Go to [Clarity](https://clarity.microsoft.com/) and create a new project.
2.  Copy the **Project ID** (a short alphanumeric string).
3.  Set it as the environment variable:
    ```
    VITE_CLARITY_ID=abcdefg
    ```

### How it works

- The Clarity snippet is injected into `<head>` on page load.
- Route changes are relayed via `clarity("set", "page", path)`.
- Custom events are relayed via `clarity("event", name, properties)`.

---

## 3. Sentry (Error Monitoring)

### Setup

1.  Create an account at [sentry.io](https://sentry.io/).
2.  Create a new project (select **React**).
3.  Copy the **DSN** (format `https://xxxxx@xxxx.ingest.sentry.io/xxxxx`).
4.  Set it as the environment variable:
    ```
    VITE_SENTRY_DSN=https://xxxxx@xxxx.ingest.sentry.io/xxxxx
    ```

### What is captured

| Category                   | How                              |
| -------------------------- | -------------------------------- |
| React errors               | `Sentry.ErrorBoundary` wrapping  |
| Unhandled promise rejects  | `onunhandledrejection` handler   |
| Client crashes             | `onerror` global handler         |
| API errors (manual)        | `captureError()` calls           |

### What is NOT captured

Sentry is completely disabled (zero bundle impact) when `VITE_SENTRY_DSN` is
not set. This is safe for local development.

---

## 4. Cookie Consent

The analytics module reads `localStorage["hubmc-cookie-consent"]`. Values:

| Value      | Behaviour                              |
| ---------- | -------------------------------------- |
| `accepted` | GA4 + Clarity scripts are injected     |
| `rejected` | No tracking scripts or events fire     |
| unset      | Treated as `accepted` in production    |

Use the exported `setCookieConsent(bool)` function to build a consent banner.

---

## 5. Tracked Events Reference

| Constant                           | Component          | Properties                                            |
| ---------------------------------- | ------------------ | ----------------------------------------------------- |
| `AnalyticsEvents.VIEW_PACKAGE`     | `PackagesPage`     | `product_id`, `product_name`, `category`, `price`     |
| `AnalyticsEvents.VIEW_TOURNAMENT`  | `TournamentsPage`, `TournamentDetailPage` | `tournament_id`, `title`, `type`, `status` |
| `AnalyticsEvents.ADD_TO_CART`      | `PackageCard`      | `product_id`, `product_name`, `category`, `price`     |
| `AnalyticsEvents.DISCORD_CHECKOUT_CLICK` | `CheckoutPage`, `OrderSummaryCard` | `item_count`, `subtotal`                   |
| `AnalyticsEvents.TOURNAMENT_REGISTRATION` | `TournamentDetailPage` | `tournament_id`, `tournament_title`                   |

Page views are tracked automatically via route changes in `__root.tsx` using
the router's `location.pathname`.
