import { devlog } from "@/lib/dev-log"; 
import "./lib/error-capture";
import { handleUpload } from "@/lib/upload/upload-handler";
import { checkRateLimit } from "@/lib/rate-limiter";
import { cachedJson } from "@/lib/response-cache";

const _GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const _GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const _SUPER_ADMIN_ID = process.env.SUPER_ADMIN_ID || "";
const _SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "";
const _JWT_SECRET = process.env.JWT_SECRET || "";

if (!_JWT_SECRET) console.warn("[ENV] JWT_SECRET is not set");
if (!_GOOGLE_CLIENT_ID) console.warn("[ENV] GOOGLE_CLIENT_ID is not set");
if (!_GOOGLE_CLIENT_SECRET) console.warn("[ENV] GOOGLE_CLIENT_SECRET is not set");
if (!_SUPER_ADMIN_ID) console.warn("[ENV] SUPER_ADMIN_ID is not set");
if (!_SUPER_ADMIN_PASSWORD) console.warn("[ENV] SUPER_ADMIN_PASSWORD is not set");
if (_GOOGLE_CLIENT_ID) devlog("[ENV] GOOGLE_CLIENT_ID is configured");
if (_SUPER_ADMIN_ID && _SUPER_ADMIN_PASSWORD) devlog("[ENV] Super admin credentials are configured");

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
  handleCreateOrder,
  handleVerifyPayment,
} from "@/lib/commerce/payment-handlers";
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
  handleUpdateAnnouncement,
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
import { scheduleRefresh } from "@/lib/youtube/youtube-cache";
import { handleDiscordStatus, handleDiscordEvents } from "@/lib/discord/discord-handler";
import { handleGetNotifications, handleUnreadCount, handleMarkRead, handleMarkAllRead } from "@/lib/notifications/notification-handler";
import { handleGetProfile } from "@/lib/profile/profile-handlers";

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
    try {
      const url = new URL(request.url);

      // Health check
      if (url.pathname === "/api/health" && request.method === "GET") {
        return Response.json({
          status: "ok",
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "production",
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

      // Payment API routes (disabled — purchases are now manual via Discord)
      if (url.pathname === "/api/payment/create-order" && request.method === "POST") {
        return new Response(JSON.stringify({ error: "Online payments are currently disabled. Please use Discord." }), {
          status: 503, headers: { "content-type": "application/json" },
        });
      }
      if (url.pathname === "/api/payment/verify" && request.method === "POST") {
        return new Response(JSON.stringify({ error: "Online payments are currently disabled. Please use Discord." }), {
          status: 503, headers: { "content-type": "application/json" },
        });
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
        if (route === "/api/admin/products/create" && method === "POST") return await handleAdminCreateProduct(request);
        if (route === "/api/admin/products/update" && method === "POST") return await handleAdminUpdateProduct(request);
        if (route === "/api/admin/products/delete" && method === "POST") return await handleAdminDeleteProduct(request);
        if (route === "/api/admin/orders" && method === "GET") return await handleAdminGetOrders(request);
        if (route === "/api/admin/orders/update" && method === "POST") return await handleAdminUpdateOrderStatus(request);
        if (route === "/api/admin/orders/refund" && method === "POST") return await handleRefundOrder(request);
        if (route === "/api/admin/tickets" && method === "GET") return await handleAdminGetTickets(request);
        if (route === "/api/admin/tickets/reply" && method === "POST") return await handleAdminReplyTicket(request);
        if (route === "/api/admin/tickets/resolve" && method === "POST") return await handleAdminResolveTicket(request);
        if (route === "/api/admin/customers" && method === "GET") return await handleAdminGetCustomers(request);
        if (route === "/api/admin/employees" && method === "GET") return await handleAdminGetEmployees(request);
        if (route === "/api/admin/employees/create" && method === "POST") return await handleAdminCreateEmployee(request);
        if (route === "/api/admin/employees/update" && method === "POST") return await handleAdminUpdateEmployee(request);
        if (route === "/api/admin/employees/delete" && method === "POST") return await handleAdminDeleteEmployee(request);
        if (route === "/api/admin/logs" && method === "GET") return await handleAdminGetLogs(request);
        if (route === "/api/admin/permissions" && method === "GET") return await handleAdminGetPermissions(request);
        if (route === "/api/admin/permissions/update" && method === "POST") return await handleAdminUpdatePermissions(request);

        if (route === "/api/admin/platform/stats" && method === "GET") return await handleAdminPlatformStats(request);
        if (route === "/api/admin/platform/tournaments" && method === "GET") return await handleAdminMonitorTournaments(request);
        if (route === "/api/admin/platform/employees" && method === "GET") return await handleAdminMonitorEmployees(request);
        if (route === "/api/admin/platform/logs" && method === "GET") return await handleAdminPlatformLogs(request);
        if (route === "/api/admin/platform/tournament-actions" && method === "GET") return await handleAdminTournamentActions(request);
        if (route === "/api/admin/platform/players" && method === "GET") return await handleAdminAllPlayers(request);
        if (route === "/api/admin/platform/send-notification" && method === "POST") return await handleAdminSendGlobalNotification(request);

        if (route === "/api/admin/deliveries" && method === "GET") return await handleAdminGetDeliveries(request);
        if (route === "/api/admin/deliveries/resend" && method === "POST") return await handleAdminResendDelivery(request);

        if (route === "/api/admin/streams/approve" && method === "POST") return await handleAdminApproveStream(request);
        if (route === "/api/admin/streams/remove" && method === "POST") return await handleAdminRemoveStream(request);
        if (route === "/api/admin/streams/blacklist" && method === "POST") return await handleAdminBlacklistChannel(request);
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
        if (route === "/api/tournaments/staff/create" && method === "POST") return await handleStaffCreateTournament(request);
        if (route === "/api/tournaments/staff/update" && method === "POST") return await handleStaffUpdateTournament(request);
        if (route === "/api/tournaments/staff/delete" && method === "POST") return await handleStaffDeleteTournament(request);
        if (route === "/api/tournaments/staff/delete-registration" && method === "POST") return await handleDeleteTournamentRegistration(request);
        if (route === "/api/tournaments/staff/search-registrations" && method === "GET") return await handleStaffSearchRegistrations(request);
        if (route === "/api/tournaments/staff/export-registrations" && method === "GET") return await handleStaffExportRegistrations(request);
        if (route === "/api/tournaments/staff/start" && method === "POST") return await handleStaffStartTournament(request);
        if (route === "/api/tournaments/staff/end" && method === "POST") return await handleStaffEndTournament(request);

        if (route === "/api/tournaments/leaderboard" && method === "GET") return await handleGetTournamentLeaderboard(request);
        if (route === "/api/tournaments/matches" && method === "GET") return await handleGetTournamentMatches(request);

        if (route === "/api/tournaments/staff/generate-bracket" && method === "POST") return await handleStaffGenerateBracket(request);
        if (route === "/api/tournaments/staff/update-match" && method === "POST") return await handleStaffUpdateMatch(request);
        if (route === "/api/tournaments/staff/create-next-round" && method === "POST") return await handleStaffCreateNextRound(request);
        if (route === "/api/tournaments/staff/delete-matches" && method === "POST") return await handleStaffDeleteMatches(request);

        return new Response("Not found", { status: 404 });
      }

      // Employee Management API routes
      if (url.pathname.startsWith("/api/employee/")) {
        const route = url.pathname;
        const method = request.method;

        if (route === "/api/employee/stats" && method === "GET") return await handleEmployeeDashboardStats(request);

        if (route === "/api/employee/announcements" && method === "GET") return await handleGetAnnouncements(request);
        if (route === "/api/employee/announcements/create" && method === "POST") return await handleCreateAnnouncement(request);
        if (route === "/api/employee/announcements/update" && method === "POST") return await handleUpdateAnnouncement(request);
        if (route === "/api/employee/announcements/delete" && method === "POST") return await handleDeleteAnnouncement(request);

        if (route === "/api/employee/notifications" && method === "GET") return await handleGetSiteNotifications(request);
        if (route === "/api/employee/notifications/active" && method === "GET") return await handleGetActiveSiteNotifications();
        if (route === "/api/employee/notifications/create" && method === "POST") return await handleCreateSiteNotification(request);
        if (route === "/api/employee/notifications/update" && method === "POST") return await handleUpdateSiteNotification(request);
        if (route === "/api/employee/notifications/delete" && method === "POST") return await handleDeleteSiteNotification(request);

        if (route === "/api/employee/players/search" && method === "GET") return await handleSearchPlayers(request);
        if (route === "/api/employee/players/profile" && method === "GET") return await handleGetPlayerProfile(request);
        if (route === "/api/employee/players/note" && method === "POST") return await handleAddPlayerNote(request);
        if (route === "/api/employee/players/ban" && method === "POST") return await handleBanPlayer(request);
        if (route === "/api/employee/players/unban" && method === "POST") return await handleUnbanPlayer(request);
        if (route === "/api/employee/players/bans" && method === "GET") return await handleGetPlayerBans(request);
        if (route === "/api/employee/players/assign-rank" && method === "POST") return await handleAssignRank(request);
        if (route === "/api/employee/players/remove-rank" && method === "POST") return await handleRemoveRank(request);

        if (route === "/api/employee/products" && method === "GET") return await handleAdminGetProducts(request);
        if (route === "/api/employee/products/create" && method === "POST") return await handleAdminCreateProduct(request);
        if (route === "/api/employee/products/update" && method === "POST") return await handleAdminUpdateProduct(request);
        if (route === "/api/employee/products/delete" && method === "POST") return await handleAdminDeleteProduct(request);

        if (route === "/api/employee/orders" && method === "GET") return await handleAdminGetOrders(request);
        if (route === "/api/employee/orders/update" && method === "POST") return await handleAdminUpdateOrderStatus(request);
        if (route === "/api/employee/orders/refund" && method === "POST") return await handleRefundOrder(request);

        if (route === "/api/employee/tickets" && method === "GET") return await handleAdminGetTickets(request);
        if (route === "/api/employee/tickets/reply" && method === "POST") return await handleAdminReplyTicket(request);
        if (route === "/api/employee/tickets/resolve" && method === "POST") return await handleAdminResolveTicket(request);

        return new Response("Not found", { status: 404 });
      }

      // Public products — cached 5 min
      if (url.pathname === "/api/products" && request.method === "GET") {
        return cachedJson(request, 300, () =>
          commerceApiHandlers["/api/products"]!.GET!(request),
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
