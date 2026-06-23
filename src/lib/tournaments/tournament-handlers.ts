import {
  and,
  count,
  desc,
  eq,
  inArray,
  like,
  lte,
  or,
  sql,
  type InferInsertModel,
} from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getHubMCSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  tournamentMatches,
  tournamentRegistrations,
  tournaments,
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

  return null;
}

export async function autoUpdateStatuses() {
  try {
    const now = new Date();

    await db
      .update(tournaments)
      .set({ status: "LIVE", updatedAt: now })
      .where(
        and(eq(tournaments.status, "UPCOMING"), lte(tournaments.dateTime, now)),
      );

    await db
      .update(tournaments)
      .set({ status: "COMPLETED", updatedAt: now })
      .where(
        and(
          eq(tournaments.status, "LIVE"),
          lte(
            tournaments.dateTime,
            new Date(now.getTime() - 2 * 60 * 60 * 1000),
          ),
        ),
      );
  } catch (e) {
    console.warn("[Tournaments] autoUpdateStatuses failed:", e);
  }
}

function mapTournament(
  t: typeof tournaments.$inferSelect,
  registrationsCount: number,
) {
  return {
    id: t.id,
    title: t.title,
    bannerUrl: t.bannerUrl,
    type: t.type,
    gameMode: t.gameMode,
    dateTime: t.dateTime,
    registrationDeadline: t.registrationDeadline,
    maxParticipants: t.maxParticipants,
    entryFee: t.entryFee ? toNumber(t.entryFee) : null,
    prizePool: t.prizePool,
    discordLink: t.discordLink,
    rules: t.rules,
    serverIp: t.serverIp,
    status: t.status,
    registrationsCount,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function handleGetPublicTournaments() {
  await autoUpdateStatuses();

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .orderBy(tournaments.dateTime);

  const ids = tournamentRows.map((t) => t.id);

  const countRows =
    ids.length > 0
      ? await db
          .select({
            tournamentId: tournamentRegistrations.tournamentId,
            count: count(),
          })
          .from(tournamentRegistrations)
          .where(inArray(tournamentRegistrations.tournamentId, ids))
          .groupBy(tournamentRegistrations.tournamentId)
      : [];

  const countMap = new Map(
    countRows.map((c) => [c.tournamentId, Number(c.count)]),
  );

  const now = new Date();
  const upcoming: ReturnType<typeof mapTournament>[] = [];
  const live: ReturnType<typeof mapTournament>[] = [];
  const past: ReturnType<typeof mapTournament>[] = [];

  for (const t of tournamentRows) {
    const mapped = mapTournament(t, countMap.get(t.id) ?? 0);

    if (t.status === "UPCOMING" && t.dateTime > now) upcoming.push(mapped);
    else if (t.status === "LIVE") live.push(mapped);
    else past.push(mapped);
  }

  past.reverse();

  return json({ upcoming, live, past });
}

export async function handleGetTournamentById(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return error("Missing tournament id", 400);

  await autoUpdateStatuses();

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);

  const tournament = tournamentRows[0];
  if (!tournament) return error("Tournament not found", 404);

  const countRows = await db
    .select({ count: count() })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, id));

  const registrationsCount = Number(countRows[0]?.count ?? 0);

  const session = await getHubMCSession(request);
  let userRegistration = null;

  if (session?.user?.customerId) {
    const regRows = await db
      .select()
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, id),
          eq(
            tournamentRegistrations.userId,
            session.user.customerId,
          ),
        ),
      )
      .limit(1);

    userRegistration = regRows[0] ?? null;
  }

  return json({
    tournament: {
      ...tournament,
      entryFee: tournament.entryFee ? toNumber(tournament.entryFee) : null,
      registrationsCount,
    },
    userRegistration,
  });
}

export async function handleRegisterForTournament(request: Request) {
  const session = await getHubMCSession(request);
  if (!session?.user?.customerId) {
    return error("You must be logged in to register for a tournament.", 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const {
    tournamentId,
    discordUsername,
    discordId,
    teamName,
    teamMembers,
    email,
    region,
    age,
    agreedToRules,
  } = body;

  if (!tournamentId || !discordUsername || !email || !region) {
    return error(
      "Missing required fields: tournamentId, discordUsername, email, region",
      400,
    );
  }

  if (!agreedToRules) {
    return error("You must agree to the tournament rules.", 400);
  }

  await autoUpdateStatuses();

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  const tournament = tournamentRows[0];
  if (!tournament) return error("Tournament not found", 404);
  if (tournament.status !== "UPCOMING") {
    return error("Registration is closed for this tournament.", 400);
  }
  if (new Date() > tournament.registrationDeadline) {
    return error("Registration deadline has passed.", 400);
  }

  const countRows = await db
    .select({ count: count() })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournamentId));

  const registrationCount = Number(countRows[0]?.count ?? 0);
  if (registrationCount >= tournament.maxParticipants) {
    return error("Tournament is full. No more slots available.", 400);
  }

  const existingRows = await db
    .select()
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(
          tournamentRegistrations.userId,
          session.user.customerId,
        ),
      ),
    )
    .limit(1);

  if (existingRows[0]) {
    return error("You are already registered for this tournament.", 409);
  }

  const now = new Date();
  const registrationId = crypto.randomUUID();

  const payload: InferInsertModel<typeof tournamentRegistrations> = {
    id: registrationId,
    tournamentId,
    userId: session.user.customerId ?? null,
    minecraftUsername: session.user.fullName || session.user.phoneNumber || "",
    minecraftUuid: session.user.customerId || "",
    discordUsername,
    discordId: discordId || null,
    teamName: teamName || null,
    teamMembers: teamMembers || null,
    email,
    region,
    age: age ? Number(age) : null,
    agreedToRules: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(tournamentRegistrations).values(payload);

  const registration = (
    await db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.id, registrationId))
      .limit(1)
  )[0];

  return json({ ok: true, registration }, 201);
}

export async function handleGetTournamentRegistrations(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  if (!tournamentId) return error("Missing tournamentId", 400);

  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [registrations, totalRows] = await Promise.all([
    db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournamentId))
      .orderBy(desc(tournamentRegistrations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournamentId)),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);

  return json({
    registrations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function handleStaffGetTournaments(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  await autoUpdateStatuses();

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.dateTime));

  const ids = tournamentRows.map((t) => t.id);

  const countRows =
    ids.length > 0
      ? await db
          .select({
            tournamentId: tournamentRegistrations.tournamentId,
            count: count(),
          })
          .from(tournamentRegistrations)
          .where(inArray(tournamentRegistrations.tournamentId, ids))
          .groupBy(tournamentRegistrations.tournamentId)
      : [];

  const countMap = new Map(
    countRows.map((c) => [c.tournamentId, Number(c.count)]),
  );

  return json({
    tournaments: tournamentRows.map((t) => ({
      ...t,
      entryFee: t.entryFee ? toNumber(t.entryFee) : null,
      registrationsCount: countMap.get(t.id) ?? 0,
    })),
  });
}

export async function handleStaffCreateTournament(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const {
    title,
    bannerUrl,
    type,
    gameMode,
    dateTime,
    registrationDeadline,
    maxParticipants,
    entryFee,
    prizePool,
    discordLink,
    rules,
    serverIp,
  } = body;

  if (
    !title ||
    !gameMode ||
    !dateTime ||
    !registrationDeadline ||
    !maxParticipants ||
    !rules
  ) {
    return error(
      "Missing required fields: title, gameMode, dateTime, registrationDeadline, maxParticipants, rules",
      400,
    );
  }

  const now = new Date();
  const tournamentId = crypto.randomUUID();

  const payload: InferInsertModel<typeof tournaments> = {
    id: tournamentId,
    title,
    bannerUrl: bannerUrl || null,
    type: type || "SOLO",
    gameMode,
    dateTime: new Date(dateTime),
    registrationDeadline: new Date(registrationDeadline),
    maxParticipants: Number(maxParticipants),
    entryFee: entryFee ? String(entryFee) : null,
    prizePool: prizePool || null,
    discordLink: discordLink || null,
    rules,
    serverIp: serverIp || null,
    status: "UPCOMING",
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(tournaments).values(payload);

  const tournament = (
    await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1)
  )[0];

  return json({ ok: true, tournament }, 201);
}

export async function handleStaffUpdateTournament(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const {
    id,
    title,
    bannerUrl,
    type,
    gameMode,
    dateTime,
    registrationDeadline,
    maxParticipants,
    entryFee,
    prizePool,
    discordLink,
    rules,
    serverIp,
    status,
  } = body;

  if (!id) return error("Missing tournament id", 400);

  const existingRows = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);

  if (!existingRows[0]) return error("Tournament not found", 404);

  const data: Partial<InferInsertModel<typeof tournaments>> = {
    updatedAt: new Date(),
  };

  if (title !== undefined) data.title = title;
  if (bannerUrl !== undefined) data.bannerUrl = bannerUrl;
  if (type !== undefined) data.type = type;
  if (gameMode !== undefined) data.gameMode = gameMode;
  if (dateTime !== undefined) data.dateTime = new Date(dateTime);
  if (registrationDeadline !== undefined) {
    data.registrationDeadline = new Date(registrationDeadline);
  }
  if (maxParticipants !== undefined) {
    data.maxParticipants = Number(maxParticipants);
  }
  if (entryFee !== undefined) data.entryFee = entryFee ? String(entryFee) : null;
  if (prizePool !== undefined) data.prizePool = prizePool;
  if (discordLink !== undefined) data.discordLink = discordLink;
  if (rules !== undefined) data.rules = rules;
  if (serverIp !== undefined) data.serverIp = serverIp;
  if (status !== undefined) data.status = status;

  await db.update(tournaments).set(data).where(eq(tournaments.id, id));

  const tournament = (
    await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1)
  )[0];

  return json({
    ok: true,
    tournament: {
      ...tournament,
      entryFee: tournament.entryFee ? toNumber(tournament.entryFee) : null,
    },
  });
}

export async function handleStaffDeleteTournament(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { id } = body;
  if (!id) return error("Missing tournament id", 400);

  const existingRows = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);

  if (!existingRows[0]) return error("Tournament not found", 404);

  await db.delete(tournaments).where(eq(tournaments.id, id));

  return json({ ok: true });
}

export async function handleDeleteTournamentRegistration(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { registrationId } = body;
  if (!registrationId) return error("Missing registrationId", 400);

  const existingRows = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, registrationId))
    .limit(1);

  if (!existingRows[0]) return error("Registration not found", 404);

  await db
    .delete(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, registrationId));

  return json({ ok: true });
}

export async function handleGetTournamentBrackets(request: Request) {
  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  if (!tournamentId) return error("Missing tournamentId", 400);

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  const tournament = tournamentRows[0];
  if (!tournament) return error("Tournament not found", 404);

  const [registrations, countRows] = await Promise.all([
    db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournamentId))
      .orderBy(tournamentRegistrations.createdAt),
    db
      .select({ count: count() })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournamentId)),
  ]);

  const registrationsCount = Number(countRows[0]?.count ?? 0);

  return json({
    tournament: {
      ...tournament,
      entryFee: tournament.entryFee ? toNumber(tournament.entryFee) : null,
      registrationsCount,
    },
    registrations: registrations.map((r) => ({
      id: r.id,
      minecraftUsername: r.minecraftUsername,
      teamName: r.teamName,
      teamMembers: r.teamMembers,
      discordUsername: r.discordUsername,
      createdAt: r.createdAt,
    })),
  });
}

export async function handleStaffSearchRegistrations(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId") || "";
  const search = url.searchParams.get("search") || "";
  const region = url.searchParams.get("region") || "";
  const teamType = url.searchParams.get("teamType") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const offset = (page - 1) * limit;

  const conditions: any[] = [];

  if (tournamentId) {
    conditions.push(eq(tournamentRegistrations.tournamentId, tournamentId));
  }

  if (search) {
    conditions.push(
      or(
        like(tournamentRegistrations.minecraftUsername, `%${search}%`),
        like(tournamentRegistrations.discordUsername, `%${search}%`),
        like(tournamentRegistrations.email, `%${search}%`),
        like(tournamentRegistrations.teamName, `%${search}%`),
      )!,
    );
  }

  if (region) {
    conditions.push(eq(tournamentRegistrations.region, region));
  }

  if (teamType === "team") {
    conditions.push(sql`${tournamentRegistrations.teamName} IS NOT NULL`);
  }

  if (teamType === "solo") {
    conditions.push(sql`${tournamentRegistrations.teamName} IS NULL`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [registrations, totalRows] = await Promise.all([
    db
      .select({
        id: tournamentRegistrations.id,
        tournamentId: tournamentRegistrations.tournamentId,
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
        tournamentTitle: tournaments.title,
      })
      .from(tournamentRegistrations)
      .leftJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
      .where(whereClause)
      .orderBy(desc(tournamentRegistrations.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(tournamentRegistrations).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);

  return json({
    registrations: registrations.map((r) => ({
      id: r.id,
      tournamentId: r.tournamentId,
      tournamentTitle: r.tournamentTitle,
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
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function handleStaffExportRegistrations(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId") || "";
  const format = url.searchParams.get("format") || "json";

  const whereClause = tournamentId
    ? eq(tournamentRegistrations.tournamentId, tournamentId)
    : undefined;

  const registrations = await db
    .select({
      minecraftUsername: tournamentRegistrations.minecraftUsername,
      discordUsername: tournamentRegistrations.discordUsername,
      email: tournamentRegistrations.email,
      region: tournamentRegistrations.region,
      teamName: tournamentRegistrations.teamName,
      teamMembers: tournamentRegistrations.teamMembers,
      createdAt: tournamentRegistrations.createdAt,
      tournamentTitle: tournaments.title,
    })
    .from(tournamentRegistrations)
    .leftJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .where(whereClause)
    .orderBy(desc(tournamentRegistrations.createdAt));

  const data = registrations.map((r) => ({
    minecraftUsername: r.minecraftUsername,
    discordUsername: r.discordUsername,
    email: r.email,
    region: r.region,
    teamName: r.teamName || "",
    teamMembers:
      typeof r.teamMembers === "string"
        ? r.teamMembers
        : r.teamMembers
          ? JSON.stringify(r.teamMembers)
          : "",
    tournament: r.tournamentTitle ?? "",
    registeredAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : new Date(r.createdAt).toISOString(),
  }));

  if (format === "csv") {
    const headers =
      "minecraftUsername,discordUsername,email,region,teamName,teamMembers,tournament,registeredAt\n";

    const rows = data
      .map(
        (r) =>
          `"${r.minecraftUsername}","${r.discordUsername}","${r.email}","${r.region}","${r.teamName}","${r.teamMembers}","${r.tournament}","${r.registeredAt}"`,
      )
      .join("\n");

    return new Response(headers + rows, {
      status: 200,
      headers: {
        "content-type": "text/csv",
        "content-disposition":
          "attachment; filename=tournament-registrations.csv",
      },
    });
  }

  return json({ registrations: data });
}

export async function handleStaffStartTournament(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { id } = body;
  if (!id) return error("Missing tournament id", 400);

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);

  const tournament = tournamentRows[0];
  if (!tournament) return error("Tournament not found", 404);
  if (tournament.status === "COMPLETED") {
    return error("Cannot start a completed tournament.", 400);
  }

  await db
    .update(tournaments)
    .set({ status: "LIVE", updatedAt: new Date() })
    .where(eq(tournaments.id, id));

  const updated = (
    await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1)
  )[0];

  return json({
    ok: true,
    tournament: {
      ...updated,
      entryFee: updated.entryFee ? toNumber(updated.entryFee) : null,
    },
  });
}

export async function handleStaffEndTournament(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { id } = body;
  if (!id) return error("Missing tournament id", 400);

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);

  const tournament = tournamentRows[0];
  if (!tournament) return error("Tournament not found", 404);
  if (tournament.status === "UPCOMING") {
    return error("Tournament has not started yet.", 400);
  }

  await db
    .update(tournaments)
    .set({ status: "COMPLETED", updatedAt: new Date() })
    .where(eq(tournaments.id, id));

  const updated = (
    await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1)
  )[0];

  return json({
    ok: true,
    tournament: {
      ...updated,
      entryFee: updated.entryFee ? toNumber(updated.entryFee) : null,
    },
  });
}

export async function handleGetTournamentLeaderboard(request: Request) {
  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  if (!tournamentId) return error("Missing tournamentId", 400);

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  const tournament = tournamentRows[0];
  if (!tournament) return error("Tournament not found", 404);

  const countRows = await db
    .select({ count: count() })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournamentId));

  const registrationsCount = Number(countRows[0]?.count ?? 0);

  const p1 = alias(tournamentRegistrations, "p1");
  const p2 = alias(tournamentRegistrations, "p2");

  const matchRows = await db
    .select({
      player1Id: tournamentMatches.player1Id,
      player2Id: tournamentMatches.player2Id,
      winnerId: tournamentMatches.winnerId,
      player1Username: p1.minecraftUsername,
      player1Team: p1.teamName,
      player2Username: p2.minecraftUsername,
      player2Team: p2.teamName,
    })
    .from(tournamentMatches)
    .leftJoin(p1, eq(p1.id, tournamentMatches.player1Id))
    .leftJoin(p2, eq(p2.id, tournamentMatches.player2Id))
    .where(
      and(
        eq(tournamentMatches.tournamentId, tournamentId),
        eq(tournamentMatches.status, "COMPLETED"),
        sql`${tournamentMatches.winnerId} IS NOT NULL`,
      ),
    );

  const winCount: Record<
    string,
    {
      wins: number;
      losses: number;
      username: string;
      teamName: string | null;
      registrationId: string;
    }
  > = {};

  for (const match of matchRows) {
    if (match.player1Id) {
      if (!winCount[match.player1Id]) {
        winCount[match.player1Id] = {
          wins: 0,
          losses: 0,
          username: match.player1Username || "Unknown",
          teamName: match.player1Team,
          registrationId: match.player1Id,
        };
      }

      if (match.winnerId === match.player1Id) {
        winCount[match.player1Id].wins++;
      } else {
        winCount[match.player1Id].losses++;
      }
    }

    if (match.player2Id) {
      if (!winCount[match.player2Id]) {
        winCount[match.player2Id] = {
          wins: 0,
          losses: 0,
          username: match.player2Username || "Unknown",
          teamName: match.player2Team,
          registrationId: match.player2Id,
        };
      }

      if (match.winnerId === match.player2Id) {
        winCount[match.player2Id].wins++;
      } else {
        winCount[match.player2Id].losses++;
      }
    }
  }

  const leaderboard = Object.entries(winCount)
    .map(([registrationId, stats]) => ({
      registrationId,
      username: stats.username,
      teamName: stats.teamName,
      wins: stats.wins,
      losses: stats.losses,
      matches: stats.wins + stats.losses,
    }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  return json({
    tournament: {
      ...tournament,
      entryFee: tournament.entryFee ? toNumber(tournament.entryFee) : null,
      registrationsCount,
    },
    leaderboard,
  });
}

export async function handleGetTournamentMatches(request: Request) {
  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  if (!tournamentId) return error("Missing tournamentId", 400);

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  const tournament = tournamentRows[0];
  if (!tournament) return error("Tournament not found", 404);

  const countRows = await db
    .select({ count: count() })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournamentId));

  const registrationsCount = Number(countRows[0]?.count ?? 0);

  const p1 = alias(tournamentRegistrations, "p1");
  const p2 = alias(tournamentRegistrations, "p2");
  const w = alias(tournamentRegistrations, "w");

  const matchRows = await db
    .select({
      id: tournamentMatches.id,
      tournamentId: tournamentMatches.tournamentId,
      round: tournamentMatches.round,
      matchIndex: tournamentMatches.matchIndex,
      player1Id: tournamentMatches.player1Id,
      player2Id: tournamentMatches.player2Id,
      winnerId: tournamentMatches.winnerId,
      score1: tournamentMatches.score1,
      score2: tournamentMatches.score2,
      status: tournamentMatches.status,
      scheduledAt: tournamentMatches.scheduledAt,
      playedAt: tournamentMatches.playedAt,
      notes: tournamentMatches.notes,
      createdAt: tournamentMatches.createdAt,
      updatedAt: tournamentMatches.updatedAt,
      player1Username: p1.minecraftUsername,
      player1Team: p1.teamName,
      player2Username: p2.minecraftUsername,
      player2Team: p2.teamName,
      winnerUsername: w.minecraftUsername,
      winnerTeam: w.teamName,
    })
    .from(tournamentMatches)
    .leftJoin(p1, eq(p1.id, tournamentMatches.player1Id))
    .leftJoin(p2, eq(p2.id, tournamentMatches.player2Id))
    .leftJoin(w, eq(w.id, tournamentMatches.winnerId))
    .where(eq(tournamentMatches.tournamentId, tournamentId))
    .orderBy(tournamentMatches.round, tournamentMatches.matchIndex);

  const matches = matchRows.map((m) => ({
    ...m,
    player1: m.player1Id
      ? {
          id: m.player1Id,
          minecraftUsername: m.player1Username,
          teamName: m.player1Team,
        }
      : null,
    player2: m.player2Id
      ? {
          id: m.player2Id,
          minecraftUsername: m.player2Username,
          teamName: m.player2Team,
        }
      : null,
    winner: m.winnerId
      ? {
          id: m.winnerId,
          minecraftUsername: m.winnerUsername,
          teamName: m.winnerTeam,
        }
      : null,
  }));

  const maxRound =
    matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;

  return json({
    tournament: {
      ...tournament,
      entryFee: tournament.entryFee ? toNumber(tournament.entryFee) : null,
      registrationsCount,
    },
    matches,
    maxRound,
  });
}

export async function handleStaffGenerateBracket(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { tournamentId } = body;
  if (!tournamentId) return error("Missing tournamentId", 400);

  const tournamentRows = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournamentRows[0]) return error("Tournament not found", 404);

  const existingCountRows = await db
    .select({ count: count() })
    .from(tournamentMatches)
    .where(eq(tournamentMatches.tournamentId, tournamentId));

  if (Number(existingCountRows[0]?.count ?? 0) > 0) {
    return error(
      "Bracket already generated. Delete existing matches first to regenerate.",
      400,
    );
  }

  const registrations = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournamentId))
    .orderBy(tournamentRegistrations.createdAt);

  if (registrations.length < 2) {
    return error("Need at least 2 participants to generate a bracket.", 400);
  }

  const shuffled = [...registrations].sort(() => Math.random() - 0.5);

  if (shuffled.length % 2 !== 0) {
    shuffled.push(shuffled[0]);
  }

  const now = new Date();
  const matchPayloads: InferInsertModel<typeof tournamentMatches>[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    matchPayloads.push({
      id: crypto.randomUUID(),
      tournamentId,
      round: 1,
      matchIndex: Math.floor(i / 2),
      player1Id: shuffled[i].id,
      player2Id: shuffled[i + 1]?.id ?? null,
      winnerId: null,
      score1: null,
      score2: null,
      status: "SCHEDULED",
      scheduledAt: null,
      playedAt: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (matchPayloads.length > 0) {
    await db.insert(tournamentMatches).values(matchPayloads);
  }

  return json({
    ok: true,
    count: matchPayloads.length,
    message: `Generated ${matchPayloads.length} first-round matches.`,
  });
}

export async function handleStaffUpdateMatch(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { matchId, score1, score2, winnerId, status, notes } = body;
  if (!matchId) return error("Missing matchId", 400);

  const matchRows = await db
    .select()
    .from(tournamentMatches)
    .where(eq(tournamentMatches.id, matchId))
    .limit(1);

  if (!matchRows[0]) return error("Match not found", 404);

  const data: Partial<InferInsertModel<typeof tournamentMatches>> = {
    updatedAt: new Date(),
  };

  if (score1 !== undefined) data.score1 = score1;
  if (score2 !== undefined) data.score2 = score2;
  if (winnerId !== undefined) data.winnerId = winnerId || null;
  if (status !== undefined) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (status === "COMPLETED") data.playedAt = new Date();

  await db
    .update(tournamentMatches)
    .set(data)
    .where(eq(tournamentMatches.id, matchId));

  const updated = (
    await db
      .select()
      .from(tournamentMatches)
      .where(eq(tournamentMatches.id, matchId))
      .limit(1)
  )[0];

  return json({ ok: true, match: updated });
}

export async function handleStaffCreateNextRound(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { tournamentId } = body;
  if (!tournamentId) return error("Missing tournamentId", 400);

  const matches = await db
    .select()
    .from(tournamentMatches)
    .where(eq(tournamentMatches.tournamentId, tournamentId))
    .orderBy(desc(tournamentMatches.round), tournamentMatches.matchIndex);

  if (matches.length === 0) {
    return error("No matches found. Generate bracket first.", 400);
  }

  const currentRound = Math.max(...matches.map((m) => m.round));
  const currentRoundMatches = matches.filter((m) => m.round === currentRound);

  const incomplete = currentRoundMatches.filter(
    (m) => m.status !== "COMPLETED" || !m.winnerId,
  );

  if (incomplete.length > 0) {
    return error(
      `Complete all ${currentRoundMatches.length} matches in round ${currentRound} before advancing.`,
      400,
    );
  }

  const winners = currentRoundMatches
    .filter((m) => m.winnerId)
    .sort((a, b) => a.matchIndex - b.matchIndex)
    .map((m) => m.winnerId!);

  if (winners.length < 2) {
    return json({
      ok: true,
      championId: winners[0] || null,
      message: "Tournament complete! Champion crowned.",
    });
  }

  const nextRound = currentRound + 1;
  const now = new Date();
  const newMatchPayloads: InferInsertModel<typeof tournamentMatches>[] = [];

  for (let i = 0; i < winners.length; i += 2) {
    newMatchPayloads.push({
      id: crypto.randomUUID(),
      tournamentId,
      round: nextRound,
      matchIndex: Math.floor(i / 2),
      player1Id: winners[i],
      player2Id: winners[i + 1] ?? null,
      winnerId: null,
      score1: null,
      score2: null,
      status: "SCHEDULED",
      scheduledAt: null,
      playedAt: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (newMatchPayloads.length > 0) {
    await db.insert(tournamentMatches).values(newMatchPayloads);
  }

  return json({
    ok: true,
    count: newMatchPayloads.length,
    round: nextRound,
    message: `Generated ${newMatchPayloads.length} matches for round ${nextRound}.`,
  });
}

export async function handleStaffDeleteMatches(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { tournamentId } = body;
  if (!tournamentId) return error("Missing tournamentId", 400);

  await db
    .delete(tournamentMatches)
    .where(eq(tournamentMatches.tournamentId, tournamentId));

  return json({ ok: true, message: "All matches deleted." });
}