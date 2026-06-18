import { devlog } from "@/lib/dev-log"; 
import "./lib/error-capture";
import { handleUpload } from "@/lib/upload/upload-handler";
import { checkRateLimit } from "@/lib/rate-limiter";
import { cachedJson } from "@/lib/response-cache";

// Warn about missing env vars at startup
if (!process.env.JWT_SECRET) console.warn("[ENV] JWT_SECRET is not set");
if (!process.env.GOOGLE_CLIENT_ID) console.warn("[ENV] GOOGLE_CLIENT_ID is not set");
if (!process.env.GOOGLE_CLIENT_SECRET) console.warn("[ENV] GOOGLE_CLIENT_SECRET is not set");
if (!process.env.SUPER_ADMIN_ID) console.warn("[ENV] SUPER_ADMIN_ID is not set");
if (!process.env.SUPER_ADMIN_PASSWORD) console.warn("[ENV] SUPER_ADMIN_PASSWORD is not set");
if (process.env.GOOGLE_CLIENT_ID) devlog("[ENV] GOOGLE_CLIENT_ID is configured");
if (process.env.SUPER_ADMIN_ID && process.env.SUPER_ADMIN_PASSWORD) devlog("[ENV] Super admin credentials are configured");

// Pre-warm YouTube cache from DB on startup so first request serves data immediately
initializeCache();

import {
  getClientVisibleAuthState,
  handleLoginRequest,
  handleLogoutRequest,
  handleSessionRequest,
} from "@/lib/auth/session";
import { handleEmployeeLoginRequest, handleGoogleClientIdRequest } from "@/lib/auth/employee-auth";
import { handleAdminLoginRequest } from "@/lib/auth/admin-auth";
import { handleEmployeeSessionRequest, handleEmployeeLogoutRequest } from "@/lib/auth/employee-session";
import { handleAdminSessionRequest, handleAdminLogoutRequest } from "@/lib/auth/admin-session";
import { handleAllSessionsRequest } from "@/lib/auth/all-sessions";
import { commerceApiHandlers } from "@/lib/commerce/api-handlers";
import {
  handleGetOrders,
  handleRetryDelivery,
  handleRefundOrder,
  handleGetOrderInvoice,
} from "@/lib/commerce/order-handlers";
import {
  handleAdminGetProducts,
  handleAdminCreateProduct,
  handleAdminUpdateProduct,
  handleAdminDeleteProduct,
  handleAdminGetOrders,
  handleAdminUpdateOrderStatus,
  handleAdminGetTickets,
  handleAdminReplyTicket,
  handleAdminResolveTicket,
  handleAdminGetCustomers,
  handleAdminGetEmployees,
  handleAdminCreateEmployee,
  handleAdminUpdateEmployee,
  handleAdminDeleteEmployee,
  handleAdminGetLogs,
  handleAdminGetPermissions,
  handleAdminUpdatePermissions,
  handleAdminDashboardStats,
  handleGetServerReviews,
  handleSubmitServerReview,
  handleAdminGetDeliveries,
  handleAdminResendDelivery,
} from "@/lib/admin/handlers";
import {
  handleAdminPlatformStats,
  handleAdminMonitorTournaments,
  handleAdminMonitorEmployees,
  handleAdminPlatformLogs,
  handleAdminTournamentActions,
  handleAdminAllPlayers,
  handleAdminSendGlobalNotification,
} from "@/lib/admin/admin-monitor";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleContactRequest } from "@/lib/contact/contact-handler";
import {
  handleGetPublicTournaments,
  autoUpdateStatuses,
  handleGetTournamentById,
  handleRegisterForTournament,
  handleGetTournamentRegistrations,
  handleStaffGetTournaments,
  handleStaffCreateTournament,
  handleStaffUpdateTournament,
  handleStaffDeleteTournament,
  handleDeleteTournamentRegistration,
  handleGetTournamentBrackets,
  handleStaffSearchRegistrations,
  handleStaffExportRegistrations,
  handleStaffStartTournament,
  handleStaffEndTournament,
  handleGetTournamentLeaderboard,
  handleGetTournamentMatches,
  handleStaffGenerateBracket,
  handleStaffUpdateMatch,
  handleStaffCreateNextRound,
  handleStaffDeleteMatches,
} from "@/lib/tournaments/tournament-handlers";
import {
  handleGetAnnouncements,
  handleCreateAnnouncement,
  handleDeleteAnnouncement,
  handleGetSiteNotifications,
  handleGetActiveSiteNotifications,
  handleCreateSiteNotification,
  handleUpdateSiteNotification,
  handleDeleteSiteNotification,
  handleSearchPlayers,
  handleGetPlayerProfile,
  handleAddPlayerNote,
  handleBanPlayer,
  handleUnbanPlayer,
  handleGetPlayerBans,
  handleAssignRank,
  handleRemoveRank,
  handleEmployeeDashboardStats,
} from "@/lib/employee/employee-handlers";
import { handleYouTubeStatus, handleYouTubeVideos, handleYouTubeLivestream, handleYouTubeCommunityStreams, handleAdminApproveStream, handleAdminRemoveStream, handleAdminBlacklistChannel, handleAdminGetFeaturedStreams } from "@/lib/youtube/youtube-handler";
import { scheduleRefresh, initializeCache } from "@/lib/youtube/youtube-cache";
import { handleDiscordStatus, handleDiscordEvents } from "@/lib/discord/discord-handler";
import { handleGetNotifications, handleUnreadCount, handleMarkRead, handleMarkAllRead } from "@/lib/notifications/notification-handler";
import { handleGetProfile } from "@/lib/profile/profile-handlers";

// ─── SECURITY HEADERS ────────────────────────────────────────
function applySecurityHeaders(response: Response, url: URL): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (url.protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// ─── CSRF PROTECTION ─────────────────────────────────────────
const CSRF_MUTABLE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/admin-login",
  "/api/auth/employee-login",
  "/api/contact",
  "/api/auth/logout",
  "/api/auth/employee/logout",
  "/api/auth/admin/logout",
  "/api/server-reviews/submit",
]);

function checkCsrf(request: Request, url: URL): Response | null {
  if (!CSRF_MUTABLE_METHODS.has(request.method)) return null;
  if (CSRF_EXEMPT_PATHS.has(url.pathname)) return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowedHost = url.host;
  const allowedOrigin = process.env.BASE_URL;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === allowedHost || (allowedOrigin && origin === allowedOrigin)) {
        return null;
      }
    } catch { /* invalid origin header — reject */ }
  } else if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === allowedHost) {
        return null;
      }
    } catch { /* invalid referer header — reject */ }
  }

  // Allow requests with no origin AND no referer (curl / same-origin cookie requests
  // from a first-party page that strips Referer via Referrer-Policy are fine — they
  // have the cookie and the browser won't send the header, which is the expected
  // behavior for SameSite=Strict cookies).
  if (!origin && !referer) return null;

  return Response.json({ error: "CSRF validation failed" }, { status: 403 });
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const response = await this.handleRequest(request, env, ctx, url);
    return applySecurityHeaders(response, url);
  },

  async handleRequest(request: Request, env: unknown, ctx: unknown, url: URL): Promise<Response> {
    try {
      // CSRF check for all state-changing API routes
      const csrfError = checkCsrf(request, url);
      if (csrfError) return csrfError;

      // Health check
      if (url.pathname === "/api/health" && request.method === "GET") {
        return Response.json({
          status: "ok",
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "production",
        });
      }

      // SEO: robots.txt
      if (url.pathname === "/robots.txt") {
        const baseUrl = process.env.BASE_URL || "https://hubmc.in";
        const robots = [
          "User-agent: *",
          "Allow: /$",
          "Allow: /packages",
          "Allow: /tournaments",
          "Allow: /tournaments/",
          "Allow: /contact",
          "Allow: /livestream",
          "Allow: /login",
          "Disallow: /admin",
          "Disallow: /admin-login",
          "Disallow: /employee",
          "Disallow: /employee-login",
          "Disallow: /profile",
          "Disallow: /purchases",
          "Disallow: /cart",
          "Disallow: /checkout",
          "Disallow: /api/",
          `Sitemap: ${baseUrl}/sitemap.xml`,
        ].join("\n");
        return new Response(robots, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      // SEO: sitemap.xml
      if (url.pathname === "/sitemap.xml") {
        const baseUrl = process.env.BASE_URL || "https://hubmc.in";
        const urls = [
          { loc: "/", priority: "1.0", changefreq: "weekly" },
          { loc: "/packages", priority: "0.9", changefreq: "weekly" },
          { loc: "/tournaments", priority: "0.8", changefreq: "daily" },
          { loc: "/contact", priority: "0.6", changefreq: "monthly" },
          { loc: "/livestream", priority: "0.7", changefreq: "daily" },
          { loc: "/login", priority: "0.3", changefreq: "monthly" },
        ];
        const sitemap = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls.map(
            (u) =>
              `  <url><loc>${baseUrl}${u.loc}</loc><priority>${u.priority}</priority><changefreq>${u.changefreq}</changefreq></url>`,
          ),
          `</urlset>`,
        ].join("\n");
        return new Response(sitemap, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      }

      // Auth API routes
      if (url.pathname.startsWith("/api/auth/")) {
        if (url.pathname === "/api/auth/login" && request.method === "POST") {
          return await handleLoginRequest(request);
        }
        if (url.pathname === "/api/auth/logout" && request.method === "POST") {
          return await handleLogoutRequest(request);
        }
        if (url.pathname === "/api/auth/session" && request.method === "GET") {
          return await handleSessionRequest(request);
        }
        if (url.pathname === "/api/auth/hubmc-status") {
          return Response.json(getClientVisibleAuthState());
        }
        if (url.pathname === "/api/auth/employee-login" && request.method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "employee-login" });
          if (rl) return rl;
          return await handleEmployeeLoginRequest(request);
        }
        if (url.pathname === "/api/auth/admin-login" && request.method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "admin-login" });
          if (rl) return rl;
          return await handleAdminLoginRequest(request);
        }
        if (url.pathname === "/api/auth/google-client-id" && request.method === "GET") {
          return handleGoogleClientIdRequest();
        }
        if (url.pathname === "/api/auth/employee/session" && request.method === "GET") {
          return await handleEmployeeSessionRequest(request);
        }
        if (url.pathname === "/api/auth/employee/logout" && request.method === "POST") {
          return await handleEmployeeLogoutRequest(request);
        }
        if (url.pathname === "/api/auth/admin/session" && request.method === "GET") {
          return await handleAdminSessionRequest(request);
        }
        if (url.pathname === "/api/auth/admin/logout" && request.method === "POST") {
          return await handleAdminLogoutRequest(request);
        }
        if (url.pathname === "/api/auth/all-sessions" && request.method === "GET") {
          return await handleAllSessionsRequest(request);
        }
        return new Response("Not found", { status: 404 });
      }

      // Order & Delivery API routes
      if (url.pathname === "/api/orders" && request.method === "GET") {
        return await handleGetOrders(request);
      }
      if (url.pathname === "/api/orders/refund" && request.method === "POST") {
        return await handleRefundOrder(request);
      }
      if (url.pathname === "/api/orders/invoice" && request.method === "GET") {
        return await handleGetOrderInvoice(request);
      }
      if (url.pathname === "/api/delivery/retry" && request.method === "POST") {
        return await handleRetryDelivery(request);
      }

      // Profile API route
      if (url.pathname === "/api/profile" && request.method === "GET") {
        return await handleGetProfile(request);
      }

      // Upload API route
      if (url.pathname === "/api/upload" && request.method === "POST") {
        const rl = checkRateLimit(request, { limit: 20, label: "upload" });
        if (rl) return rl;
        return await handleUpload(request);
      }

      // Admin & Employee API routes
      if (url.pathname.startsWith("/api/admin/")) {
        const route = url.pathname;
        const method = request.method;
        if (route === "/api/admin/stats" && method === "GET") return await handleAdminDashboardStats(request);
        if (route === "/api/admin/products" && method === "GET") return await handleAdminGetProducts(request);
        if (route === "/api/admin/products/create" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "admin-product-create" });
          if (rl) return rl;
          return await handleAdminCreateProduct(request);
        }
        if (route === "/api/admin/products/update" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 15, label: "admin-product-update" });
          if (rl) return rl;
          return await handleAdminUpdateProduct(request);
        }
        if (route === "/api/admin/products/delete" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "admin-product-delete" });
          if (rl) return rl;
          return await handleAdminDeleteProduct(request);
        }
        if (route === "/api/admin/orders" && method === "GET") return await handleAdminGetOrders(request);
        if (route === "/api/admin/orders/update" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 20, label: "admin-order-update" });
          if (rl) return rl;
          return await handleAdminUpdateOrderStatus(request);
        }
        if (route === "/api/admin/orders/refund" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "admin-order-refund" });
          if (rl) return rl;
          return await handleRefundOrder(request);
        }
        if (route === "/api/admin/tickets/reply" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 30, label: "admin-ticket-reply" });
          if (rl) return rl;
          return await handleAdminReplyTicket(request);
        }
        if (route === "/api/admin/tickets/resolve" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 15, label: "admin-ticket-resolve" });
          if (rl) return rl;
          return await handleAdminResolveTicket(request);
        }
        if (route === "/api/admin/customers" && method === "GET") return await handleAdminGetCustomers(request);
        if (route === "/api/admin/employees" && method === "GET") return await handleAdminGetEmployees(request);
        if (route === "/api/admin/employees/create" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "admin-employee-create" });
          if (rl) return rl;
          return await handleAdminCreateEmployee(request);
        }
        if (route === "/api/admin/employees/update" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 15, label: "admin-employee-update" });
          if (rl) return rl;
          return await handleAdminUpdateEmployee(request);
        }
        if (route === "/api/admin/employees/delete" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "admin-employee-delete" });
          if (rl) return rl;
          return await handleAdminDeleteEmployee(request);
        }
        if (route === "/api/admin/logs" && method === "GET") return await handleAdminGetLogs(request);
        if (route === "/api/admin/permissions" && method === "GET") return await handleAdminGetPermissions(request);
        if (route === "/api/admin/permissions/update" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "admin-permissions-update" });
          if (rl) return rl;
          return await handleAdminUpdatePermissions(request);
        }

        if (route === "/api/admin/platform/stats" && method === "GET") return await handleAdminPlatformStats(request);
        if (route === "/api/admin/platform/tournaments" && method === "GET") return await handleAdminMonitorTournaments(request);
        if (route === "/api/admin/platform/employees" && method === "GET") return await handleAdminMonitorEmployees(request);
        if (route === "/api/admin/platform/logs" && method === "GET") return await handleAdminPlatformLogs(request);
        if (route === "/api/admin/platform/tournament-actions" && method === "GET") return await handleAdminTournamentActions(request);
        if (route === "/api/admin/platform/players" && method === "GET") return await handleAdminAllPlayers(request);
        if (route === "/api/admin/platform/send-notification" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "admin-send-notif" });
          if (rl) return rl;
          return await handleAdminSendGlobalNotification(request);
        }

        if (route === "/api/admin/deliveries" && method === "GET") return await handleAdminGetDeliveries(request);
        if (route === "/api/admin/deliveries/resend" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "admin-delivery-resend" });
          if (rl) return rl;
          return await handleAdminResendDelivery(request);
        }

        if (route === "/api/admin/streams/approve" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "admin-stream-approve" });
          if (rl) return rl;
          return await handleAdminApproveStream(request);
        }
        if (route === "/api/admin/streams/remove" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "admin-stream-remove" });
          if (rl) return rl;
          return await handleAdminRemoveStream(request);
        }
        if (route === "/api/admin/streams/blacklist" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "admin-stream-blacklist" });
          if (rl) return rl;
          return await handleAdminBlacklistChannel(request);
        }
        if (route === "/api/admin/streams/featured" && method === "GET") return await handleAdminGetFeaturedStreams(request);

        return new Response("Not found", { status: 404 });
      }

      // Contact API route
      if (url.pathname === "/api/contact" && request.method === "POST") {
        const rl = checkRateLimit(request, { limit: 5, label: "contact" });
        if (rl) return rl;
        return await handleContactRequest(request);
      }

      // Server Reviews API routes — cached 120s
      if (url.pathname === "/api/server-reviews" && request.method === "GET") {
        return cachedJson(request, 120, () => handleGetServerReviews());
      }
      if (url.pathname === "/api/server-reviews/submit" && request.method === "POST") {
        const rl = checkRateLimit(request, { limit: 5, label: "review-submit" });
        if (rl) return rl;
        return await handleSubmitServerReview(request);
      }

      // YouTube API routes
      if (url.pathname.startsWith("/api/youtube/")) {
        // Trigger background cache refresh if data is stale (never blocks the response)
        scheduleRefresh(ctx as { waitUntil: (p: Promise<unknown>) => void });

        if (url.pathname === "/api/youtube/status" && request.method === "GET") return await handleYouTubeStatus();
        if (url.pathname === "/api/youtube/videos" && request.method === "GET") return await handleYouTubeVideos();
        if (url.pathname === "/api/youtube/livestream" && request.method === "GET") return await handleYouTubeLivestream();
        if (url.pathname === "/api/youtube/community-streams" && request.method === "GET") return await handleYouTubeCommunityStreams();
        return new Response("Not found", { status: 404 });
      }

      // Discord API routes
      if (url.pathname.startsWith("/api/discord/")) {
        if (url.pathname === "/api/discord/status" && request.method === "GET") return await handleDiscordStatus();
        if (url.pathname === "/api/discord/events" && request.method === "GET") return await handleDiscordEvents();
        return new Response("Not found", { status: 404 });
      }

      // Notification API routes
      if (url.pathname === "/api/notifications" || url.pathname.startsWith("/api/notifications/")) {
        if (url.pathname === "/api/notifications" && request.method === "GET") return cachedJson(request, 30, () => handleGetNotifications(request));
        if (url.pathname === "/api/notifications/unread-count" && request.method === "GET") return await handleUnreadCount(request);
        if (url.pathname === "/api/notifications/mark-read" && request.method === "POST") return await handleMarkRead(request);
        if (url.pathname === "/api/notifications/mark-all-read" && request.method === "POST") return await handleMarkAllRead(request);
        return new Response("Not found", { status: 404 });
      }

      // Tournament API routes
      if (url.pathname.startsWith("/api/tournaments/")) {
        const route = url.pathname;
        const method = request.method;

        if (route === "/api/tournaments/public" && method === "GET") {
          await autoUpdateStatuses();
          return cachedJson(request, 60, () => handleGetPublicTournaments());
        }
        if (route === "/api/tournaments/detail" && method === "GET") return await handleGetTournamentById(request);
        if (route === "/api/tournaments/register" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "tournament-register" });
          if (rl) return rl;
          return await handleRegisterForTournament(request);
        }
        if (route === "/api/tournaments/registrations" && method === "GET") return await handleGetTournamentRegistrations(request);
        if (route === "/api/tournaments/brackets" && method === "GET") return await handleGetTournamentBrackets(request);

        if (route === "/api/tournaments/staff" && method === "GET") return await handleStaffGetTournaments(request);
        if (route === "/api/tournaments/staff/create" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "tournament-create" });
          if (rl) return rl;
          return await handleStaffCreateTournament(request);
        }
        if (route === "/api/tournaments/staff/update" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 15, label: "tournament-update" });
          if (rl) return rl;
          return await handleStaffUpdateTournament(request);
        }
        if (route === "/api/tournaments/staff/delete" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "tournament-delete" });
          if (rl) return rl;
          return await handleStaffDeleteTournament(request);
        }
        if (route === "/api/tournaments/staff/delete-registration" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "tournament-delete-reg" });
          if (rl) return rl;
          return await handleDeleteTournamentRegistration(request);
        }
        if (route === "/api/tournaments/staff/search-registrations" && method === "GET") return await handleStaffSearchRegistrations(request);
        if (route === "/api/tournaments/staff/export-registrations" && method === "GET") return await handleStaffExportRegistrations(request);
        if (route === "/api/tournaments/staff/start" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "tournament-start" });
          if (rl) return rl;
          return await handleStaffStartTournament(request);
        }
        if (route === "/api/tournaments/staff/end" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "tournament-end" });
          if (rl) return rl;
          return await handleStaffEndTournament(request);
        }

        if (route === "/api/tournaments/leaderboard" && method === "GET") return await handleGetTournamentLeaderboard(request);
        if (route === "/api/tournaments/matches" && method === "GET") return await handleGetTournamentMatches(request);

        if (route === "/api/tournaments/staff/generate-bracket" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "tournament-gen-bracket" });
          if (rl) return rl;
          return await handleStaffGenerateBracket(request);
        }
        if (route === "/api/tournaments/staff/update-match" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 30, label: "tournament-update-match" });
          if (rl) return rl;
          return await handleStaffUpdateMatch(request);
        }
        if (route === "/api/tournaments/staff/create-next-round" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "tournament-next-round" });
          if (rl) return rl;
          return await handleStaffCreateNextRound(request);
        }
        if (route === "/api/tournaments/staff/delete-matches" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "tournament-delete-matches" });
          if (rl) return rl;
          return await handleStaffDeleteMatches(request);
        }

        return new Response("Not found", { status: 404 });
      }

      // Employee Management API routes
      if (url.pathname.startsWith("/api/employee/")) {
        const route = url.pathname;
        const method = request.method;

        if (route === "/api/employee/stats" && method === "GET") return await handleEmployeeDashboardStats(request);

        if (route === "/api/employee/announcements" && method === "GET") return await handleGetAnnouncements(request);
        if (route === "/api/employee/announcements/create" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-announce-create" });
          if (rl) return rl;
          return await handleCreateAnnouncement(request);
        }
        if (route === "/api/employee/announcements/delete" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-announce-delete" });
          if (rl) return rl;
          return await handleDeleteAnnouncement(request);
        }

        if (route === "/api/employee/notifications" && method === "GET") return await handleGetSiteNotifications(request);
        if (route === "/api/employee/notifications/active" && method === "GET") return await handleGetActiveSiteNotifications();
        if (route === "/api/employee/notifications/create" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-notif-create" });
          if (rl) return rl;
          return await handleCreateSiteNotification(request);
        }
        if (route === "/api/employee/notifications/update" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 15, label: "emp-notif-update" });
          if (rl) return rl;
          return await handleUpdateSiteNotification(request);
        }
        if (route === "/api/employee/notifications/delete" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-notif-delete" });
          if (rl) return rl;
          return await handleDeleteSiteNotification(request);
        }

        if (route === "/api/employee/players/search" && method === "GET") return await handleSearchPlayers(request);
        if (route === "/api/employee/players/profile" && method === "GET") return await handleGetPlayerProfile(request);
        if (route === "/api/employee/players/note" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 20, label: "emp-player-note" });
          if (rl) return rl;
          return await handleAddPlayerNote(request);
        }
        if (route === "/api/employee/players/ban" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-player-ban" });
          if (rl) return rl;
          return await handleBanPlayer(request);
        }
        if (route === "/api/employee/players/unban" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-player-unban" });
          if (rl) return rl;
          return await handleUnbanPlayer(request);
        }
        if (route === "/api/employee/players/assign-rank" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-assign-rank" });
          if (rl) return rl;
          return await handleAssignRank(request);
        }
        if (route === "/api/employee/players/remove-rank" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-remove-rank" });
          if (rl) return rl;
          return await handleRemoveRank(request);
        }

        if (route === "/api/employee/products" && method === "GET") return await handleAdminGetProducts(request);
        if (route === "/api/employee/products/create" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-product-create" });
          if (rl) return rl;
          return await handleAdminCreateProduct(request);
        }
        if (route === "/api/employee/products/update" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 15, label: "emp-product-update" });
          if (rl) return rl;
          return await handleAdminUpdateProduct(request);
        }
        if (route === "/api/employee/products/delete" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 10, label: "emp-product-delete" });
          if (rl) return rl;
          return await handleAdminDeleteProduct(request);
        }

        if (route === "/api/employee/orders" && method === "GET") return await handleAdminGetOrders(request);
        if (route === "/api/employee/orders/update" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 20, label: "emp-order-update" });
          if (rl) return rl;
          return await handleAdminUpdateOrderStatus(request);
        }
        if (route === "/api/employee/orders/refund" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 5, label: "emp-order-refund" });
          if (rl) return rl;
          return await handleRefundOrder(request);
        }

        if (route === "/api/employee/tickets/reply" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 30, label: "emp-ticket-reply" });
          if (rl) return rl;
          return await handleAdminReplyTicket(request);
        }
        if (route === "/api/employee/tickets/resolve" && method === "POST") {
          const rl = checkRateLimit(request, { limit: 15, label: "emp-ticket-resolve" });
          if (rl) return rl;
          return await handleAdminResolveTicket(request);
        }

        return new Response("Not found", { status: 404 });
      }

      // Public products — cached 5 min
      if (url.pathname === "/api/products" && request.method === "GET") {
        return await cachedJson(request, 300, () =>
          commerceApiHandlers["/api/products"]!.GET!(request) as Promise<Response>,
        );
      }

      const apiHandler = commerceApiHandlers[url.pathname]?.[request.method];
      if (apiHandler) {
        return await apiHandler(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
