import { devlog } from "@/lib/dev-log";
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

async function requireRole(request: Request, roles: string[]): Promise<Response | null> {
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

async function logActivity(employeeId: string | null, action: string, entity: string, entityId: string | null, details: string | null, severity = "INFO") {
  try {
    const prisma = await getPrismaClient();
    await prisma.activityLog.create({
      data: { employeeId, action, entity, entityId, details, severity },
    });
  } catch (e) {
    console.warn("Failed to log activity:", e);
  }
}

// ─── PRODUCTS ────────────────────────────────────────────────

export async function handleAdminGetProducts() {
  const prisma = await getPrismaClient();
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return json({ products: products.map((p) => ({ ...p, price: Number(p.price) })) });
}

export async function handleAdminCreateProduct(request: Request) {
  devlog("[AdminProducts] === Create product request ===");
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) { devlog("[AdminProducts] Auth failed"); return authErr; }
  const staff = getStaffSession(request);
  devlog("[AdminProducts] Authenticated as", staff?.email, "role:", staff?.role);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    console.error("[AdminProducts] Invalid JSON body");
    return error("Invalid request body", 400);
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const priceRaw = body.price;

  if (!slug) { devlog("[AdminProducts] Missing slug"); return error("Slug is required", 400); }
  if (!name) { devlog("[AdminProducts] Missing name"); return error("Name is required", 400); }
  if (!description) { devlog("[AdminProducts] Missing description"); return error("Description is required", 400); }
  if (!imageUrl) { devlog("[AdminProducts] Missing imageUrl"); return error("Image URL is required", 400); }
  if (priceRaw === undefined || priceRaw === null || priceRaw === "") {
    devlog("[AdminProducts] Missing price"); return error("Price is required", 400);
  }

  const price = Number(priceRaw);
  if (isNaN(price) || price <= 0) {
    devlog("[AdminProducts] Invalid price:", priceRaw);
    return error("Invalid price", 400);
  }

  devlog("[AdminProducts] Validated fields OK — slug:", slug, "name:", name, "price:", price);

  try {
    const prisma = await getPrismaClient();
    devlog("[AdminProducts] Prisma client acquired, creating product...");
    const product = await prisma.product.create({
      data: {
        slug, name, description, imageUrl,
        price,
        metadata: body.rewards ? { rewards: body.rewards, badge: body.badge ?? "" } : {},
      },
    });
    devlog("[AdminProducts] Product created successfully — id:", product.id, "slug:", product.slug);

    await logActivity(staff?.employeeId, "CREATE", "product", product.id, `Created product ${name}`);
    return json({ product: { ...product, price: Number(product.price) } }, 201);
  } catch (err: any) {
    console.error("[AdminProducts] Database create failed:", err?.message || err);
    if (err?.code === "P2002") {
      return error("Slug already exists", 409);
    }
    return error("Database create failed: " + (err?.message || "unknown error"), 500);
  }
}

export async function handleAdminUpdateProduct(request: Request) {
  devlog("[AdminProducts] === Update product request ===");
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) { devlog("[AdminProducts] Auth failed"); return authErr; }
  const staff = getStaffSession(request);

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return error("Invalid request body", 400); }

  const { id, slug, name, description, imageUrl, price, active, badge } = body;
  if (!id) return error("id required", 400);
  devlog("[AdminProducts] Updating product:", id);

  const data: Record<string, unknown> = {};
  if (slug !== undefined) data.slug = slug;
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (price !== undefined) {
    const p = Number(price);
    if (isNaN(p) || p <= 0) return error("Invalid price", 400);
    data.price = p;
  }
  if (active !== undefined) data.active = active;
  if (badge !== undefined) data.metadata = { badge };

  try {
    const prisma = await getPrismaClient();
    const product = await prisma.product.update({ where: { id }, data });
    devlog("[AdminProducts] Product updated:", product.id);
    await logActivity(staff?.employeeId, "UPDATE", "product", id, `Updated product ${name ?? id}`);
    return json({ product: { ...product, price: Number(product.price) } });
  } catch (err: any) {
    console.error("[AdminProducts] Database update failed:", err?.message || err);
    if (err?.code === "P2025") return error("Product not found", 404);
    if (err?.code === "P2002") return error("Slug already exists", 409);
    return error("Database update failed: " + (err?.message || "unknown error"), 500);
  }
}

export async function handleAdminDeleteProduct(request: Request) {
  devlog("[AdminProducts] === Delete product request ===");
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) { devlog("[AdminProducts] Auth failed"); return authErr; }
  const staff = getStaffSession(request);

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return error("Invalid request body", 400); }

  const { id } = body;
  if (!id) return error("id required", 400);
  devlog("[AdminProducts] Deleting product:", id);

  try {
    const prisma = await getPrismaClient();
    await prisma.product.delete({ where: { id } });
    devlog("[AdminProducts] Product deleted:", id);
    await logActivity(staff?.employeeId, "DELETE", "product", id, `Deleted product ${id}`);
    return json({ success: true });
  } catch (err: any) {
    console.error("[AdminProducts] Database delete failed:", err?.message || err);
    if (err?.code === "P2025") return error("Product not found", 404);
    return error("Database delete failed: " + (err?.message || "unknown error"), 500);
  }
}

// ─── ORDERS (Employee view) ──────────────────────────────────

export async function handleAdminGetOrders(request: Request) {
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const delivery = url.searchParams.get("delivery") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = 20;

  const prisma = await getPrismaClient();
  const where: any = {};
  if (search) {
    where.OR = [
      { minecraftUsername: { contains: search } },
      { email: { contains: search } },
      { id: { contains: search } },
      { razorpayPaymentId: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (delivery) where.deliveryStatus = delivery;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: true },
    }),
    prisma.order.count({ where }),
  ]);

  return json({
    orders: orders.map((o) => ({
      id: o.id, minecraftUsername: o.minecraftUsername, minecraftUuid: o.minecraftUuid,
      email: o.email, country: o.country, status: o.status, paymentMethod: o.paymentMethod,
      subtotal: Number(o.subtotal), discountAmount: Number(o.discountAmount), total: Number(o.total),
      razorpayPaymentId: o.razorpayPaymentId, deliveryStatus: o.deliveryStatus,
      deliveredAt: o.deliveredAt, createdAt: o.createdAt,
      items: (o.items ?? []).map((i) => ({
        productId: i.productId, productName: i.productName, quantity: i.quantity,
        unitPrice: Number(i.unitPrice), subtotal: Number(i.subtotal),
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function handleAdminUpdateOrderStatus(request: Request) {
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) return authErr;
  const staff = getStaffSession(request);

  const body = await request.json();
  const { id, status, deliveryStatus } = body;
  if (!id) return error("id required", 400);

  const prisma = await getPrismaClient();
  const data: any = {};
  if (status) data.status = status;
  if (deliveryStatus) {
    data.deliveryStatus = deliveryStatus;
    if (deliveryStatus === "DELIVERED") data.deliveredAt = new Date();
  }
  await prisma.order.update({ where: { id }, data });
  await logActivity(staff?.employeeId, "UPDATE", "order", id,
    `Updated order ${id}: status=${status ?? ""} delivery=${deliveryStatus ?? ""}`);
  return json({ success: true });
}

// ─── SUPPORT TICKETS ─────────────────────────────────────────

export async function handleAdminGetTickets(request: Request) {
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const where: any = {};
  if (status) where.status = status;

  const prisma = await getPrismaClient();
  const tickets = await prisma.supportTicket.findMany({
    where, orderBy: { createdAt: "desc" },
    include: {
      replies: { orderBy: { createdAt: "asc" } },
      customer: { select: { minecraftUsername: true, minecraftUuid: true } },
    },
  });

  return json({
    tickets: tickets.map((t) => ({
      id: t.id, subject: t.subject, message: t.message, status: t.status,
      createdAt: t.createdAt, updatedAt: t.updatedAt,
      minecraftUsername: t.customer?.minecraftUsername ?? "Unknown",
      minecraftUuid: t.customer?.minecraftUuid ?? null,
      replies: (t.replies ?? []).map((r) => ({
        id: r.id, authorName: r.authorName, message: r.message, createdAt: r.createdAt,
      })),
    })),
  });
}

export async function handleAdminReplyTicket(request: Request) {
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) return authErr;
  const staff = getStaffSession(request);

  const body = await request.json();
  const { ticketId, message } = body;
  if (!ticketId || !message) return error("ticketId and message required", 400);

  const prisma = await getPrismaClient();
  await prisma.ticketReply.create({
    data: {
      ticketId,
      employeeId: staff?.employeeId,
      authorName: staff?.email ?? "Staff",
      message,
    },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "IN_PROGRESS" },
  });

  await logActivity(staff?.employeeId, "REPLY", "ticket", ticketId, `Replied to ticket ${ticketId}`);
  return json({ success: true }, 201);
}

export async function handleAdminResolveTicket(request: Request) {
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) return authErr;
  const staff = getStaffSession(request);

  const body = await request.json();
  const { ticketId, status } = body;
  if (!ticketId || !status) return error("ticketId and status required", 400);

  const prisma = await getPrismaClient();
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  await logActivity(staff?.employeeId, "RESOLVE", "ticket", ticketId, `Ticket ${ticketId} -> ${status}`);
  return json({ success: true });
}

// ─── CUSTOMERS (Admin only) ──────────────────────────────────

export async function handleAdminGetCustomers(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;

  const prisma = await getPrismaClient();
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      orders: { select: { id: true, total: true, status: true, createdAt: true } },
      user: { select: { email: true } },
    },
  });

  return json({
    customers: customers.map((c) => ({
      id: c.id, minecraftUsername: c.minecraftUsername, minecraftUuid: c.minecraftUuid,
      avatarUrl: c.avatarUrl, country: c.country, lastLoginAt: c.lastLoginAt,
      createdAt: c.createdAt, email: c.user?.email ?? "",
      totalSpent: (c.orders ?? []).reduce((sum, o) =>
        o.status === "PAID" || o.status === "FULFILLED" ? sum + Number(o.total) : sum, 0),
      purchaseCount: (c.orders ?? []).filter((o) =>
        o.status === "PAID" || o.status === "FULFILLED").length,
      orders: c.orders ?? [],
    })),
  });
}

// ─── EMPLOYEES (Admin only) ──────────────────────────────────

export async function handleAdminGetEmployees(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;

  const prisma = await getPrismaClient();
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, name: true, image: true, role: true } },
      permissions: true,
      _count: { select: { assignedTickets: true } },
    },
  });

  return json({
    employees: employees.map((e) => ({
      id: e.id, displayName: e.displayName, department: e.department,
      isActive: e.isActive, disabledAt: e.disabledAt, createdAt: e.createdAt,
      email: e.user?.email ?? "", minecraftUsername: e.user?.name ?? "",
      avatarUrl: e.user?.image ?? "", role: e.user?.role ?? "EMPLOYEE",
      userId: e.userId, ticketCount: e._count?.assignedTickets ?? 0,
      permissions: e.permissions ?? null,
    })),
  });
}

export async function handleAdminCreateEmployee(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;
  const staff = getStaffSession(request);

  const body = await request.json();
  const { email, displayName, department, role, minecraftUsername } = body;
  if (!email || !displayName) return error("email and displayName required", 400);

  const prisma = await getPrismaClient();
  const user = await prisma.user.create({
    data: {
      email,
      name: minecraftUsername ?? displayName,
      role: role ?? "EMPLOYEE",
    },
  });

  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      displayName,
      department: department ?? null,
      permissions: { create: {} },
    },
  });

  await logActivity(staff?.employeeId, "CREATE", "employee", employee.id,
    `Created employee ${displayName}`);
  return json({ employee: { id: employee.id, displayName, department, isActive: true } }, 201);
}

export async function handleAdminUpdateEmployee(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;
  const staff = getStaffSession(request);

  const body = await request.json();
  const { id, displayName, department, isActive, role } = body;
  if (!id) return error("id required", 400);

  const prisma = await getPrismaClient();
  const empData: any = {};
  if (displayName !== undefined) empData.displayName = displayName;
  if (department !== undefined) empData.department = department;
  if (isActive !== undefined) {
    empData.isActive = isActive;
    if (!isActive) empData.disabledAt = new Date();
    else empData.disabledAt = null;
  }
  await prisma.employee.update({ where: { id }, data: empData });

  if (role !== undefined) {
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (emp) {
      await prisma.user.update({ where: { id: emp.userId }, data: { role } });
    }
  }

  await logActivity(staff?.employeeId, "UPDATE", "employee", id, `Updated employee ${id}`);
  return json({ success: true });
}

export async function handleAdminDeleteEmployee(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;
  const staff = getStaffSession(request);

  const body = await request.json();
  const { id } = body;
  if (!id) return error("id required", 400);

  const prisma = await getPrismaClient();
  await prisma.employee.delete({ where: { id } });
  await logActivity(staff?.employeeId, "DELETE", "employee", id, `Deleted employee ${id}`);
  return json({ success: true });
}

// ─── ACTIVITY LOGS (Admin only) ──────────────────────────────

export async function handleAdminGetLogs(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") ?? "";
  const action = url.searchParams.get("action") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = 50;

  const prisma = await getPrismaClient();
  const where: any = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { employee: { select: { displayName: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return json({
    logs: logs.map((l) => ({
      id: l.id, action: l.action, entity: l.entity, entityId: l.entityId,
      details: l.details, severity: l.severity, ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      employeeName: l.employee?.displayName ?? "System",
    })),
    total, page,
    totalPages: Math.ceil(total / limit),
  });
}

// ─── PERMISSIONS (Admin only) ────────────────────────────────

export async function handleAdminGetPermissions(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");
  if (!employeeId) return error("employeeId required", 400);

  const prisma = await getPrismaClient();
  const perms = await prisma.rolePermission.findUnique({ where: { employeeId } });
  return json({ permissions: perms });
}

export async function handleAdminUpdatePermissions(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;
  const staff = getStaffSession(request);

  const body = await request.json();
  const { employeeId, products, orders, support, customers, employees, logs, settings } = body;
  if (!employeeId) return error("employeeId required", 400);

  const prisma = await getPrismaClient();
  const perms = await prisma.rolePermission.upsert({
    where: { employeeId },
    update: {
      ...(products !== undefined ? { products } : {}),
      ...(orders !== undefined ? { orders } : {}),
      ...(support !== undefined ? { support } : {}),
      ...(customers !== undefined ? { customers } : {}),
      ...(employees !== undefined ? { employees } : {}),
      ...(logs !== undefined ? { logs } : {}),
      ...(settings !== undefined ? { settings } : {}),
    },
    create: {
      employeeId,
      products: products ?? true,
      orders: orders ?? true,
      support: support ?? true,
      customers: customers ?? false,
      employees: employees ?? false,
      logs: logs ?? false,
      settings: settings ?? false,
    },
  });

  await logActivity(staff?.employeeId, "UPDATE", "permissions", employeeId,
    `Updated permissions for employee ${employeeId}`);
  return json({ permissions: perms });
}

// ─── DASHBOARD STATS ─────────────────────────────────────────

export async function handleAdminDashboardStats(request: Request) {
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) return authErr;

  const prisma = await getPrismaClient();

  const [totalOrders, pendingOrders, paidOrders, totalCustomers, openTickets, totalProducts] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.customer.count(),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.product.count(),
    ]);

  const recentOrders = await prisma.order.findMany({
    where: { status: { in: ["PAID", "FULFILLED"] } },
    select: { total: true },
  });
  const totalRevenue = recentOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);

  return json({
    stats: {
      totalOrders, pendingOrders, paidOrders,
      totalCustomers, openTickets, totalProducts,
      totalRevenue,
    },
  });
}

// ─── SERVER REVIEWS ──────────────────────────────────────────

export async function handleGetServerReviews() {
  try {
    const prisma = await getPrismaClient();
    const reviews = await prisma.serverReview.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        customer: { select: { minecraftUsername: true, avatarUrl: true } },
      },
    });

    const allReviews = await prisma.serverReview.findMany({
      select: { rating: true },
    });
    const totalReviews = allReviews.length;
    const overallRating = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const starBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allReviews.forEach((r) => { starBreakdown[r.rating as keyof typeof starBreakdown]++; });

    return json({
      reviews: reviews.map((r) => ({
        id: r.id,
        minecraftUsername: r.minecraftUsername,
        avatarUrl: r.customer?.avatarUrl ?? null,
        rating: r.rating,
        title: r.title,
        message: r.message,
        createdAt: r.createdAt,
      })),
      overallRating: Math.round(overallRating * 10) / 10,
      totalReviews,
      starBreakdown,
    });
  } catch (err: any) {
    console.error("[ServerReviews] Failed to fetch reviews:", err?.message || err);
    return json({ reviews: [], overallRating: 0, totalReviews: 0, starBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  }
}

export async function handleSubmitServerReview(request: Request) {
  devlog("[ServerReviews] === Submit review request ===");

  const session = await getHubMCSession(request);
  if (!session?.user?.minecraftUsername) return json({ error: "Unauthorized — login required" }, 401);

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return error("Invalid request body", 400); }

  const rating = Number(body.rating);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!rating || rating < 1 || rating > 5) { devlog("[ServerReviews] Invalid rating:", rating); return error("Rating must be 1-5", 400); }
  if (!title) { devlog("[ServerReviews] Missing title"); return error("Title is required", 400); }
  if (!message) { devlog("[ServerReviews] Missing message"); return error("Review message is required", 400); }

  devlog("[ServerReviews] Validated — rating:", rating, "title:", title);

  try {
    const prisma = await getPrismaClient();
    const customerId = session.user.customerId;
    const userId = session.user.minecraftUuid;

    const existing = await prisma.serverReview.findUnique({ where: { userId: userId } });
    if (existing) { devlog("[ServerReviews] Duplicate review from", session.user.minecraftUsername); return error("You have already submitted a review", 409); }

    const review = await prisma.serverReview.create({
      data: {
        userId,
        customerId: customerId ?? null,
        minecraftUsername: session.user.minecraftUsername,
        rating,
        title,
        message,
      },
    });
    devlog("[ServerReviews] Review created:", review.id);
    return json({ review: { id: review.id, rating, title, message } }, 201);
  } catch (err: any) {
    console.error("[ServerReviews] Database create failed:", err?.message || err);
    if (err?.code === "P2002") return error("You have already submitted a review", 409);
    return error("Failed to submit review: " + (err?.message || "unknown error"), 500);
  }
}

function buildDeliveryCommands(username: string, items: Array<{ productName: string; quantity: number }>): string[] {
  const commands: string[] = [];
  for (const item of items) {
    const slug = item.productName.toLowerCase().replace(/\s+/g, "_");
    commands.push(`lp user ${username} parent add ${slug}`);
    commands.push(`tellraw ${username} {"text":"[HUBMC] You received ${item.quantity}x ${item.productName}!","color":"gold"}`);
  }
  return commands;
}

export async function handleAdminGetDeliveries(request: Request): Promise<Response> {
  const guard = await requireRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (guard) return guard;

  const url = new URL(request.url);
  const deliveryFilter = url.searchParams.get("delivery") ?? "";
  const search = url.searchParams.get("search") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = 20;

  const prisma = await getPrismaClient();
  const where: any = {};
  if (deliveryFilter) where.deliveryStatus = deliveryFilter;
  if (search) {
    where.OR = [
      { minecraftUsername: { contains: search } },
      { email: { contains: search } },
      { id: { contains: search } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: true },
    }),
    prisma.order.count({ where }),
  ]);

  const orderIds = orders.map((o) => o.id);
  const logs = orderIds.length > 0
    ? await prisma.activityLog.findMany({
        where: {
          entityId: { in: orderIds },
          action: { startsWith: "DELIVERY" },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      })
    : [];

  const logsByOrderId: Record<string, typeof logs> = {};
  for (const log of logs) {
    if (!logsByOrderId[log.entityId!]) logsByOrderId[log.entityId!] = [];
    logsByOrderId[log.entityId!].push(log);
  }

  return json({
    deliveries: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      minecraftUsername: o.minecraftUsername,
      minecraftUuid: o.minecraftUuid,
      email: o.email,
      items: (o.items ?? []).map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
      commands: buildDeliveryCommands(o.minecraftUsername, o.items ?? []),
      paymentStatus: o.status,
      deliveryStatus: o.deliveryStatus,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      logs: (logsByOrderId[o.id] ?? []).map((l) => ({
        action: l.action,
        details: l.details,
        severity: l.severity,
        createdAt: l.createdAt.toISOString(),
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function handleAdminResendDelivery(request: Request): Promise<Response> {
  const guard = await requireRole(request, ["SUPER_ADMIN", "EMPLOYEE"]);
  if (guard) return guard;

  try {
    const body = (await request.json()) as { orderId?: string };
    if (!body.orderId) return error("orderId is required", 400);

    const { retryDelivery } = await import("@/lib/commerce/delivery");
    const success = await retryDelivery(body.orderId);

    if (!success) {
      return json({ success: false, message: "Delivery resend initiated — server unavailable or order not found." });
    }

    return json({ success: true, message: "Delivery commands re-sent successfully." });
  } catch (err) {
    console.error("[AdminDelivery] Resend failed:", err);
    return error("Failed to resend delivery.", 500);
  }
}
