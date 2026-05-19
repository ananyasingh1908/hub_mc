import { getEmployeeSession } from "@/lib/auth/employee-session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getHubMCSession } from "@/lib/auth/session";
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
  return null;
}

async function autoUpdateStatuses() {
  try {
    const prisma = await getPrismaClient();
    const now = new Date();

    await prisma.tournament.updateMany({
      where: { status: "UPCOMING", dateTime: { lte: now } },
      data: { status: "LIVE" },
    });

    await prisma.tournament.updateMany({
      where: { status: "LIVE", dateTime: { lte: new Date(now.getTime() - 2 * 60 * 60 * 1000) } },
      data: { status: "COMPLETED" },
    });
  } catch (e) {
    console.warn("[Tournaments] autoUpdateStatuses failed:", e);
  }
}

export async function handleGetPublicTournaments() {
  await autoUpdateStatuses();
  const prisma = await getPrismaClient();

  const tournaments = await prisma.tournament.findMany({
    orderBy: { dateTime: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  const now = new Date();
  const upcoming = tournaments.filter((t) => t.status === "UPCOMING" && t.dateTime > now);
  const live = tournaments.filter((t) => t.status === "LIVE");
  const past = tournaments.filter((t) => t.status === "COMPLETED" || t.dateTime <= now).reverse();

  const map = (t: typeof tournaments[0]) => ({
    id: t.id,
    title: t.title,
    bannerUrl: t.bannerUrl,
    type: t.type,
    gameMode: t.gameMode,
    dateTime: t.dateTime,
    registrationDeadline: t.registrationDeadline,
    maxParticipants: t.maxParticipants,
    entryFee: t.entryFee ? Number(t.entryFee) : null,
    prizePool: t.prizePool,
    discordLink: t.discordLink,
    rules: t.rules,
    serverIp: t.serverIp,
    status: t.status,
    registrationsCount: t._count.registrations,
    createdAt: t.createdAt,
  });

  return json({ upcoming: upcoming.map(map), live: live.map(map), past: past.map(map) });
}

export async function handleGetTournamentById(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return error("Missing tournament id", 400);

  await autoUpdateStatuses();
  const prisma = await getPrismaClient();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });

  if (!tournament) return error("Tournament not found", 404);

  const session = await getHubMCSession(request);
  let userRegistration = null;
  if (session?.user?.minecraftUsername) {
    userRegistration = await prisma.tournamentRegistration.findUnique({
      where: { tournamentId_minecraftUsername: { tournamentId: id, minecraftUsername: session.user.minecraftUsername } },
    });
  }

  return json({
    tournament: {
      ...tournament,
      entryFee: tournament.entryFee ? Number(tournament.entryFee) : null,
      registrationsCount: tournament._count.registrations,
    },
    userRegistration,
  });
}

export async function handleRegisterForTournament(request: Request) {
  const session = await getHubMCSession(request);
  if (!session?.user?.minecraftUsername) {
    return error("You must be logged in to register for a tournament.", 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { tournamentId, discordUsername, discordId, teamName, teamMembers, email, region, age, agreedToRules } = body;

  if (!tournamentId || !discordUsername || !email || !region) {
    return error("Missing required fields: tournamentId, discordUsername, email, region", 400);
  }

  if (!agreedToRules) {
    return error("You must agree to the tournament rules.", 400);
  }

  await autoUpdateStatuses();
  const prisma = await getPrismaClient();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return error("Tournament not found", 404);
  if (tournament.status !== "UPCOMING") return error("Registration is closed for this tournament.", 400);
  if (new Date() > tournament.registrationDeadline) return error("Registration deadline has passed.", 400);

  const registrationCount = await prisma.tournamentRegistration.count({ where: { tournamentId } });
  if (registrationCount >= tournament.maxParticipants) {
    return error("Tournament is full. No more slots available.", 400);
  }

  const existing = await prisma.tournamentRegistration.findUnique({
    where: { tournamentId_minecraftUsername: { tournamentId, minecraftUsername: session.user.minecraftUsername } },
  });
  if (existing) return error("You are already registered for this tournament.", 409);

  const registration = await prisma.tournamentRegistration.create({
    data: {
      tournamentId,
      userId: session.user.customerId ? undefined : undefined,
      minecraftUsername: session.user.minecraftUsername,
      minecraftUuid: session.user.minecraftUuid ?? undefined,
      discordUsername,
      discordId: discordId || undefined,
      teamName: teamName || undefined,
      teamMembers: teamMembers || undefined,
      email,
      region,
      age: age ? parseInt(age) : undefined,
      agreedToRules: true,
    },
  });

  if (session.user.customerId) {
    await prisma.tournamentRegistration.update({
      where: { id: registration.id },
      data: { userId: session.user.customerId },
    });
  }

  return json({ ok: true, registration: { id: registration.id } }, 201);
}

export async function handleGetTournamentRegistrations(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  if (!tournamentId) return error("Missing tournamentId", 400);

  const prisma = await getPrismaClient();
  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "desc" },
  });

  return json({ registrations });
}

export async function handleStaffGetTournaments(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  await autoUpdateStatuses();
  const prisma = await getPrismaClient();

  const tournaments = await prisma.tournament.findMany({
    orderBy: { dateTime: "desc" },
    include: { _count: { select: { registrations: true } } },
  });

  return json({
    tournaments: tournaments.map((t) => ({
      ...t,
      entryFee: t.entryFee ? Number(t.entryFee) : null,
      registrationsCount: t._count.registrations,
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

  const { title, bannerUrl, type, gameMode, dateTime, registrationDeadline, maxParticipants, entryFee, prizePool, discordLink, rules, serverIp } = body;

  if (!title || !gameMode || !dateTime || !registrationDeadline || !maxParticipants || !rules) {
    return error("Missing required fields: title, gameMode, dateTime, registrationDeadline, maxParticipants, rules", 400);
  }

  const prisma = await getPrismaClient();
  const tournament = await prisma.tournament.create({
    data: {
      title,
      bannerUrl: bannerUrl || undefined,
      type: type || "SOLO",
      gameMode,
      dateTime: new Date(dateTime),
      registrationDeadline: new Date(registrationDeadline),
      maxParticipants: parseInt(maxParticipants),
      entryFee: entryFee ? parseFloat(entryFee) : undefined,
      prizePool: prizePool || undefined,
      discordLink: discordLink || undefined,
      rules,
      serverIp: serverIp || undefined,
    },
  });

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

  const { id, title, bannerUrl, type, gameMode, dateTime, registrationDeadline, maxParticipants, entryFee, prizePool, discordLink, rules, serverIp, status } = body;

  if (!id) return error("Missing tournament id", 400);

  const prisma = await getPrismaClient();

  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) return error("Tournament not found", 404);

  const data: any = {};
  if (title !== undefined) data.title = title;
  if (bannerUrl !== undefined) data.bannerUrl = bannerUrl;
  if (type !== undefined) data.type = type;
  if (gameMode !== undefined) data.gameMode = gameMode;
  if (dateTime !== undefined) data.dateTime = new Date(dateTime);
  if (registrationDeadline !== undefined) data.registrationDeadline = new Date(registrationDeadline);
  if (maxParticipants !== undefined) data.maxParticipants = parseInt(maxParticipants);
  if (entryFee !== undefined) data.entryFee = entryFee ? parseFloat(entryFee) : null;
  if (prizePool !== undefined) data.prizePool = prizePool;
  if (discordLink !== undefined) data.discordLink = discordLink;
  if (rules !== undefined) data.rules = rules;
  if (serverIp !== undefined) data.serverIp = serverIp;
  if (status !== undefined) data.status = status;

  const tournament = await prisma.tournament.update({ where: { id }, data });

  return json({ ok: true, tournament: { ...tournament, entryFee: tournament.entryFee ? Number(tournament.entryFee) : null } });
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

  const prisma = await getPrismaClient();

  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) return error("Tournament not found", 404);

  await prisma.tournament.delete({ where: { id } });

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

  const prisma = await getPrismaClient();

  const existing = await prisma.tournamentRegistration.findUnique({ where: { id: registrationId } });
  if (!existing) return error("Registration not found", 404);

  await prisma.tournamentRegistration.delete({ where: { id: registrationId } });

  return json({ ok: true });
}

export async function handleGetTournamentBrackets(request: Request) {
  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  if (!tournamentId) return error("Missing tournamentId", 400);

  const prisma = await getPrismaClient();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { registrations: true } } },
  });

  if (!tournament) return error("Tournament not found", 404);

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "asc" },
  });

  return json({
    tournament: {
      ...tournament,
      entryFee: tournament.entryFee ? Number(tournament.entryFee) : null,
      registrationsCount: tournament._count.registrations,
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
  const tournamentId = url.searchParams.get("tournamentId") || undefined;
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const region = url.searchParams.get("region") || "";
  const teamType = url.searchParams.get("teamType") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const skip = (page - 1) * limit;

  const prisma = await getPrismaClient();

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId;
  if (search) {
    where.OR = [
      { minecraftUsername: { contains: search } },
      { discordUsername: { contains: search } },
      { email: { contains: search } },
      { teamName: { contains: search } },
    ];
  }
  if (region) where.region = region;
  if (teamType === "team") where.teamName = { not: null };
  if (teamType === "solo") where.teamName = null;

  const [registrations, total] = await Promise.all([
    prisma.tournamentRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { tournament: { select: { id: true, title: true } } },
    }),
    prisma.tournamentRegistration.count({ where }),
  ]);

  return json({
    registrations: registrations.map((r) => ({
      id: r.id,
      tournamentId: r.tournamentId,
      tournamentTitle: r.tournament.title,
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
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function handleStaffExportRegistrations(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId") || undefined;
  const format = url.searchParams.get("format") || "json";

  const prisma = await getPrismaClient();

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId;

  const registrations = await prisma.tournamentRegistration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { tournament: { select: { title: true } } },
  });

  const data = registrations.map((r) => ({
    minecraftUsername: r.minecraftUsername,
    discordUsername: r.discordUsername,
    email: r.email,
    region: r.region,
    teamName: r.teamName || "",
    teamMembers: r.teamMembers || "",
    tournament: r.tournament.title,
    registeredAt: r.createdAt.toISOString(),
  }));

  if (format === "csv") {
    const headers = "minecraftUsername,discordUsername,email,region,teamName,teamMembers,tournament,registeredAt\n";
    const rows = data.map((r) =>
      `"${r.minecraftUsername}","${r.discordUsername}","${r.email}","${r.region}","${r.teamName}","${r.teamMembers}","${r.tournament}","${r.registeredAt}"`
    ).join("\n");
    return new Response(headers + rows, {
      status: 200,
      headers: {
        "content-type": "text/csv",
        "content-disposition": "attachment; filename=tournament-registrations.csv",
      },
    });
  }

  return json({ registrations: data });
}

export async function handleStaffStartTournament(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  const { id } = body;
  if (!id) return error("Missing tournament id", 400);

  const prisma = await getPrismaClient();
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return error("Tournament not found", 404);
  if (tournament.status === "COMPLETED") return error("Cannot start a completed tournament.", 400);

  const updated = await prisma.tournament.update({ where: { id }, data: { status: "LIVE" } });
  return json({ ok: true, tournament: { ...updated, entryFee: updated.entryFee ? Number(updated.entryFee) : null } });
}

export async function handleStaffEndTournament(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  const { id } = body;
  if (!id) return error("Missing tournament id", 400);

  const prisma = await getPrismaClient();
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return error("Tournament not found", 404);
  if (tournament.status === "UPCOMING") return error("Tournament has not started yet.", 400);

  const updated = await prisma.tournament.update({ where: { id }, data: { status: "COMPLETED" } });
  return json({ ok: true, tournament: { ...updated, entryFee: updated.entryFee ? Number(updated.entryFee) : null } });
}

export async function handleGetTournamentLeaderboard(request: Request) {
  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  if (!tournamentId) return error("Missing tournamentId", 400);

  const prisma = await getPrismaClient();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { registrations: true } } },
  });
  if (!tournament) return error("Tournament not found", 404);

  const completedMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, status: "COMPLETED", winnerId: { not: null } },
    include: {
      player1: true,
      player2: true,
      winner: true,
    },
  });

  const winCount: Record<string, { wins: number; losses: number; username: string; teamName: string | null; registrationId: string }> = {};
  for (const match of completedMatches) {
    if (match.player1Id) {
      if (!winCount[match.player1Id]) {
        const reg = match.player1;
        winCount[match.player1Id] = { wins: 0, losses: 0, username: reg?.minecraftUsername || "Unknown", teamName: reg?.teamName || null, registrationId: match.player1Id };
      }
      if (match.winnerId === match.player1Id) winCount[match.player1Id].wins++;
      else winCount[match.player1Id].losses++;
    }
    if (match.player2Id) {
      if (!winCount[match.player2Id]) {
        const reg = match.player2;
        winCount[match.player2Id] = { wins: 0, losses: 0, username: reg?.minecraftUsername || "Unknown", teamName: reg?.teamName || null, registrationId: match.player2Id };
      }
      if (match.winnerId === match.player2Id) winCount[match.player2Id].wins++;
      else winCount[match.player2Id].losses++;
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
      entryFee: tournament.entryFee ? Number(tournament.entryFee) : null,
      registrationsCount: tournament._count.registrations,
    },
    leaderboard,
  });
}

export async function handleGetTournamentMatches(request: Request) {
  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  if (!tournamentId) return error("Missing tournamentId", 400);

  const prisma = await getPrismaClient();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { registrations: true } } },
  });
  if (!tournament) return error("Tournament not found", 404);

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: "asc" }, { matchIndex: "asc" }],
    include: {
      player1: { select: { id: true, minecraftUsername: true, teamName: true } },
      player2: { select: { id: true, minecraftUsername: true, teamName: true } },
      winner: { select: { id: true, minecraftUsername: true, teamName: true } },
    },
  });

  const maxRound = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;

  return json({
    tournament: { ...tournament, entryFee: tournament.entryFee ? Number(tournament.entryFee) : null, registrationsCount: tournament._count.registrations },
    matches,
    maxRound,
  });
}

export async function handleStaffGenerateBracket(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  const { tournamentId } = body;
  if (!tournamentId) return error("Missing tournamentId", 400);

  const prisma = await getPrismaClient();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return error("Tournament not found", 404);

  const existingMatches = await prisma.tournamentMatch.count({ where: { tournamentId } });
  if (existingMatches > 0) return error("Bracket already generated. Delete existing matches first to regenerate.", 400);

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "asc" },
  });

  if (registrations.length < 2) return error("Need at least 2 participants to generate a bracket.", 400);

  const shuffled = [...registrations].sort(() => Math.random() - 0.5);

  const matches: { tournamentId: string; round: number; matchIndex: number; player1Id: string; player2Id: string | undefined; status: "SCHEDULED" }[] = [];

  if (shuffled.length % 2 !== 0) {
    shuffled.push(shuffled[0]);
  }

  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      tournamentId,
      round: 1,
      matchIndex: Math.floor(i / 2),
      player1Id: shuffled[i].id,
      player2Id: shuffled[i + 1]?.id,
      status: "SCHEDULED",
    });
  }

  await prisma.tournamentMatch.createMany({ data: matches });

  return json({ ok: true, count: matches.length, message: `Generated ${matches.length} first-round matches.` });
}

export async function handleStaffUpdateMatch(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  const { matchId, score1, score2, winnerId, status, notes } = body;
  if (!matchId) return error("Missing matchId", 400);

  const prisma = await getPrismaClient();

  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match) return error("Match not found", 404);

  const data: any = {};
  if (score1 !== undefined) data.score1 = score1;
  if (score2 !== undefined) data.score2 = score2;
  if (winnerId !== undefined) data.winnerId = winnerId || null;
  if (status !== undefined) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (status === "COMPLETED") data.playedAt = new Date();

  const updated = await prisma.tournamentMatch.update({ where: { id: matchId }, data });

  return json({ ok: true, match: updated });
}

export async function handleStaffCreateNextRound(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  const { tournamentId } = body;
  if (!tournamentId) return error("Missing tournamentId", 400);

  const prisma = await getPrismaClient();

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: "desc" }, { matchIndex: "asc" }],
  });

  if (matches.length === 0) return error("No matches found. Generate bracket first.", 400);

  const currentRound = Math.max(...matches.map((m) => m.round));

  const currentRoundMatches = matches.filter((m) => m.round === currentRound);

  const incomplete = currentRoundMatches.filter((m) => m.status !== "COMPLETED" || !m.winnerId);
  if (incomplete.length > 0) return error(`Complete all ${currentRoundMatches.length} matches in round ${currentRound} before advancing.`, 400);

  const winners = currentRoundMatches
    .filter((m) => m.winnerId)
    .sort((a, b) => a.matchIndex - b.matchIndex)
    .map((m) => m.winnerId!);

  if (winners.length < 2) {
    return json({ ok: true, championId: winners[0] || null, message: "Tournament complete! Champion crowned." });
  }

  const nextRound = currentRound + 1;
  const newMatches: { tournamentId: string; round: number; matchIndex: number; player1Id: string; player2Id: string; status: "SCHEDULED" }[] = [];

  for (let i = 0; i < winners.length; i += 2) {
    newMatches.push({
      tournamentId,
      round: nextRound,
      matchIndex: Math.floor(i / 2),
      player1Id: winners[i],
      player2Id: winners[i + 1],
      status: "SCHEDULED",
    });
  }

  await prisma.tournamentMatch.createMany({ data: newMatches });

  return json({ ok: true, count: newMatches.length, round: nextRound, message: `Generated ${newMatches.length} matches for round ${nextRound}.` });
}

export async function handleStaffDeleteMatches(request: Request) {
  const authErr = await requireStaffRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  const { tournamentId } = body;
  if (!tournamentId) return error("Missing tournamentId", 400);

  const prisma = await getPrismaClient();
  await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });

  return json({ ok: true, message: "All matches deleted." });
}
