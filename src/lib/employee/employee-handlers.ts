import {
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  like,
  lte,
  or,
  sql,
  type InferInsertModel,
} from "drizzle-orm";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";
import {
  customers,
  employees,
  notifications,
  orders,
  playerBans,
  playerNotes,
  playerRanks,
  serverReviews,
  siteNotifications,
  supportTickets,
  tournamentAnnouncements,
  tournamentRegistrations,
  tournaments,
  users,
} from "@/lib/db/schema";
import { toNumber } from "@/lib/db/drizzle-helpers";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function error(msg: string, status: number) {
  return json({ error: msg }, status);
}

type StaffSession = {
  employeeId: string | null;
  email: string | null;
  role: string;
};

async function requireStaffRole(
  request: Request,
  roles: string[],
): Promise<Response | null> {
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

/* ──────────────────────────────────────────────────────────────
   ANNOUNCEMENTS
────────────────────────────────────────────────────────────── */

export async function handleGetAnnouncements(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");

  const rows = tournamentId
    ? await db
        .select()
        .from(tournamentAnnouncements)
        .where(eq(tournamentAnnouncements.tournamentId, tournamentId))
        .orderBy(desc(tournamentAnnouncements.createdAt))
    : await db
        .select()
        .from(tournamentAnnouncements)
        .orderBy(desc(tournamentAnnouncements.createdAt));

  return json({ announcements: rows });
}

export async function handleCreateAnnouncement(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { tournamentId, title, message, type } = body;
  if (!tournamentId || !title || !message) {
    return error("Missing required fields: tournamentId, title, message", 400);
  }

  const tournament = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament[0]) return error("Tournament not found", 404);

const announcementId = crypto.randomUUID();
  const announcementPayload: InferInsertModel<typeof tournamentAnnouncements> = {
    id: announcementId,
    tournamentId,
    title,
    message,
    type: type || "INFO",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(tournamentAnnouncements).values(announcementPayload);

  const announcement = (
    await db
      .select()
      .from(tournamentAnnouncements)
      .where(eq(tournamentAnnouncements.id, announcementId))
      .limit(1)
  )[0];

  return json({ ok: true, announcement }, 201);
}

export async function handleUpdateAnnouncement(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { id, title, message, type } = body;
  if (!id) return error("Missing announcement id", 400);

  const existing = await db
    .select({ id: tournamentAnnouncements.id })
    .from(tournamentAnnouncements)
    .where(eq(tournamentAnnouncements.id, id))
    .limit(1);

  if (!existing[0]) return error("Announcement not found", 404);

  const data: Partial<typeof tournamentAnnouncements.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (title !== undefined) data.title = title;
  if (message !== undefined) data.message = message;
  if (type !== undefined) data.type = type;

  await db
    .update(tournamentAnnouncements)
    .set(data)
    .where(eq(tournamentAnnouncements.id, id));

  const announcement = (
    await db
      .select()
      .from(tournamentAnnouncements)
      .where(eq(tournamentAnnouncements.id, id))
      .limit(1)
  )[0];

  return json({ ok: true, announcement });
}

export async function handleDeleteAnnouncement(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { id } = body;
  if (!id) return error("Missing announcement id", 400);

  const existing = await db
    .select({ id: tournamentAnnouncements.id })
    .from(tournamentAnnouncements)
    .where(eq(tournamentAnnouncements.id, id))
    .limit(1);

  if (!existing[0]) return error("Announcement not found", 404);

  await db
    .delete(tournamentAnnouncements)
    .where(eq(tournamentAnnouncements.id, id));

  return json({ ok: true });
}

/* ──────────────────────────────────────────────────────────────
   SITE NOTIFICATIONS
────────────────────────────────────────────────────────────── */

export async function handleGetSiteNotifications(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [notificationRows, totalRows] = await Promise.all([
    db
      .select()
      .from(siteNotifications)
      .orderBy(desc(siteNotifications.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(siteNotifications),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);

  return json({
    notifications: notificationRows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function handleGetActiveSiteNotifications() {
  const now = new Date();

  const rows = await db
    .select()
    .from(siteNotifications)
    .where(
      and(
        eq(siteNotifications.active, true),
        lte(siteNotifications.startAt, now),
        or(
          isNull(siteNotifications.expireAt),
          gte(siteNotifications.expireAt, now),
        ),
      ),
    )
    .orderBy(desc(siteNotifications.createdAt));

  return json({ notifications: rows });
}

export async function handleCreateSiteNotification(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { title, message, type, link, startAt, expireAt } = body;
  if (!title || !message) {
    return error("Missing required fields: title, message", 400);
  }

  const notificationId = crypto.randomUUID();
  const notificationPayload: typeof siteNotifications.$inferInsert = {
    id: notificationId,
    title,
    message,
    type: type || "INFO",
    link: link || null,
    startAt: startAt ? new Date(startAt) : new Date(),
    expireAt: expireAt ? new Date(expireAt) : null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(siteNotifications).values(notificationPayload);

  const notification = (
    await db
      .select()
      .from(siteNotifications)
      .where(eq(siteNotifications.id, notificationId))
      .limit(1)
  )[0];

  return json({ ok: true, notification }, 201);
}

export async function handleUpdateSiteNotification(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { id, title, message, type, link, startAt, expireAt, active } = body;
  if (!id) return error("Missing notification id", 400);

  const existing = await db
    .select({ id: siteNotifications.id })
    .from(siteNotifications)
    .where(eq(siteNotifications.id, id))
    .limit(1);

  if (!existing[0]) return error("Notification not found", 404);

  const data: Partial<typeof siteNotifications.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (title !== undefined) data.title = title;
  if (message !== undefined) data.message = message;
  if (type !== undefined) data.type = type;
  if (link !== undefined) data.link = link;
  if (startAt !== undefined) data.startAt = new Date(startAt);
  if (expireAt !== undefined) data.expireAt = expireAt ? new Date(expireAt) : null;
  if (active !== undefined) data.active = active;

  await db.update(siteNotifications).set(data).where(eq(siteNotifications.id, id));

  const notification = (
    await db
      .select()
      .from(siteNotifications)
      .where(eq(siteNotifications.id, id))
      .limit(1)
  )[0];

  return json({ ok: true, notification });
}

export async function handleDeleteSiteNotification(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { id } = body;
  if (!id) return error("Missing notification id", 400);

  await db.delete(siteNotifications).where(eq(siteNotifications.id, id));
  return json({ ok: true });
}

/* ──────────────────────────────────────────────────────────────
   PLAYER MANAGEMENT
────────────────────────────────────────────────────────────── */

export async function handleSearchPlayers(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const offset = (page - 1) * limit;

  const searchCondition = search
    ? or(
        like(customers.minecraftUsername, `%${search}%`),
        like(users.email, `%${search}%`),
        like(users.name, `%${search}%`),
      )
    : undefined;

  const playerRows = await db
    .select({
      id: customers.id,
      userId: customers.userId,
      minecraftUsername: customers.minecraftUsername,
      minecraftUuid: customers.minecraftUuid,
      avatarUrl: customers.avatarUrl,
      country: customers.country,
      lastLoginAt: customers.lastLoginAt,
      createdAt: customers.createdAt,
      userIdJoined: users.id,
      userEmail: users.email,
      userName: users.name,
      userRole: users.role,
      userCreatedAt: users.createdAt,
      ordersCount: sql<number>`(
        select count(*) from \`Order\` o where o.customerId = ${customers.id}
      )`,
      ticketsCount: sql<number>`(
        select count(*) from \`SupportTicket\` st where st.customerId = ${customers.id}
      )`,
      reviewsCount: sql<number>`(
        select count(*) from \`ServerReview\` sr where sr.customerId = ${customers.id}
      )`,
    })
    .from(customers)
    .leftJoin(users, eq(customers.userId, users.id))
    .where(searchCondition)
    .orderBy(desc(customers.lastLoginAt))
    .limit(limit)
    .offset(offset);

  const totalRows = await db
    .select({ count: count() })
    .from(customers)
    .leftJoin(users, eq(customers.userId, users.id))
    .where(searchCondition);

  const total = Number(totalRows[0]?.count ?? 0);

  return json({
    players: playerRows.map((c) => ({
      id: c.id,
      userId: c.userId,
      minecraftUsername: c.minecraftUsername,
      minecraftUuid: c.minecraftUuid,
      avatarUrl: c.avatarUrl,
      country: c.country,
      lastLoginAt: c.lastLoginAt,
      createdAt: c.createdAt,
      user: c.userIdJoined
        ? {
            id: c.userIdJoined,
            email: c.userEmail,
            name: c.userName,
            role: c.userRole,
            createdAt: c.userCreatedAt,
          }
        : null,
      ordersCount: Number(c.ordersCount ?? 0),
      ticketsCount: Number(c.ticketsCount ?? 0),
      reviewsCount: Number(c.reviewsCount ?? 0),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function handleGetPlayerProfile(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  const username = url.searchParams.get("username");

  if (!customerId && !username) {
    return error("Provide customerId or username", 400);
  }

  const customerWhere = customerId
    ? eq(customers.id, customerId)
    : eq(customers.minecraftUsername, username!);

  const customerRows = await db
    .select({
      id: customers.id,
      userId: customers.userId,
      minecraftUsername: customers.minecraftUsername,
      minecraftUuid: customers.minecraftUuid,
      avatarUrl: customers.avatarUrl,
      country: customers.country,
      lastLoginAt: customers.lastLoginAt,
      createdAt: customers.createdAt,
      userIdJoined: users.id,
      userEmail: users.email,
      userName: users.name,
      userRole: users.role,
      userCreatedAt: users.createdAt,
    })
    .from(customers)
    .leftJoin(users, eq(customers.userId, users.id))
    .where(customerWhere)
    .limit(1);

  const customer = customerRows[0];
  if (!customer) return error("Player not found", 404);

  const [
    recentNotifications,
    recentOrders,
    recentTickets,
    recentReviews,
    registrationsRows,
    notesRows,
    bansRows,
    ranksRows,
  ] = await Promise.all([
    customer.userIdJoined
      ? db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, customer.userIdJoined))
          .orderBy(desc(notifications.createdAt))
          .limit(10)
      : Promise.resolve([]),

    db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customer.id))
      .orderBy(desc(orders.createdAt))
      .limit(20),

    db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.customerId, customer.id))
      .orderBy(desc(supportTickets.createdAt))
      .limit(10),

    db
      .select()
      .from(serverReviews)
      .where(eq(serverReviews.customerId, customer.id))
      .orderBy(desc(serverReviews.createdAt))
      .limit(10),

    db
      .select({
        id: tournamentRegistrations.id,
        tournamentId: tournamentRegistrations.tournamentId,
        userId: tournamentRegistrations.userId,
        minecraftUsername: tournamentRegistrations.minecraftUsername,
        minecraftUuid: tournamentRegistrations.minecraftUuid,
        discordUsername: tournamentRegistrations.discordUsername,
        discordId: tournamentRegistrations.discordId,
        teamName: tournamentRegistrations.teamName,
        teamMembers: tournamentRegistrations.teamMembers,
        email: tournamentRegistrations.email,
        region: tournamentRegistrations.region,
        age: tournamentRegistrations.age,
        agreedToRules: tournamentRegistrations.agreedToRules,
        createdAt: tournamentRegistrations.createdAt,
        updatedAt: tournamentRegistrations.updatedAt,
        tournamentIdJoined: tournaments.id,
        tournamentTitle: tournaments.title,
        tournamentStatus: tournaments.status,
      })
      .from(tournamentRegistrations)
      .leftJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
      .where(eq(tournamentRegistrations.minecraftUsername, customer.minecraftUsername))
      .orderBy(desc(tournamentRegistrations.createdAt)),

    db
      .select({
        id: playerNotes.id,
        employeeId: playerNotes.employeeId,
        customerId: playerNotes.customerId,
        minecraftUsername: playerNotes.minecraftUsername,
        note: playerNotes.note,
        severity: playerNotes.severity,
        createdAt: playerNotes.createdAt,
        employeeDisplayName: employees.displayName,
      })
      .from(playerNotes)
      .leftJoin(employees, eq(playerNotes.employeeId, employees.id))
      .where(eq(playerNotes.minecraftUsername, customer.minecraftUsername))
      .orderBy(desc(playerNotes.createdAt)),

    db
      .select({
        id: playerBans.id,
        employeeId: playerBans.employeeId,
        customerId: playerBans.customerId,
        minecraftUsername: playerBans.minecraftUsername,
        reason: playerBans.reason,
        tournamentId: playerBans.tournamentId,
        bannedUntil: playerBans.bannedUntil,
        active: playerBans.active,
        createdAt: playerBans.createdAt,
        employeeDisplayName: employees.displayName,
        tournamentTitle: tournaments.title,
        tournamentJoinedId: tournaments.id,
      })
      .from(playerBans)
      .leftJoin(employees, eq(playerBans.employeeId, employees.id))
      .leftJoin(tournaments, eq(playerBans.tournamentId, tournaments.id))
      .where(
        and(
          eq(playerBans.minecraftUsername, customer.minecraftUsername),
          eq(playerBans.active, true),
        ),
      )
      .orderBy(desc(playerBans.createdAt)),

    db
      .select()
      .from(playerRanks)
      .where(
        and(
          eq(playerRanks.minecraftUsername, customer.minecraftUsername),
          eq(playerRanks.active, true),
        ),
      )
      .orderBy(desc(playerRanks.assignedAt)),
  ]);

  return json({
    customer: {
      id: customer.id,
      minecraftUsername: customer.minecraftUsername,
      minecraftUuid: customer.minecraftUuid,
      avatarUrl: customer.avatarUrl,
      country: customer.country,
      lastLoginAt: customer.lastLoginAt,
      createdAt: customer.createdAt,
      user: customer.userIdJoined
        ? {
            id: customer.userIdJoined,
            email: customer.userEmail,
            name: customer.userName,
            role: customer.userRole,
            createdAt: customer.userCreatedAt,
            Notification: recentNotifications,
          }
        : null,
    },
    orders: recentOrders.map((o) => ({
      id: o.id,
      status: o.status,
      deliveryStatus: o.deliveryStatus,
      total: toNumber(o.total),
      createdAt: o.createdAt,
    })),
    tickets: recentTickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt,
    })),
    reviews: recentReviews,
    registrations: registrationsRows.map((r) => ({
      id: r.id,
      tournamentId: r.tournamentId,
      userId: r.userId,
      minecraftUsername: r.minecraftUsername,
      minecraftUuid: r.minecraftUuid,
      discordUsername: r.discordUsername,
      discordId: r.discordId,
      teamName: r.teamName,
      teamMembers: r.teamMembers,
      email: r.email,
      region: r.region,
      age: r.age,
      agreedToRules: r.agreedToRules,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      tournament: r.tournamentIdJoined
        ? {
            id: r.tournamentIdJoined,
            title: r.tournamentTitle,
            status: r.tournamentStatus,
          }
        : null,
    })),
    notes: notesRows.map((n) => ({
      id: n.id,
      employeeId: n.employeeId,
      customerId: n.customerId,
      minecraftUsername: n.minecraftUsername,
      note: n.note,
      severity: n.severity,
      createdAt: n.createdAt,
      employee: {
        displayName: n.employeeDisplayName,
      },
    })),
    bans: bansRows.map((b) => ({
      id: b.id,
      employeeId: b.employeeId,
      customerId: b.customerId,
      minecraftUsername: b.minecraftUsername,
      reason: b.reason,
      tournamentId: b.tournamentId,
      bannedUntil: b.bannedUntil,
      active: b.active,
      createdAt: b.createdAt,
      employee: {
        displayName: b.employeeDisplayName,
      },
      tournament: b.tournamentJoinedId
        ? {
            id: b.tournamentJoinedId,
            title: b.tournamentTitle,
          }
        : null,
    })),
    ranks: ranksRows,
  });
}

export async function handleAddPlayerNote(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const session = getStaffSession(request);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { minecraftUsername, note, severity } = body;
  if (!minecraftUsername || !note) {
    return error("Missing required fields: minecraftUsername, note", 400);
  }

  const noteId = crypto.randomUUID();
  const notePayload: typeof playerNotes.$inferInsert = {
    id: noteId,
    minecraftUsername,
    note,
    severity: severity || "INFO",
    employeeId: session?.employeeId || null,
    createdAt: new Date(),
  };

  await db.insert(playerNotes).values(notePayload);

  const entry = (
    await db
      .select()
      .from(playerNotes)
      .where(eq(playerNotes.id, noteId))
      .limit(1)
  )[0];

  return json({ ok: true, note: entry }, 201);
}

export async function handleBanPlayer(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const session = getStaffSession(request);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { minecraftUsername, reason, tournamentId, bannedUntil } = body;
  if (!minecraftUsername || !reason) {
    return error("Missing required fields: minecraftUsername, reason", 400);
  }

  const banId = crypto.randomUUID();
  const banPayload: typeof playerBans.$inferInsert = {
    id: banId,
    minecraftUsername,
    reason,
    tournamentId: tournamentId || null,
    bannedUntil: bannedUntil ? new Date(bannedUntil) : null,
    employeeId: session?.employeeId || null,
    active: true,
    createdAt: new Date(),
  };

  await db.insert(playerBans).values(banPayload);

  const ban = (
    await db
      .select()
      .from(playerBans)
      .where(eq(playerBans.id, banId))
      .limit(1)
  )[0];

  return json({ ok: true, ban }, 201);
}

export async function handleUnbanPlayer(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { banId } = body;
  if (!banId) return error("Missing banId", 400);

  await db
    .update(playerBans)
    .set({ active: false })
    .where(eq(playerBans.id, banId));

  return json({ ok: true });
}

export async function handleGetPlayerBans(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const username = url.searchParams.get("username") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const offset = (page - 1) * limit;

  const where = username
    ? like(playerBans.minecraftUsername, `%${username}%`)
    : undefined;

  const [bansRows, totalRows] = await Promise.all([
    db
      .select({
        id: playerBans.id,
        minecraftUsername: playerBans.minecraftUsername,
        reason: playerBans.reason,
        bannedUntil: playerBans.bannedUntil,
        active: playerBans.active,
        createdAt: playerBans.createdAt,
        employeeName: employees.displayName,
        tournamentTitle: tournaments.title,
      })
      .from(playerBans)
      .leftJoin(employees, eq(playerBans.employeeId, employees.id))
      .leftJoin(tournaments, eq(playerBans.tournamentId, tournaments.id))
      .where(where)
      .orderBy(desc(playerBans.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ count: count() }).from(playerBans).where(where),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);

  return json({
    bans: bansRows.map((b) => ({
      id: b.id,
      minecraftUsername: b.minecraftUsername,
      reason: b.reason,
      tournamentTitle: b.tournamentTitle || null,
      bannedUntil: b.bannedUntil,
      active: b.active,
      employeeName: b.employeeName || "System",
      createdAt: b.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function handleAssignRank(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const session = getStaffSession(request);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { minecraftUsername, rank, expiresAt } = body;
  if (!minecraftUsername || !rank) {
    return error("Missing required fields: minecraftUsername, rank", 400);
  }

  const customerRows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.minecraftUsername, minecraftUsername))
    .limit(1);

  const customer = customerRows[0];
  if (!customer) return error("Player not found", 404);

  const existingRows = await db
    .select()
    .from(playerRanks)
    .where(
      and(
        eq(playerRanks.customerId, customer.id),
        eq(playerRanks.rank, rank),
      ),
    )
    .limit(1);

  const existing = existingRows[0];

  if (existing) {
    await db
      .update(playerRanks)
      .set({
        active: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        assignedBy: session?.email || "Staff",
      })
      .where(eq(playerRanks.id, existing.id));

    const updated = (
      await db
        .select()
        .from(playerRanks)
        .where(eq(playerRanks.id, existing.id))
        .limit(1)
    )[0];

    return json({ ok: true, rank: updated });
  }

  const rankId = crypto.randomUUID();
  const rankPayload: typeof playerRanks.$inferInsert = {
    id: rankId,
    customerId: customer.id,
    minecraftUsername,
    rank,
    assignedBy: session?.email || "Staff",
    assignedAt: new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    active: true,
  };

  await db.insert(playerRanks).values(rankPayload);

  const playerRank = (
    await db
      .select()
      .from(playerRanks)
      .where(eq(playerRanks.id, rankId))
      .limit(1)
  )[0];

  return json({ ok: true, rank: playerRank }, 201);
}

export async function handleRemoveRank(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { rankId } = body;
  if (!rankId) return error("Missing rankId", 400);

  await db
    .update(playerRanks)
    .set({ active: false })
    .where(eq(playerRanks.id, rankId));

  return json({ ok: true });
}

/* ──────────────────────────────────────────────────────────────
   EMPLOYEE DASHBOARD STATS
────────────────────────────────────────────────────────────── */

export async function handleEmployeeDashboardStats(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const [
    totalTournamentsRows,
    upcomingTournamentsRows,
    liveTournamentsRows,
    totalRegistrationsRows,
    totalPlayersRows,
    activeNotificationsRows,
    recentRegistrationsRows,
  ] = await Promise.all([
    db.select({ count: count() }).from(tournaments),

    db
      .select({ count: count() })
      .from(tournaments)
      .where(eq(tournaments.status, "UPCOMING")),

    db
      .select({ count: count() })
      .from(tournaments)
      .where(eq(tournaments.status, "LIVE")),

    db.select({ count: count() }).from(tournamentRegistrations),

    db.select({ count: count() }).from(customers),

    db
      .select({ count: count() })
      .from(siteNotifications)
      .where(eq(siteNotifications.active, true)),

    db
      .select({
        id: tournamentRegistrations.id,
        minecraftUsername: tournamentRegistrations.minecraftUsername,
        createdAt: tournamentRegistrations.createdAt,
        tournamentTitle: tournaments.title,
      })
      .from(tournamentRegistrations)
      .leftJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
      .orderBy(desc(tournamentRegistrations.createdAt))
      .limit(5),
  ]);

  return json({
    stats: {
      totalTournaments: Number(totalTournamentsRows[0]?.count ?? 0),
      upcomingTournaments: Number(upcomingTournamentsRows[0]?.count ?? 0),
      liveTournaments: Number(liveTournamentsRows[0]?.count ?? 0),
      totalRegistrations: Number(totalRegistrationsRows[0]?.count ?? 0),
      totalPlayers: Number(totalPlayersRows[0]?.count ?? 0),
      activeNotifications: Number(activeNotificationsRows[0]?.count ?? 0),
      recentRegistrations: recentRegistrationsRows.map((r) => ({
        id: r.id,
        minecraftUsername: r.minecraftUsername,
        tournamentTitle: r.tournamentTitle,
        createdAt: r.createdAt,
      })),
    },
  });
}