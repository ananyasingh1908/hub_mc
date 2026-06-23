import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import {
  tournaments,
  tournamentRegistrations,
  customers,
  employees,
  rolePermissions,
  orders,
  supportTickets,
  siteNotifications,
  notifications,
  playerBans,
  playerNotes,
  activityLogs,
  tournamentAnnouncements,
  playerRanks,
  users,
  serverReviews,
  forumThreads,
  forumReplies,
} from "@/lib/db/schema";
import { count, eq, inArray, like, desc, and, or, sql, gte } from "drizzle-orm";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function error(msg: string, status: number) {
  return json({ error: msg }, status);
}

async function requireSuperAdmin(request: Request): Promise<Response | null> {
  const session = await getAdminSession(request);
  if (!session || session.role !== "SUPER_ADMIN") {
    return json({ error: "Unauthorized — Super Admin only" }, 401);
  }
  return null;
}

// ─── PLATFORM DASHBOARD STATS ─────────────────────────────────

export async function handleAdminPlatformStats(request: Request) {
  const authErr = await requireSuperAdmin(request);
  if (authErr) return authErr;

  const [
    totalTournaments,
    upcomingTournaments,
    liveTournaments,
    completedTournaments,
    totalRegistrations,
    totalCustomers,
    totalEmployees,
    activeEmployees,
    totalOrders,
    revenueRows,
    openTickets,
    totalNotifications,
    activeBans,
  ] = await Promise.all([
    db.select({ count: count() }).from(tournaments),
    db.select({ count: count() }).from(tournaments).where(eq(tournaments.status, "UPCOMING")),
    db.select({ count: count() }).from(tournaments).where(eq(tournaments.status, "LIVE")),
    db.select({ count: count() }).from(tournaments).where(eq(tournaments.status, "COMPLETED")),
    db.select({ count: count() }).from(tournamentRegistrations),
    db.select({ count: count() }).from(customers),
    db.select({ count: count() }).from(employees),
    db.select({ count: count() }).from(employees).where(eq(employees.isActive, true)),
    db.select({ count: count() }).from(orders),
    db.select({ total: sql<string | null>`cast(sum(${orders.total}) as char)` }).from(orders),
    db.select({ count: count() }).from(supportTickets).where(inArray(supportTickets.status, ["OPEN", "IN_PROGRESS"])),
    db.select({ count: count() }).from(siteNotifications).where(eq(siteNotifications.active, true)),
    db.select({ count: count() }).from(playerBans).where(eq(playerBans.active, true)),
  ]);

  const recentLogs = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entity: activityLogs.entity,
      details: activityLogs.details,
      severity: activityLogs.severity,
      createdAt: activityLogs.createdAt,
      employeeName: employees.displayName,
    })
    .from(activityLogs)
    .leftJoin(employees, eq(activityLogs.employeeId, employees.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(10);

  const recentRegistrations = await db
    .select({
      id: tournamentRegistrations.id,
      minecraftUsername: tournamentRegistrations.minecraftUsername,
      tournamentTitle: tournaments.title,
      createdAt: tournamentRegistrations.createdAt,
    })
    .from(tournamentRegistrations)
    .leftJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .orderBy(desc(tournamentRegistrations.createdAt))
    .limit(5);

  return json({
    stats: {
      tournaments: {
        total: Number(totalTournaments[0]?.count ?? 0),
        upcoming: Number(upcomingTournaments[0]?.count ?? 0),
        live: Number(liveTournaments[0]?.count ?? 0),
        completed: Number(completedTournaments[0]?.count ?? 0),
      },
      registrations: Number(totalRegistrations[0]?.count ?? 0),
      customers: Number(totalCustomers[0]?.count ?? 0),
      employees: {
        total: Number(totalEmployees[0]?.count ?? 0),
        active: Number(activeEmployees[0]?.count ?? 0),
      },
      orders: Number(totalOrders[0]?.count ?? 0),
      revenue: Number(revenueRows[0]?.total ?? 0),
      openTickets: Number(openTickets[0]?.count ?? 0),
      activeNotifications: Number(totalNotifications[0]?.count ?? 0),
      activeBans: Number(activeBans[0]?.count ?? 0),
    },
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      details: l.details,
      severity: l.severity,
      createdAt: l.createdAt,
      employeeName: l.employeeName ?? "System",
    })),
    recentRegistrations: recentRegistrations.map((r) => ({
      id: r.id,
      minecraftUsername: r.minecraftUsername,
      tournamentTitle: r.tournamentTitle ?? "",
      createdAt: r.createdAt,
    })),
  });
}

// ─── TOURNAMENT MONITORING ────────────────────────────────────

export async function handleAdminMonitorTournaments(request: Request) {
  const authErr = await requireSuperAdmin(request);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) conditions.push(eq(tournaments.status, status as any));
  if (search) conditions.push(like(tournaments.title, `%${search}%`));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [tournamentRows, totalRows] = await Promise.all([
    db
      .select()
      .from(tournaments)
      .where(whereClause)
      .orderBy(desc(tournaments.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(tournaments).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const tournamentIds = tournamentRows.map((t) => t.id);

  const [regCountRows, announceRows] = await Promise.all([
    tournamentIds.length > 0
      ? db
          .select({ tournamentId: tournamentRegistrations.tournamentId, count: count() })
          .from(tournamentRegistrations)
          .where(inArray(tournamentRegistrations.tournamentId, tournamentIds))
          .groupBy(tournamentRegistrations.tournamentId)
      : [],
    tournamentIds.length > 0
      ? db
          .select()
          .from(tournamentAnnouncements)
          .where(inArray(tournamentAnnouncements.tournamentId, tournamentIds))
      : [],
  ]);

  const regCountMap = new Map(regCountRows.map((r) => [r.tournamentId, Number(r.count)]));
  const announceByTournament = new Map<string, typeof announceRows>();
  for (const a of announceRows) {
    if (!a.tournamentId) continue;
    const list = announceByTournament.get(a.tournamentId) ?? [];
    list.push(a);
    announceByTournament.set(a.tournamentId, list);
  }

  return json({
    tournaments: tournamentRows.map((t) => ({
      id: t.id,
      title: t.title,
      game: t.game,
      status: t.status,
      entryFee: t.entryFee,
      maxPlayers: t.maxPlayers,
      startDate: t.startDate,
      createdAt: t.createdAt,
      registrationCount: regCountMap.get(t.id) ?? 0,
      announcements: (announceByTournament.get(t.id) ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        createdAt: a.createdAt,
      })),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ─── EMPLOYEE MONITORING ──────────────────────────────────────

export async function handleAdminMonitorEmployees(request: Request) {
  const authErr = await requireSuperAdmin(request);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(employees.displayName, `%${search}%`),
        like(employees.department, `%${search}%`),
      )!,
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [employeeRows, totalRows] = await Promise.all([
    db
      .select({
        id: employees.id,
        userId: employees.userId,
        displayName: employees.displayName,
        department: employees.department,
        isActive: employees.isActive,
        disabledAt: employees.disabledAt,
        createdAt: employees.createdAt,
        email: users.email,
        role: users.role,
      })
      .from(employees)
      .leftJoin(users, eq(employees.userId, users.id))
      .where(whereClause)
      .orderBy(desc(employees.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(employees).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const employeeIds = employeeRows.map((e) => e.id);

  const [permRows, activityRows, ticketCountRows] = await Promise.all([
    employeeIds.length > 0
      ? db.select().from(rolePermissions).where(inArray(rolePermissions.employeeId, employeeIds))
      : [],
    employeeIds.length > 0
      ? db
          .select()
          .from(activityLogs)
          .where(inArray(activityLogs.employeeId, employeeIds))
          .orderBy(desc(activityLogs.createdAt))
      : [],
    employeeIds.length > 0
      ? db
          .select({ assignedToId: supportTickets.assignedToId, count: count() })
          .from(supportTickets)
          .where(inArray(supportTickets.assignedToId, employeeIds))
          .groupBy(supportTickets.assignedToId)
      : [],
  ]);

  const permMap = new Map(permRows.map((p) => [p.employeeId, p]));
  const ticketCountMap = new Map(ticketCountRows.map((r) => [r.assignedToId, Number(r.count)]));

  const activityByEmployee = new Map<string, typeof activityRows>();
  for (const a of activityRows) {
    if (!a.employeeId) continue;
    const list = activityByEmployee.get(a.employeeId) ?? [];
    if (list.length < 10) {
      list.push(a);
      activityByEmployee.set(a.employeeId, list);
    }
  }

  return json({
    employees: employeeRows.map((e) => ({
      id: e.id,
      userId: e.userId,
      displayName: e.displayName,
      department: e.department,
      isActive: e.isActive,
      disabledAt: e.disabledAt,
      createdAt: e.createdAt,
      email: e.email ?? "",
      role: e.role ?? "EMPLOYEE",
      ticketCount: ticketCountMap.get(e.id) ?? 0,
      permissions: (() => {
        const p = permMap.get(e.id);
        if (!p) return null;
        return {
          products: p.products,
          orders: p.orders,
          support: p.support,
          customers: p.customers,
          employees: p.employees,
          logs: p.logs,
          settings: p.settings,
          tournaments: p.tournaments,
          notifications: p.notifications,
          playerManage: p.playerManage,
        };
      })(),
      recentActivity: (activityByEmployee.get(e.id) ?? []).map((l) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        details: l.details,
        severity: l.severity,
        createdAt: l.createdAt,
      })),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ─── PLATFORM ACTIVITY LOGS ───────────────────────────────────

export async function handleAdminPlatformLogs(request: Request) {
  const authErr = await requireSuperAdmin(request);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") || "";
  const action = url.searchParams.get("action") || "";
  const severity = url.searchParams.get("severity") || "";
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (entity) conditions.push(eq(activityLogs.entity, entity));
  if (action) conditions.push(eq(activityLogs.action, action));
  if (severity) conditions.push(eq(activityLogs.severity, severity));
  if (search) {
    conditions.push(
      or(
        like(activityLogs.details, `%${search}%`),
        like(activityLogs.entityId, `%${search}%`),
      )!,
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [logRows, totalRows] = await Promise.all([
    db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        entity: activityLogs.entity,
        entityId: activityLogs.entityId,
        details: activityLogs.details,
        severity: activityLogs.severity,
        ipAddress: activityLogs.ipAddress,
        createdAt: activityLogs.createdAt,
        employeeName: employees.displayName,
      })
      .from(activityLogs)
      .leftJoin(employees, eq(activityLogs.employeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(activityLogs).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);

  return json({
    logs: logRows.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      details: l.details,
      severity: l.severity,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      employeeName: l.employeeName ?? "System",
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ─── TOURNAMENT ACTIONS (for admin overview) ──────────────────

export async function handleAdminTournamentActions(request: Request) {
  const authErr = await requireSuperAdmin(request);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "7");
  const since = new Date(Date.now() - days * 86400000);

  const [tournamentLogs, announcementLogs] = await Promise.all([
    db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        details: activityLogs.details,
        createdAt: activityLogs.createdAt,
        employeeName: employees.displayName,
      })
      .from(activityLogs)
      .leftJoin(employees, eq(activityLogs.employeeId, employees.id))
      .where(and(eq(activityLogs.entity, "tournament"), gte(activityLogs.createdAt, since)))
      .orderBy(desc(activityLogs.createdAt)),
    db
      .select({
        id: tournamentAnnouncements.id,
        title: tournamentAnnouncements.title,
        message: tournamentAnnouncements.message,
        type: tournamentAnnouncements.type,
        tournamentTitle: tournaments.title,
        createdAt: tournamentAnnouncements.createdAt,
      })
      .from(tournamentAnnouncements)
      .leftJoin(tournaments, eq(tournamentAnnouncements.tournamentId, tournaments.id))
      .where(gte(tournamentAnnouncements.createdAt, since))
      .orderBy(desc(tournamentAnnouncements.createdAt)),
  ]);

  return json({
    tournamentActions: tournamentLogs.map((l) => ({
      id: l.id,
      action: l.action,
      details: l.details,
      employeeName: l.employeeName ?? "System",
      createdAt: l.createdAt,
    })),
    recentAnnouncements: announcementLogs.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      type: a.type,
      tournamentTitle: a.tournamentTitle ?? "",
      createdAt: a.createdAt,
    })),
  });
}

// ─── PLAYER MONITORING ────────────────────────────────────────

export async function handleAdminAllPlayers(request: Request) {
  const authErr = await requireSuperAdmin(request);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(customers.fullName, `%${search}%`),
        like(customers.minecraftUsername, `%${search}%`),
        like(customers.phoneNumber, `%${search}%`),
      )!,
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [customerRows, totalRows] = await Promise.all([
    db
      .select({
        id: customers.id,
        userId: customers.userId,
        fullName: customers.fullName,
        phoneNumber: customers.phoneNumber,
        minecraftUsername: customers.minecraftUsername,
        minecraftUuid: customers.minecraftUuid,
        country: customers.country,
        avatarUrl: customers.avatarUrl,
        lastLoginAt: customers.lastLoginAt,
        createdAt: customers.createdAt,
        email: users.email,
        role: users.role,
        authProvider: customers.authProvider,
      })
      .from(customers)
      .leftJoin(users, eq(customers.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(customers.lastLoginAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(customers).where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const customerIds = customerRows.map((c) => c.id);
  const userIds = customerRows.map((c) => c.userId).filter(Boolean) as string[];

  const [orderCountRows, rankRows, regCountRows, ticketCountRows] = await Promise.all([
    customerIds.length > 0
      ? db
          .select({ customerId: orders.customerId, count: count() })
          .from(orders)
          .where(inArray(orders.customerId, customerIds))
          .groupBy(orders.customerId)
      : [],
    customerIds.length > 0
      ? db
          .select()
          .from(playerRanks)
          .where(and(inArray(playerRanks.customerId, customerIds), eq(playerRanks.active, true)))
      : [],
    userIds.length > 0
      ? db
          .select({ userId: tournamentRegistrations.userId, count: count() })
          .from(tournamentRegistrations)
          .where(inArray(tournamentRegistrations.userId, userIds))
          .groupBy(tournamentRegistrations.userId)
      : [],
    userIds.length > 0
      ? db
          .select({ userId: supportTickets.userId, count: count() })
          .from(supportTickets)
          .where(inArray(supportTickets.userId, userIds))
          .groupBy(supportTickets.userId)
      : [],
  ]);

  const orderCountMap = new Map(orderCountRows.map((r) => [r.customerId, Number(r.count)]));
  const regCountMap = new Map(regCountRows.map((r) => [r.userId!, Number(r.count)]));
  const ticketCountMap = new Map(ticketCountRows.map((r) => [r.userId!, Number(r.count)]));

  const rankMap = new Map<string, string[]>();
  for (const r of rankRows) {
    if (!r.customerId) continue;
    const existing = rankMap.get(r.customerId) ?? [];
    existing.push(r.rank);
    rankMap.set(r.customerId, existing);
  }

  return json({
    players: customerRows.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      minecraftUsername: c.minecraftUsername,
      minecraftUuid: c.minecraftUuid,
      country: c.country,
      avatarUrl: c.avatarUrl,
      lastLoginAt: c.lastLoginAt,
      createdAt: c.createdAt,
      email: c.email ?? "",
      role: c.role ?? "CUSTOMER",
      authProvider: c.authProvider ?? "phone",
      orders: orderCountMap.get(c.id) ?? 0,
      tickets: c.userId ? (ticketCountMap.get(c.userId) ?? 0) : 0,
      registrations: c.userId ? (regCountMap.get(c.userId) ?? 0) : 0,
      rank: (() => { const ranks = rankMap.get(c.id); return ranks && ranks.length > 0 ? { name: ranks[0], color: "#8b5cf6" } : null; })(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ─── NOTIFICATIONS ────────────────────────────────────────────

export async function handleAdminSendGlobalNotification(request: Request) {
  const authErr = await requireSuperAdmin(request);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { title, message, type, link } = body;
  if (!title || !message) return error("Missing title or message", 400);

  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(siteNotifications).values({
    id,
    title,
    message,
    type: type || "INFO",
    link: link || null,
    startAt: now,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  const notifRows = await db.select().from(siteNotifications).where(eq(siteNotifications.id, id)).limit(1);

  return json({ ok: true, notification: notifRows[0] }, 201);
}

// ─── DELETE PLAYER (Admin only) ──────────────────────────────

export async function handleAdminDeletePlayer(request: Request) {
  const authErr = await requireSuperAdmin(request);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { customerId } = body;
  if (!customerId) return error("Missing customerId", 400);

  try {
    const existingRows = await db
      .select({ id: customers.id, userId: customers.userId })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!existingRows[0]) return error("Player not found", 404);

    const customer = existingRows[0];
    const userId = customer.userId;

    // Check for orders — block deletion if player has financial history
    const orderCountRows = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.customerId, customerId));
    const orderCount = Number(orderCountRows[0]?.count ?? 0);

    if (orderCount > 0) {
      return error(`Cannot delete player with ${orderCount} order(s). Order history must be preserved.`, 400);
    }

    // Check for tournament registrations — block if exists (registrations link by userId)
    if (userId) {
      const regCountRows = await db
        .select({ count: count() })
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.userId, userId));
      const regCount = Number(regCountRows[0]?.count ?? 0);

      if (regCount > 0) {
        return error(`Cannot delete player with ${regCount} tournament registration(s). Tournament history must be preserved.`, 400);
      }
    }

    // Safe to delete — no orders, no tournament registrations
    // Delete related data in order (non-cascade schema)
    await db.delete(playerBans).where(eq(playerBans.customerId, customerId));
    await db.delete(playerNotes).where(eq(playerNotes.customerId, customerId));
    await db.delete(playerRanks).where(eq(playerRanks.customerId, customerId));

    if (userId) {
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(supportTickets).where(eq(supportTickets.userId, userId));
      await db.delete(serverReviews).where(eq(serverReviews.userId, userId));
      await db.delete(forumThreads).where(eq(forumThreads.authorId, userId));
      await db.delete(forumReplies).where(eq(forumReplies.authorId, userId));
    }

    // Delete the customer record
    await db.delete(customers).where(eq(customers.id, customerId));

    // Delete the linked user account
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }

    return json({ ok: true, message: "Player record deleted successfully" });
  } catch (e: any) {
    console.error("Delete player error:", e);
    return error(`Delete failed: ${e.message || "Unknown database error"}`, 500);
  }
}
