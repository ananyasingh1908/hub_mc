import { getEmployeeSession } from "@/lib/auth/employee-session";
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

type StaffSession = { employeeId: string | null; email: string | null; role: string };

async function requireStaffRole(request: Request, roles: string[]): Promise<Response | null> {
  let session: StaffSession | null = null;
  if (roles.includes("SUPER_ADMIN")) {
    const s = await getAdminSession(request);
    if (s) session = { employeeId: s.sub, email: s.email, role: s.role };
  }
  if (!session && roles.includes("EMPLOYEE")) {
    const s = await getEmployeeSession(request);
    if (s) session = { employeeId: s.employeeId, email: s.email, role: s.role };
  }
  if (!session) return json({ error: "Unauthorized" }, 401);
  if (!roles.includes(session.role)) return json({ error: "Forbidden" }, 403);
  (request as any).__staffSession = session;
  return null;
}

function getStaffSession(request: Request): StaffSession | null {
  return (request as any).__staffSession ?? null;
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────────

export async function handleGetAnnouncements(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  const prisma = await getPrismaClient();

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId;

  const announcements = await prisma.tournamentAnnouncement.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return json({ announcements });
}

export async function handleCreateAnnouncement(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { tournamentId, title, message, type } = body;
  if (!tournamentId || !title || !message) return error("Missing required fields: tournamentId, title, message", 400);

  const prisma = await getPrismaClient();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return error("Tournament not found", 404);

  const announcement = await prisma.tournamentAnnouncement.create({
    data: { tournamentId, title, message, type: type || "INFO" },
  });

  return json({ ok: true, announcement }, 201);
}

export async function handleUpdateAnnouncement(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { id, title, message, type } = body;
  if (!id) return error("Missing announcement id", 400);

  const prisma = await getPrismaClient();
  const existing = await prisma.tournamentAnnouncement.findUnique({ where: { id } });
  if (!existing) return error("Announcement not found", 404);

  const data: any = {};
  if (title !== undefined) data.title = title;
  if (message !== undefined) data.message = message;
  if (type !== undefined) data.type = type;

  const announcement = await prisma.tournamentAnnouncement.update({ where: { id }, data });
  return json({ ok: true, announcement });
}

export async function handleDeleteAnnouncement(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { id } = body;
  if (!id) return error("Missing announcement id", 400);

  const prisma = await getPrismaClient();
  const existing = await prisma.tournamentAnnouncement.findUnique({ where: { id } });
  if (!existing) return error("Announcement not found", 404);

  await prisma.tournamentAnnouncement.delete({ where: { id } });
  return json({ ok: true });
}

// ─── SITE NOTIFICATIONS ───────────────────────────────────────

export async function handleGetSiteNotifications(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const prisma = await getPrismaClient();
  const [notifications, total] = await Promise.all([
    prisma.siteNotification.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.siteNotification.count(),
  ]);

  return json({
    notifications,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function handleGetActiveSiteNotifications() {
  const prisma = await getPrismaClient();
  const now = new Date();
  const notifications = await prisma.siteNotification.findMany({
    where: {
      active: true,
      startAt: { lte: now },
      OR: [{ expireAt: null }, { expireAt: { gte: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  return json({ notifications });
}

export async function handleCreateSiteNotification(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { title, message, type, link, startAt, expireAt } = body;
  if (!title || !message) return error("Missing required fields: title, message", 400);

  const prisma = await getPrismaClient();
  const notification = await prisma.siteNotification.create({
    data: {
      title,
      message,
      type: type || "INFO",
      link: link || undefined,
      startAt: startAt ? new Date(startAt) : new Date(),
      expireAt: expireAt ? new Date(expireAt) : undefined,
    },
  });

  return json({ ok: true, notification }, 201);
}

export async function handleUpdateSiteNotification(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { id, title, message, type, link, startAt, expireAt, active } = body;
  if (!id) return error("Missing notification id", 400);

  const prisma = await getPrismaClient();
  const existing = await prisma.siteNotification.findUnique({ where: { id } });
  if (!existing) return error("Notification not found", 404);

  const data: any = {};
  if (title !== undefined) data.title = title;
  if (message !== undefined) data.message = message;
  if (type !== undefined) data.type = type;
  if (link !== undefined) data.link = link;
  if (startAt !== undefined) data.startAt = new Date(startAt);
  if (expireAt !== undefined) data.expireAt = expireAt ? new Date(expireAt) : null;
  if (active !== undefined) data.active = active;

  const notification = await prisma.siteNotification.update({ where: { id }, data });
  return json({ ok: true, notification });
}

export async function handleDeleteSiteNotification(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { id } = body;
  if (!id) return error("Missing notification id", 400);

  const prisma = await getPrismaClient();
  await prisma.siteNotification.delete({ where: { id } });
  return json({ ok: true });
}

// ─── PLAYER MANAGEMENT ────────────────────────────────────────

export async function handleSearchPlayers(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
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
      { email: { contains: search } },
      { name: { contains: search } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { lastLoginAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
        _count: { select: { orders: true, supportTickets: true, serverReviews: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return json({
    players: customers.map((c) => ({
      id: c.id,
      userId: c.userId,
      minecraftUsername: c.minecraftUsername,
      minecraftUuid: c.minecraftUuid,
      avatarUrl: c.avatarUrl,
      country: c.country,
      lastLoginAt: c.lastLoginAt,
      createdAt: c.createdAt,
      user: c.user,
      ordersCount: c._count.orders,
      ticketsCount: c._count.supportTickets,
      reviewsCount: c._count.serverReviews,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function handleGetPlayerProfile(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  const username = url.searchParams.get("username");
  if (!customerId && !username) return error("Provide customerId or username", 400);

  const prisma = await getPrismaClient();

  const where: any = {};
  if (customerId) where.id = customerId;
  if (username) where.minecraftUsername = username;

  const customer = await prisma.customer.findFirst({
    where,
    include: {
      user: { select: { id: true, email: true, name: true, role: true, createdAt: true, Notification: { orderBy: { createdAt: "desc" }, take: 10 } } },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      supportTickets: { orderBy: { createdAt: "desc" }, take: 10 },
      serverReviews: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!customer) return error("Player not found", 404);

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { minecraftUsername: customer.minecraftUsername },
    orderBy: { createdAt: "desc" },
    include: { tournament: { select: { id: true, title: true, status: true } } },
  });

  const notes = await prisma.playerNote.findMany({
    where: { minecraftUsername: customer.minecraftUsername },
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { displayName: true } } },
  });

  const bans = await prisma.playerBan.findMany({
    where: { minecraftUsername: customer.minecraftUsername, active: true },
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { displayName: true } }, tournament: { select: { id: true, title: true } } },
  });

  const ranks = await prisma.playerRank.findMany({
    where: { minecraftUsername: customer.minecraftUsername, active: true },
    orderBy: { assignedAt: "desc" },
  });

  return json({
    customer: {
      id: customer.id,
      minecraftUsername: customer.minecraftUsername,
      minecraftUuid: customer.minecraftUuid,
      avatarUrl: customer.avatarUrl,
      country: customer.country,
      lastLoginAt: customer.lastLoginAt,
      createdAt: customer.createdAt,
      user: customer.user,
    },
    orders: customer.orders.map((o) => ({ id: o.id, status: o.status, deliveryStatus: o.deliveryStatus, total: Number(o.total), createdAt: o.createdAt })),
    tickets: customer.supportTickets.map((t) => ({ id: t.id, subject: t.subject, status: t.status, createdAt: t.createdAt })),
    reviews: customer.serverReviews,
    registrations,
    notes,
    bans,
    ranks,
  });
}

export async function handleAddPlayerNote(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;
  const session = getStaffSession(request);

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { minecraftUsername, note, severity } = body;
  if (!minecraftUsername || !note) return error("Missing required fields: minecraftUsername, note", 400);

  const prisma = await getPrismaClient();
  const entry = await prisma.playerNote.create({
    data: {
      minecraftUsername,
      note,
      severity: severity || "INFO",
      employeeId: session?.employeeId || null,
    },
  });

  return json({ ok: true, note: entry }, 201);
}

export async function handleBanPlayer(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;
  const session = getStaffSession(request);

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { minecraftUsername, reason, tournamentId, bannedUntil } = body;
  if (!minecraftUsername || !reason) return error("Missing required fields: minecraftUsername, reason", 400);

  const prisma = await getPrismaClient();
  const ban = await prisma.playerBan.create({
    data: {
      minecraftUsername,
      reason,
      tournamentId: tournamentId || undefined,
      bannedUntil: bannedUntil ? new Date(bannedUntil) : undefined,
      employeeId: session?.employeeId || null,
    },
  });

  return json({ ok: true, ban }, 201);
}

export async function handleUnbanPlayer(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { banId } = body;
  if (!banId) return error("Missing banId", 400);

  const prisma = await getPrismaClient();
  await prisma.playerBan.update({ where: { id: banId }, data: { active: false } });

  return json({ ok: true });
}

export async function handleGetPlayerBans(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const username = url.searchParams.get("username") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const skip = (page - 1) * limit;

  const prisma = await getPrismaClient();
  const where: any = {};
  if (username) where.minecraftUsername = { contains: username };

  const [bans, total] = await Promise.all([
    prisma.playerBan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { employee: { select: { displayName: true } }, tournament: { select: { title: true } } },
    }),
    prisma.playerBan.count({ where }),
  ]);

  return json({
    bans: bans.map((b) => ({
      id: b.id,
      minecraftUsername: b.minecraftUsername,
      reason: b.reason,
      tournamentTitle: b.tournament?.title || null,
      bannedUntil: b.bannedUntil,
      active: b.active,
      employeeName: b.employee?.displayName || "System",
      createdAt: b.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function handleAssignRank(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;
  const session = getStaffSession(request);

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { minecraftUsername, rank, expiresAt } = body;
  if (!minecraftUsername || !rank) return error("Missing required fields: minecraftUsername, rank", 400);

  const prisma = await getPrismaClient();

  const customer = await prisma.customer.findUnique({ where: { minecraftUsername } });
  if (!customer) return error("Player not found", 404);

  const existing = await prisma.playerRank.findUnique({
    where: { customerId_rank: { customerId: customer.id, rank } },
  });

  if (existing) {
    const updated = await prisma.playerRank.update({
      where: { id: existing.id },
      data: { active: true, expiresAt: expiresAt ? new Date(expiresAt) : null, assignedBy: session?.email || "Staff" },
    });
    return json({ ok: true, rank: updated });
  }

  const playerRank = await prisma.playerRank.create({
    data: {
      customerId: customer.id,
      minecraftUsername,
      rank,
      assignedBy: session?.email || "Staff",
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    },
  });

  return json({ ok: true, rank: playerRank }, 201);
}

export async function handleRemoveRank(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { rankId } = body;
  if (!rankId) return error("Missing rankId", 400);

  const prisma = await getPrismaClient();
  await prisma.playerRank.update({ where: { id: rankId }, data: { active: false } });

  return json({ ok: true });
}

// ─── EMPLOYEE DASHBOARD STATS ─────────────────────────────────

export async function handleEmployeeDashboardStats(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const prisma = await getPrismaClient();

  const [
    totalTournaments,
    upcomingTournaments,
    liveTournaments,
    totalRegistrations,
    totalPlayers,
    activeNotifications,
    recentRegistrations,
  ] = await Promise.all([
    prisma.tournament.count(),
    prisma.tournament.count({ where: { status: "UPCOMING" } }),
    prisma.tournament.count({ where: { status: "LIVE" } }),
    prisma.tournamentRegistration.count(),
    prisma.customer.count(),
    prisma.siteNotification.count({ where: { active: true } }),
    prisma.tournamentRegistration.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { tournament: { select: { title: true } } },
    }),
  ]);

  return json({
    stats: {
      totalTournaments,
      upcomingTournaments,
      liveTournaments,
      totalRegistrations,
      totalPlayers,
      activeNotifications,
      recentRegistrations: recentRegistrations.map((r) => ({
        id: r.id,
        minecraftUsername: r.minecraftUsername,
        tournamentTitle: r.tournament.title,
        createdAt: r.createdAt,
      })),
    },
  });
}
