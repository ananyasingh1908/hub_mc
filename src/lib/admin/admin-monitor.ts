import { getAdminSession } from "@/lib/auth/admin-session";
import { getPrismaClient } from "@/lib/db/prisma";

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

  const prisma = await getPrismaClient();

  const [
    totalTournaments, upcomingTournaments, liveTournaments, completedTournaments,
    totalRegistrations, totalCustomers, totalEmployees, activeEmployees,
    totalOrders, totalRevenue, openTickets, totalNotifications,
    activeBans, recentLogs, recentRegistrations,
  ] = await Promise.all([
    prisma.tournament.count(),
    prisma.tournament.count({ where: { status: "UPCOMING" } }),
    prisma.tournament.count({ where: { status: "LIVE" } }),
    prisma.tournament.count({ where: { status: "COMPLETED" } }),
    prisma.tournamentRegistration.count(),
    prisma.customer.count(),
    prisma.employee.count(),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { total: true } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.siteNotification.count({ where: { active: true } }),
    prisma.playerBan.count({ where: { active: true } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { employee: { select: { displayName: true } } } }),
    prisma.tournamentRegistration.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { tournament: { select: { title: true } } } }),
  ]);

  return json({
    stats: {
      tournaments: { total: totalTournaments, upcoming: upcomingTournaments, live: liveTournaments, completed: completedTournaments },
      registrations: totalRegistrations,
      customers: totalCustomers,
      employees: { total: totalEmployees, active: activeEmployees },
      orders: totalOrders,
      revenue: Number(totalRevenue._sum.total ?? 0),
      openTickets,
      activeNotifications: totalNotifications,
      activeBans,
    },
    recentLogs: recentLogs.map((l) => ({
      id: l.id, action: l.action, entity: l.entity, details: l.details,
      severity: l.severity, createdAt: l.createdAt,
      employeeName: l.employee?.displayName ?? "System",
    })),
    recentRegistrations: recentRegistrations.map((r) => ({
      id: r.id, minecraftUsername: r.minecraftUsername,
      tournamentTitle: r.tournament.title, createdAt: r.createdAt,
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
  const skip = (page - 1) * limit;

  const prisma = await getPrismaClient();

  const where: any = {};
  if (status) where.status = status;
  if (search) where.title = { contains: search };

  const [tournaments, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      orderBy: { dateTime: "desc" },
      skip,
      take: limit,
      include: {
        _count: { select: { registrations: true } },
        registrations: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    prisma.tournament.count({ where }),
  ]);

  return json({
    tournaments: tournaments.map((t) => ({
      id: t.id, title: t.title, bannerUrl: t.bannerUrl, type: t.type,
      gameMode: t.gameMode, dateTime: t.dateTime,
      registrationDeadline: t.registrationDeadline,
      maxParticipants: t.maxParticipants,
      entryFee: t.entryFee ? Number(t.entryFee) : null,
      prizePool: t.prizePool, discordLink: t.discordLink, rules: t.rules,
      serverIp: t.serverIp, status: t.status,
      registrationsCount: t._count.registrations,
      recentRegistrations: t.registrations.map((r) => ({
        id: r.id, minecraftUsername: r.minecraftUsername,
        discordUsername: r.discordUsername, teamName: r.teamName,
        email: r.email, region: r.region, createdAt: r.createdAt,
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
  const skip = (page - 1) * limit;

  const prisma = await getPrismaClient();

  const where: any = {};
  if (search) {
    where.OR = [
      { displayName: { contains: search } },
      { department: { contains: search } },
      { user: { email: { contains: search } } },
    ];
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { email: true, name: true, image: true, role: true } },
        permissions: true,
        activityLogs: { orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { assignedTickets: true } },
      },
    }),
    prisma.employee.count({ where }),
  ]);

  return json({
    employees: employees.map((e) => ({
      id: e.id, userId: e.userId, displayName: e.displayName,
      department: e.department, isActive: e.isActive,
      disabledAt: e.disabledAt, createdAt: e.createdAt,
      email: e.user?.email ?? "", role: e.user?.role ?? "EMPLOYEE",
      ticketCount: e._count.assignedTickets,
      permissions: e.permissions ? {
        products: e.permissions.products, orders: e.permissions.orders,
        support: e.permissions.support, customers: e.permissions.customers,
        employees: e.permissions.employees, logs: e.permissions.logs,
        settings: e.permissions.settings, tournaments: e.permissions.tournaments,
        notifications: e.permissions.notifications, playerManage: e.permissions.playerManage,
      } : null,
      recentActivity: e.activityLogs.map((l) => ({
        id: l.id, action: l.action, entity: l.entity,
        details: l.details, severity: l.severity, createdAt: l.createdAt,
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
  const skip = (page - 1) * limit;

  const prisma = await getPrismaClient();

  const where: any = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (severity) where.severity = severity;
  if (search) {
    where.OR = [
      { details: { contains: search } },
      { entityId: { contains: search } },
      { employee: { displayName: { contains: search } } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { employee: { select: { displayName: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return json({
    logs: logs.map((l) => ({
      id: l.id, action: l.action, entity: l.entity,
      entityId: l.entityId, details: l.details,
      severity: l.severity, ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      employeeName: l.employee?.displayName ?? "System",
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ─── PLATFORM OVERVIEW (for admin index) ──────────────────────

export async function handleAdminTournamentActions(request: Request) {
  const authErr = await requireSuperAdmin(request);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "7");

  const prisma = await getPrismaClient();
  const since = new Date(Date.now() - days * 86400000);

  const tournamentLogs = await prisma.activityLog.findMany({
    where: {
      entity: "tournament",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { displayName: true } } },
  });

  const announcementLogs = await prisma.tournamentAnnouncement.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    include: { tournament: { select: { title: true } } },
  });

  return json({
    tournamentActions: tournamentLogs.map((l) => ({
      id: l.id, action: l.action, details: l.details,
      employeeName: l.employee?.displayName ?? "System",
      createdAt: l.createdAt,
    })),
    recentAnnouncements: announcementLogs.map((a) => ({
      id: a.id, title: a.title, message: a.message, type: a.type,
      tournamentTitle: a.tournament.title,
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
  const skip = (page - 1) * limit;

  const prisma = await getPrismaClient();

  const where: any = {};
  if (search) {
    where.OR = [
      { minecraftUsername: { contains: search } },
      { minecraftUuid: { contains: search } },
      { user: { email: { contains: search } } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { lastLoginAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, email: true, role: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const customerIds = customers.map((c) => c.id);
  const rankMap = new Map<string, string[]>();
  if (customerIds.length > 0) {
    const ranks = await prisma.playerRank.findMany({
      where: { customerId: { in: customerIds }, active: true },
    });
    for (const r of ranks) {
      const existing = rankMap.get(r.customerId!) || [];
      existing.push(r.rank);
      rankMap.set(r.customerId!, existing);
    }
  }

  return json({
    players: customers.map((c) => ({
      id: c.id, minecraftUsername: c.minecraftUsername,
      minecraftUuid: c.minecraftUuid, country: c.country,
      avatarUrl: c.avatarUrl, lastLoginAt: c.lastLoginAt,
      createdAt: c.createdAt, email: c.user?.email ?? "",
      role: c.user?.role ?? "CUSTOMER",
      ordersCount: c._count.orders,
      ranks: rankMap.get(c.id) || [],
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

  const prisma = await getPrismaClient();
  const notif = await prisma.siteNotification.create({
    data: {
      title,
      message,
      type: type || "INFO",
      link: link || undefined,
      startAt: new Date(),
    },
  });

  return json({ ok: true, notification: notif }, 201);
}
