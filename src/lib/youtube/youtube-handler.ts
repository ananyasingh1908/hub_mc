import { getStatusData, getVideosData, getLivestreamData, getCommunityStreamsData, isQuotaExceeded } from "@/lib/youtube/youtube-cache";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleYouTubeStatus(): Promise<Response> {
  try {
    const cached = await getStatusData();
    if (cached) return json(cached);
    return json({ connected: false });
  } catch (err) {
    console.error("[YouTube] Status handler error:", err instanceof Error ? err.message : err);
    return json({ connected: false });
  }
}

export async function handleYouTubeVideos(): Promise<Response> {
  try {
    const cached = await getVideosData();
    if (cached) return json(cached);
    return json({ connected: false, videos: [] });
  } catch (err) {
    console.error("[YouTube] Videos handler error:", err instanceof Error ? err.message : err);
    return json({ connected: false, videos: [] });
  }
}

export async function handleYouTubeLivestream(): Promise<Response> {
  try {
    const cached = await getLivestreamData();
    if (cached) return json(cached);
    return json({ connected: false, isLive: false, livestream: null });
  } catch (err) {
    console.error("[YouTube] Livestream handler error:", err instanceof Error ? err.message : err);
    return json({ connected: false, isLive: false, livestream: null });
  }
}

export async function handleYouTubeCommunityStreams(): Promise<Response> {
  try {
    const cached = await getCommunityStreamsData();
    if (cached) return json(cached);
    return json({ streams: [] });
  } catch (err) {
    console.error("[YouTube] Community streams handler error:", err instanceof Error ? err.message : err);
    return json({ streams: [] });
  }
}

// ─── ADMIN STREAM MODERATION (unchanged) ────────────────────

import { getEmployeeSession } from "@/lib/auth/employee-session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getPrismaClient } from "@/lib/db/prisma";

async function getStaffSession(request: Request): Promise<{ employeeId: string | null; email: string | null } | null> {
  const admin = await getAdminSession(request);
  if (admin) return { employeeId: admin.sub, email: admin.email };
  const employee = await getEmployeeSession(request);
  if (employee) return { employeeId: employee.employeeId, email: employee.email };
  return null;
}

function error(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleAdminApproveStream(request: Request): Promise<Response> {
  const staff = await getStaffSession(request);
  if (!staff) return error("Unauthorized", 401);

  let body: { videoId?: string; channelId?: string; channelTitle?: string; title?: string; description?: string; thumbnailUrl?: string; liveViewers?: number };
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  if (!body.videoId) return error("videoId required", 400);

  const prisma = await getPrismaClient();
  const existing = await prisma.featuredStream.findUnique({ where: { videoId: body.videoId } });

  if (existing) {
    await prisma.featuredStream.update({
      where: { id: existing.id },
      data: { status: "APPROVED", moderatedById: staff.employeeId, moderatedAt: new Date() },
    });
  } else {
    await prisma.featuredStream.create({
      data: {
        videoId: body.videoId,
        channelId: body.channelId ?? "",
        channelTitle: body.channelTitle ?? "",
        title: body.title ?? "",
        description: body.description ?? "",
        thumbnailUrl: body.thumbnailUrl ?? null,
        liveViewers: body.liveViewers ?? 0,
        status: "APPROVED",
        moderatedById: staff.employeeId,
        moderatedAt: new Date(),
      },
    });
  }

  return json({ success: true });
}

export async function handleAdminRemoveStream(request: Request): Promise<Response> {
  const staff = await getStaffSession(request);
  if (!staff) return error("Unauthorized", 401);

  let body: { videoId?: string };
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  if (!body.videoId) return error("videoId required", 400);

  const prisma = await getPrismaClient();
  const existing = await prisma.featuredStream.findUnique({ where: { videoId: body.videoId } });

  if (existing) {
    await prisma.featuredStream.update({
      where: { id: existing.id },
      data: { status: "REMOVED", moderatedById: staff.employeeId, moderatedAt: new Date() },
    });
  }

  return json({ success: true });
}

export async function handleAdminBlacklistChannel(request: Request): Promise<Response> {
  const staff = await getStaffSession(request);
  if (!staff) return error("Unauthorized", 401);

  let body: { channelId?: string; channelTitle?: string; reason?: string };
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }
  if (!body.channelId) return error("channelId required", 400);

  const prisma = await getPrismaClient();
  await prisma.streamBlacklist.upsert({
    where: { channelId: body.channelId },
    update: { reason: body.reason ?? null, channelTitle: body.channelTitle ?? null },
    create: {
      channelId: body.channelId,
      channelTitle: body.channelTitle ?? null,
      reason: body.reason ?? null,
      createdById: staff.employeeId,
    },
  });

  return json({ success: true });
}

export async function handleAdminGetFeaturedStreams(request: Request): Promise<Response> {
  const staff = await getStaffSession(request);
  if (!staff) return error("Unauthorized", 401);

  const prisma = await getPrismaClient();
  const streams = await prisma.featuredStream.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return json({
    streams: streams.map((s) => ({
      id: s.id,
      videoId: s.videoId,
      channelId: s.channelId,
      channelTitle: s.channelTitle,
      title: s.title,
      description: s.description,
      thumbnailUrl: s.thumbnailUrl,
      liveViewers: s.liveViewers,
      status: s.status,
      moderatedAt: s.moderatedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
