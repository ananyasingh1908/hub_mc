import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (!DSN) {
    console.log("[Sentry] Skipped — no DSN configured (set VITE_SENTRY_DSN to enable)");
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE || "production",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (!DSN) return null;
      return event;
    },
  });

  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!DSN) return;
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level?: Sentry.SeverityLevel) {
  if (!DSN) return;
  Sentry.captureMessage(message, level);
}

export function setSentryUser(id: string, username?: string) {
  if (!DSN) return;
  Sentry.setUser({ id, username });
}

export function clearSentryUser() {
  if (!DSN) return;
  Sentry.setUser(null);
}
