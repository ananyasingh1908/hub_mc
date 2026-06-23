import { eq, desc, and, sql, count } from "drizzle-orm";
import { getHubMCSession } from "@/lib/auth/session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import { db } from "@/lib/db";
import {
  forumCategories,
  forumThreads,
  forumReplies,
  forumThreadViews,
} from "@/lib/db/schema";
import { logActivity } from "@/lib/activity-log";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

async function isStaff(request: Request): Promise<boolean> {
  const admin = await getAdminSession(request);
  if (admin) return true;
  const employee = await getEmployeeSession(request);
  if (employee) return true;
  return false;
}

// ─── Categories ─────────────────────────────────────────────

export async function handleGetForumCategories() {
  try {
    let categories = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.isActive, true))
      .orderBy(forumCategories.sortOrder);

    // Auto-seed default categories if none exist
    if (categories.length === 0) {
      const now = new Date();
      const defaults = [
        { slug: "general", name: "General Discussion", description: "Chat about anything related to HUBMC", icon: "messages-square", sortOrder: 1 },
        { slug: "help", name: "Help & Support", description: "Get help with orders, accounts, and server issues", icon: "life-buoy", sortOrder: 2 },
        { slug: "suggestions", name: "Suggestions", description: "Share ideas to improve HUBMC", icon: "lightbulb", sortOrder: 3 },
        { slug: "creations", name: "Builds & Creations", description: "Show off your Minecraft builds and creations", icon: "hammer", sortOrder: 4 },
        { slug: "off-topic", name: "Off-Topic", description: "Non-Minecraft chat and fun discussions", icon: "coffee", sortOrder: 5 },
      ];

      for (const cat of defaults) {
        await db.insert(forumCategories).values({
          id: crypto.randomUUID(),
          ...cat,
          isActive: true,
          threadCount: 0,
          postCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      categories = await db
        .select()
        .from(forumCategories)
        .where(eq(forumCategories.isActive, true))
        .orderBy(forumCategories.sortOrder);
    }

    return json({ categories });
  } catch (err) {
    console.error("[FORUM] handleGetForumCategories error:", err);
    return error("Failed to load forum categories.", 500);
  }
}

// ─── Threads List ───────────────────────────────────────────

export async function handleGetForumThreads(request: Request) {
  try {
    const url = new URL(request.url);
    const categorySlug = url.searchParams.get("category");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    const whereClause = categorySlug
      ? and(
          eq(forumThreads.status, "OPEN" as const),
          eq(forumCategories.slug, categorySlug),
        )
      : eq(forumThreads.status, "OPEN" as const);

    const threads = await db
      .select({
        id: forumThreads.id,
        categoryId: forumThreads.categoryId,
        categorySlug: forumCategories.slug,
        categoryName: forumCategories.name,
        authorName: forumThreads.authorName,
        title: forumThreads.title,
        slug: forumThreads.slug,
        status: forumThreads.status,
        isPinned: forumThreads.isPinned,
        replyCount: forumThreads.replyCount,
        viewCount: forumThreads.viewCount,
        lastReplyAt: forumThreads.lastReplyAt,
        createdAt: forumThreads.createdAt,
      })
      .from(forumThreads)
      .innerJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
      .where(whereClause)
      .orderBy(desc(forumThreads.isPinned), desc(forumThreads.lastReplyAt), desc(forumThreads.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: count() })
      .from(forumThreads)
      .innerJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
      .where(whereClause);

    const total = totalResult[0]?.count ?? 0;

    return json({
      threads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[FORUM] handleGetForumThreads error:", err);
    return error("Failed to load forum threads.", 500);
  }
}

// ─── Thread Detail ──────────────────────────────────────────

export async function handleGetForumThread(request: Request) {
  try {
    const url = new URL(request.url);
    const threadId = url.searchParams.get("id");
    const threadSlug = url.searchParams.get("slug");

    if (!threadId && !threadSlug) return error("Thread id or slug required");

    const whereClause = threadId
      ? eq(forumThreads.id, threadId)
      : eq(forumThreads.slug, threadSlug!);

    const threadRows = await db
      .select({
        id: forumThreads.id,
        categoryId: forumThreads.categoryId,
        categorySlug: forumCategories.slug,
        categoryName: forumCategories.name,
        authorId: forumThreads.authorId,
        authorName: forumThreads.authorName,
        title: forumThreads.title,
        slug: forumThreads.slug,
        content: forumThreads.content,
        status: forumThreads.status,
        isPinned: forumThreads.isPinned,
        replyCount: forumThreads.replyCount,
        viewCount: forumThreads.viewCount,
        createdAt: forumThreads.createdAt,
        updatedAt: forumThreads.updatedAt,
      })
      .from(forumThreads)
      .innerJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
      .where(whereClause)
      .limit(1);

    const thread = threadRows[0];
    if (!thread) return error("Thread not found", 404);

    // Increment view count (non-critical)
    try {
      await db
        .update(forumThreads)
        .set({ viewCount: sql`COALESCE(${forumThreads.viewCount}, 0) + 1` })
        .where(eq(forumThreads.id, thread.id));
    } catch (viewErr) {
      console.error("[FORUM] Failed to update view count:", viewErr);
    }

    // Fetch replies
    const replies = await db
      .select()
      .from(forumReplies)
      .where(
        and(eq(forumReplies.threadId, thread.id), eq(forumReplies.isHidden, false)),
      )
      .orderBy(forumReplies.createdAt);

    return json({ thread, replies });
  } catch (err) {
    console.error("[FORUM] handleGetForumThread error:", err);
    return error("Failed to load thread.", 500);
  }
}

// ─── Create Thread ──────────────────────────────────────────

export async function handleCreateForumThread(request: Request) {
  try {
    const session = await getHubMCSession(request);
    if (!session?.user?.customerId) return error("Login required to create a thread.", 401);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("Invalid request body", 400);
    }

    const { categoryId, title, content } = body;
    if (!categoryId || !title?.trim() || !content?.trim()) {
      return error("Category, title, and content are required.");
    }

    if (title.length > 200) return error("Title must be 200 characters or less.");
    if (content.length > 10000) return error("Content must be 10,000 characters or less.");

    // Verify category exists
    const catRows = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.id, categoryId))
      .limit(1);
    if (!catRows[0]) return error("Category not found", 404);

    const threadId = crypto.randomUUID();
    const now = new Date();
    const baseSlug = slugify(title);
    const slug = `${baseSlug}-${threadId.slice(0, 8)}`;

    await db.insert(forumThreads).values({
      id: threadId,
      categoryId,
      authorId: session.user.customerId,
      authorName: session.user.fullName || session.user.phoneNumber || "Player",
      title: title.trim(),
      slug,
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
    });

    // Increment category thread count (non-critical, don't fail the whole request)
    try {
      await db
        .update(forumCategories)
        .set({
          threadCount: sql`COALESCE(${forumCategories.threadCount}, 0) + 1`,
          postCount: sql`COALESCE(${forumCategories.postCount}, 0) + 1`,
          updatedAt: now,
        })
        .where(eq(forumCategories.id, categoryId));
    } catch (countErr) {
      console.error("[FORUM] Failed to update category counts:", countErr);
    }

    logActivity({
      actorType: "customer",
      actorId: session.user.customerId,
      actorName: session.user.fullName || session.user.phoneNumber || "Player",
      action: "CREATE",
      entity: "forum_thread",
      entityId: threadId,
      summary: `Forum thread created: "${title.trim()}"`,
    });

    return json({ ok: true, threadId, slug });
  } catch (err) {
    console.error("[FORUM] handleCreateForumThread unexpected error:", err);
    return error("An unexpected error occurred while creating the thread. Please try again.", 500);
  }
}

// ─── Create Reply ───────────────────────────────────────────

export async function handleCreateForumReply(request: Request) {
  try {
    const session = await getHubMCSession(request);
    if (!session?.user?.customerId) return error("Login required to reply.", 401);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("Invalid request body", 400);
    }

    const { threadId, content } = body;
    if (!threadId || !content?.trim()) {
      return error("Thread ID and content are required.");
    }

    if (content.length > 5000) return error("Reply must be 5,000 characters or less.");

    // Verify thread exists and is open
    const threadRows = await db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId))
      .limit(1);
    const thread = threadRows[0];
    if (!thread) return error("Thread not found", 404);
    if (thread.status === "LOCKED") return error("This thread is locked.");
    if (thread.status === "HIDDEN") return error("Thread not found.", 404);

    const replyId = crypto.randomUUID();
    const now = new Date();

    await db.insert(forumReplies).values({
      id: replyId,
      threadId,
      authorId: session.user.customerId,
      authorName: session.user.fullName || session.user.phoneNumber || "Player",
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
    });

    // Update thread reply count and last reply time (non-critical)
    try {
      await db
        .update(forumThreads)
        .set({
          replyCount: sql`COALESCE(${forumThreads.replyCount}, 0) + 1`,
          lastReplyAt: now,
          updatedAt: now,
        })
        .where(eq(forumThreads.id, threadId));
    } catch (countErr) {
      console.error("[FORUM] Failed to update thread reply count:", countErr);
    }

    // Increment category post count (non-critical)
    try {
      await db
        .update(forumCategories)
        .set({
          postCount: sql`COALESCE(${forumCategories.postCount}, 0) + 1`,
          updatedAt: now,
        })
        .where(eq(forumCategories.id, thread.categoryId));
    } catch (countErr) {
      console.error("[FORUM] Failed to update category post count:", countErr);
    }

    logActivity({
      actorType: "customer",
      actorId: session.user.customerId,
      actorName: session.user.fullName || session.user.phoneNumber || "Player",
      action: "REPLY",
      entity: "forum_thread",
      entityId: threadId,
      summary: `Forum reply posted on thread: "${thread.title}"`,
    });

    return json({ ok: true, replyId });
  } catch (err) {
    console.error("[FORUM] handleCreateForumReply unexpected error:", err);
    return error("An unexpected error occurred while posting your reply. Please try again.", 500);
  }
}

// ─── Moderation: Update Thread ──────────────────────────────

export async function handleModerateForumThread(request: Request) {
  try {
    if (!(await isStaff(request))) return error("Staff access required.", 401);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("Invalid request body", 400);
    }

    const { threadId, action, value } = body;
    if (!threadId || !action) return error("threadId and action required.");

    const threadRows = await db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId))
      .limit(1);
    if (!threadRows[0]) return error("Thread not found", 404);

    const now = new Date();

    switch (action) {
      case "pin":
        await db.update(forumThreads).set({ isPinned: !!value, updatedAt: now }).where(eq(forumThreads.id, threadId));
        break;
      case "lock":
        await db.update(forumThreads).set({ status: value ? "LOCKED" : "OPEN", updatedAt: now }).where(eq(forumThreads.id, threadId));
        break;
      case "hide":
        await db.update(forumThreads).set({ status: "HIDDEN", updatedAt: now }).where(eq(forumThreads.id, threadId));
        break;
      case "move": {
        const newCategoryId = value;
        if (!newCategoryId) return error("new category required for move.");
        await db.update(forumThreads).set({ categoryId: newCategoryId, updatedAt: now }).where(eq(forumThreads.id, threadId));
        break;
      }
      default:
        return error("Unknown action");
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[FORUM] handleModerateForumThread unexpected error:", err);
    return error("An unexpected error occurred during moderation.", 500);
  }
}

// ─── Moderation: Delete Reply ───────────────────────────────

export async function handleDeleteForumReply(request: Request) {
  try {
    if (!(await isStaff(request))) return error("Staff access required.", 401);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("Invalid request body", 400);
    }

    const { replyId, hide } = body;
    if (!replyId) return error("replyId required.");

    const replyRows = await db
      .select()
      .from(forumReplies)
      .where(eq(forumReplies.id, replyId))
      .limit(1);
    if (!replyRows[0]) return error("Reply not found", 404);

    if (hide) {
      await db.update(forumReplies).set({ isHidden: true, updatedAt: new Date() }).where(eq(forumReplies.id, replyId));
    } else {
      await db.delete(forumReplies).where(eq(forumReplies.id, replyId));
    }

    // Decrement thread reply count (non-critical)
    try {
      const threadId = replyRows[0].threadId;
      await db
        .update(forumThreads)
        .set({ replyCount: sql`GREATEST(COALESCE(${forumThreads.replyCount}, 0) - 1, 0)`, updatedAt: new Date() })
        .where(eq(forumThreads.id, threadId));
    } catch (countErr) {
      console.error("[FORUM] Failed to decrement reply count:", countErr);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[FORUM] handleDeleteForumReply unexpected error:", err);
    return error("An unexpected error occurred while deleting the reply.", 500);
  }
}

// ─── Staff Create Announcement ──────────────────────────────

export async function handleCreateForumAnnouncement(request: Request) {
  try {
    const session = await getHubMCSession(request);
    if (!session?.user?.customerId) return error("Login required.", 401);
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "EMPLOYEE") {
      return error("Staff access required.", 403);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("Invalid request body", 400);
    }

    const { title, content } = body;
    if (!title?.trim() || !content?.trim()) {
      return error("Title and content required.");
    }

    // Find or create Announcements category
    const annCats = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, "announcements"))
      .limit(1);

    let categoryId = annCats[0]?.id;
    if (!categoryId) {
      categoryId = crypto.randomUUID();
      const now = new Date();
      await db.insert(forumCategories).values({
        id: categoryId,
        slug: "announcements",
        name: "Announcements",
        description: "Official HUBMC announcements and updates",
        icon: "megaphone",
        sortOrder: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const threadId = crypto.randomUUID();
    const now = new Date();
    const baseSlug = slugify(title);
    const slug = `${baseSlug}-${threadId.slice(0, 8)}`;

    await db.insert(forumThreads).values({
      id: threadId,
      categoryId,
      authorId: session.user.customerId,
      authorName: session.user.fullName || "Staff",
      title: title.trim(),
      slug,
      content: content.trim(),
      isPinned: true,
      createdAt: now,
      updatedAt: now,
    });

    // Increment counts (non-critical)
    try {
      await db
        .update(forumCategories)
        .set({
          threadCount: sql`COALESCE(${forumCategories.threadCount}, 0) + 1`,
          postCount: sql`COALESCE(${forumCategories.postCount}, 0) + 1`,
          updatedAt: now,
        })
        .where(eq(forumCategories.id, categoryId));
    } catch (countErr) {
      console.error("[FORUM] Failed to update category counts:", countErr);
    }

    return json({ ok: true, threadId, slug });
  } catch (err) {
    console.error("[FORUM] handleCreateForumAnnouncement unexpected error:", err);
    return error("An unexpected error occurred while creating the announcement.", 500);
  }
}

// ─── Staff: List All Threads (including hidden/locked) ───────

export async function handleStaffGetAllForumThreads(request: Request) {
  try {
    if (!(await isStaff(request))) return error("Staff access required.", 401);

    const url = new URL(request.url);
    const categorySlug = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (categorySlug) conditions.push(eq(forumCategories.slug, categorySlug));
    if (status && ["OPEN", "LOCKED", "HIDDEN"].includes(status)) {
      conditions.push(eq(forumThreads.status, status as "OPEN" | "LOCKED" | "HIDDEN"));
    }
    if (search) {
      conditions.push(
        or(
          like(forumThreads.title, `%${search}%`),
          like(forumThreads.authorName, `%${search}%`),
          like(forumThreads.content, `%${search}%`),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const threads = await db
      .select({
        id: forumThreads.id,
        categoryId: forumThreads.categoryId,
        categorySlug: forumCategories.slug,
        categoryName: forumCategories.name,
        authorId: forumThreads.authorId,
        authorName: forumThreads.authorName,
        title: forumThreads.title,
        slug: forumThreads.slug,
        content: forumThreads.content,
        status: forumThreads.status,
        isPinned: forumThreads.isPinned,
        replyCount: forumThreads.replyCount,
        viewCount: forumThreads.viewCount,
        lastReplyAt: forumThreads.lastReplyAt,
        createdAt: forumThreads.createdAt,
        updatedAt: forumThreads.updatedAt,
      })
      .from(forumThreads)
      .innerJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
      .where(whereClause)
      .orderBy(desc(forumThreads.isPinned), desc(forumThreads.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: count() })
      .from(forumThreads)
      .innerJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
      .where(whereClause);

    const total = totalResult[0]?.count ?? 0;

    return json({
      threads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[FORUM] handleStaffGetAllForumThreads error:", err);
    return error("Failed to load forum threads.", 500);
  }
}

// ─── Staff: Get Thread Detail (including hidden replies) ─────

export async function handleStaffGetForumThreadDetail(request: Request) {
  try {
    if (!(await isStaff(request))) return error("Staff access required.", 401);

    const url = new URL(request.url);
    const threadId = url.searchParams.get("id");
    if (!threadId) return error("Thread id required");

    const threadRows = await db
      .select({
        id: forumThreads.id,
        categoryId: forumThreads.categoryId,
        categorySlug: forumCategories.slug,
        categoryName: forumCategories.name,
        authorId: forumThreads.authorId,
        authorName: forumThreads.authorName,
        title: forumThreads.title,
        slug: forumThreads.slug,
        content: forumThreads.content,
        status: forumThreads.status,
        isPinned: forumThreads.isPinned,
        replyCount: forumThreads.replyCount,
        viewCount: forumThreads.viewCount,
        lastReplyAt: forumThreads.lastReplyAt,
        createdAt: forumThreads.createdAt,
        updatedAt: forumThreads.updatedAt,
      })
      .from(forumThreads)
      .innerJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
      .where(eq(forumThreads.id, threadId))
      .limit(1);

    const thread = threadRows[0];
    if (!thread) return error("Thread not found", 404);

    const replies = await db
      .select()
      .from(forumReplies)
      .where(eq(forumReplies.threadId, thread.id))
      .orderBy(forumReplies.createdAt);

    return json({ thread, replies });
  } catch (err) {
    console.error("[FORUM] handleStaffGetForumThreadDetail error:", err);
    return error("Failed to load thread.", 500);
  }
}

// ─── Staff: Delete Thread ───────────────────────────────────

export async function handleStaffDeleteForumThread(request: Request) {
  try {
    if (!(await isStaff(request))) return error("Staff access required.", 401);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("Invalid request body", 400);
    }

    const { threadId } = body;
    if (!threadId) return error("threadId required.");

    const threadRows = await db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId))
      .limit(1);
    if (!threadRows[0]) return error("Thread not found", 404);

    await db.delete(forumReplies).where(eq(forumReplies.threadId, threadId));
    await db.delete(forumThreads).where(eq(forumThreads.id, threadId));

    return json({ ok: true });
  } catch (err) {
    console.error("[FORUM] handleStaffDeleteForumThread error:", err);
    return error("An unexpected error occurred while deleting the thread.", 500);
  }
}

// ─── Staff: Get Categories ──────────────────────────────────

export async function handleStaffGetForumCategories(request: Request) {
  try {
    if (!(await isStaff(request))) return error("Staff access required.", 401);

    const categories = await db
      .select()
      .from(forumCategories)
      .orderBy(forumCategories.sortOrder);

    return json({ categories });
  } catch (err) {
    console.error("[FORUM] handleStaffGetForumCategories error:", err);
    return error("Failed to load categories.", 500);
  }
}

// ─── Staff: Create Category ─────────────────────────────────

export async function handleStaffCreateForumCategory(request: Request) {
  try {
    if (!(await isStaff(request))) return error("Staff access required.", 401);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("Invalid request body", 400);
    }

    const { name, description, icon, sortOrder } = body;
    if (!name?.trim()) return error("Category name is required.");

    const slug = slugify(name);
    const existing = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, slug))
      .limit(1);
    if (existing[0]) return error("A category with this name already exists.", 409);

    const categoryId = crypto.randomUUID();
    const now = new Date();

    await db.insert(forumCategories).values({
      id: categoryId,
      slug,
      name: name.trim(),
      description: description?.trim() || null,
      icon: icon?.trim() || null,
      sortOrder: sortOrder ?? 0,
      isActive: true,
      threadCount: 0,
      postCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const category = (
      await db.select().from(forumCategories).where(eq(forumCategories.id, categoryId)).limit(1)
    )[0];

    return json({ ok: true, category }, 201);
  } catch (err) {
    console.error("[FORUM] handleStaffCreateForumCategory error:", err);
    return error("An unexpected error occurred while creating the category.", 500);
  }
}

// ─── Staff: Update Category ─────────────────────────────────

export async function handleStaffUpdateForumCategory(request: Request) {
  try {
    if (!(await isStaff(request))) return error("Staff access required.", 401);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("Invalid request body", 400);
    }

    const { categoryId, name, description, icon, sortOrder, isActive } = body;
    if (!categoryId) return error("categoryId required.");

    const existing = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.id, categoryId))
      .limit(1);
    if (!existing[0]) return error("Category not found", 404);

    const data: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) {
      data.name = name.trim();
      data.slug = slugify(name);
    }
    if (description !== undefined) data.description = description?.trim() || null;
    if (icon !== undefined) data.icon = icon?.trim() || null;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;

    await db.update(forumCategories).set(data).where(eq(forumCategories.id, categoryId));

    const category = (
      await db.select().from(forumCategories).where(eq(forumCategories.id, categoryId)).limit(1)
    )[0];

    return json({ ok: true, category });
  } catch (err) {
    console.error("[FORUM] handleStaffUpdateForumCategory error:", err);
    return error("An unexpected error occurred while updating the category.", 500);
  }
}

// ─── Staff: Delete Category ─────────────────────────────────

export async function handleStaffDeleteForumCategory(request: Request) {
  try {
    if (!(await isStaff(request))) return error("Staff access required.", 401);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("Invalid request body", 400);
    }

    const { categoryId } = body;
    if (!categoryId) return error("categoryId required.");

    const existing = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.id, categoryId))
      .limit(1);
    if (!existing[0]) return error("Category not found", 404);

    const threadCount = await db
      .select({ count: count() })
      .from(forumThreads)
      .where(eq(forumThreads.categoryId, categoryId));
    if (Number(threadCount[0]?.count ?? 0) > 0) {
      return error("Cannot delete category with existing threads. Move or delete threads first.", 409);
    }

    await db.delete(forumCategories).where(eq(forumCategories.id, categoryId));

    return json({ ok: true });
  } catch (err) {
    console.error("[FORUM] handleStaffDeleteForumCategory error:", err);
    return error("An unexpected error occurred while deleting the category.", 500);
  }
}
