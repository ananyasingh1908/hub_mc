import { devlog } from "@/lib/dev-log";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getHubMCSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  products,
  serverReviews,
  activityLogs,
  orders,
  orderItems,
  supportTickets,
  ticketReplies,
  customers,
  employees,
  users,
  rolePermissions,
  tournaments,
  playerBans,
  playerNotes,
  playerRanks,
} from "@/lib/db/schema";
import {
  count,
  eq,
  and,
  or,
  like,
  desc,
  inArray,
  sql,
} from "drizzle-orm";

async function logActivity(
  employeeId: string | null | undefined,
  action: string,
  entity: string,
  entityId: string | null,
  details?: string,
) {
  try {
    const id = crypto.randomUUID();
    await db.insert(activityLogs).values({
      id,
      employeeId: employeeId || null,
      action,
      entity,
      entityId: entityId || null,
      details: details || null,
      severity: "INFO",
      ipAddress: null,
      createdAt: new Date(),
    });
  } catch (e) {
    devlog("activity-log-error", e);
  }
}

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

// ─── PRODUCTS ────────────────────────────────────────────────

export async function handleAdminGetProducts(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const [productRows, totalRows] = await Promise.all([
    db.select().from(products).orderBy(desc(products.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(products),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);

  return json({
    products: productRows.map((p) => {
      const meta = p.metadata as Record<string, any> | null;
      return { ...p, price: Number(p.price), badge: meta?.badge ?? "" };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
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
  const category = typeof body.category === "string" ? body.category.trim() : "Ranks";
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
    const productId = crypto.randomUUID();
    const now = new Date();
    await db.insert(products).values({
      id: productId,
      slug,
      name,
      description,
      imageUrl,
      category,
      price: String(price),
      metadata: body.rewards ? { rewards: body.rewards, badge: body.badge ?? "" } : {},
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    devlog("[AdminProducts] Product created successfully — id:", productId, "slug:", slug);

    const createdRows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    const product = createdRows[0];

    await logActivity(staff?.employeeId, "CREATE", "product", productId, `Created product ${name}`);
    return json({ product: { ...product!, price: Number(product!.price) } }, 201);
  } catch (err: any) {
    console.error("[AdminProducts] Database create failed:", err?.message || err);
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

  const { id, slug, name, description, imageUrl, category, price, active, badge } = body;
  if (!id) return error("id required", 400);
  devlog("[AdminProducts] Updating product:", id);

  const data: Record<string, unknown> = {};
  if (slug !== undefined) data.slug = slug;
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (category !== undefined) data.category = category;
  if (price !== undefined) {
    const p = Number(price);
    if (isNaN(p) || p <= 0) return error("Invalid price", 400);
    data.price = p;
  }
  if (active !== undefined) data.active = active;
  if (badge !== undefined) {
    const existingRows = await db.select({ metadata: products.metadata }).from(products).where(eq(products.id, String(id))).limit(1);
    const existingMeta = (existingRows[0]?.metadata as Record<string, unknown> | null) ?? {};
    data.metadata = { ...existingMeta, badge };
  }

  try {
    await db.update(products).set(data as Partial<typeof products.$inferInsert>).where(eq(products.id, String(id)));
    const updatedRows = await db.select().from(products).where(eq(products.id, String(id))).limit(1);
    const product = updatedRows[0];
    if (!product) return error("Product not found", 404);
    devlog("[AdminProducts] Product updated:", product.id);
    await logActivity(staff?.employeeId, "UPDATE", "product", String(id), `Updated product ${name ?? id}`);
    return json({ product: { ...product, price: Number(product.price) } });
  } catch (err: any) {
    console.error("[AdminProducts] Database update failed:", err?.message || err);
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
    const existingRows = await db.select({ id: products.id }).from(products).where(eq(products.id, String(id))).limit(1);
    if (!existingRows[0]) return error("Product not found", 404);
    await db.delete(products).where(eq(products.id, String(id)));
    devlog("[AdminProducts] Product deleted:", id);
    await logActivity(staff?.employeeId, "DELETE", "product", String(id), `Deleted product ${id}`);
    return json({ success: true });
  } catch (err: any) {
    console.error("[AdminProducts] Database delete failed:", err?.message || err);
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
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(orders.minecraftUsername, `%${search}%`),
        like(orders.email, `%${search}%`),
        like(orders.id, `%${search}%`),
        like(orders.razorpayPaymentId, `%${search}%`),
      )!,
    );
  }
  if (status) conditions.push(eq(orders.status, status as any));
  if (delivery) conditions.push(eq(orders.deliveryStatus, delivery as any));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [orderRows, totalRows] = await Promise.all([
    db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(orders).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);

  const orderIds = orderRows.map((o) => o.id);
  const itemRows = orderIds.length > 0
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : [];

  const itemsByOrderId = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const list = itemsByOrderId.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrderId.set(item.orderId, list);
  }

  return json({
    orders: orderRows.map((o) => ({
      id: o.id,
      minecraftUsername: o.minecraftUsername,
      minecraftUuid: o.minecraftUuid,
      email: o.email,
      country: o.country,
      status: o.status,
      paymentMethod: o.paymentMethod,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      total: Number(o.total),
      razorpayPaymentId: o.razorpayPaymentId,
      deliveryStatus: o.deliveryStatus,
      deliveredAt: o.deliveredAt,
      createdAt: o.createdAt,
      items: (itemsByOrderId.get(o.id) ?? []).map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
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

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (deliveryStatus) {
    data.deliveryStatus = deliveryStatus;
    if (deliveryStatus === "DELIVERED") data.deliveredAt = new Date();
  }
  await db.update(orders).set(data as any).where(eq(orders.id, id));
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

  const conditions = [];
  if (status) conditions.push(eq(supportTickets.status, status as any));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const ticketRows = await db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      message: supportTickets.message,
      status: supportTickets.status,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      customerId: supportTickets.customerId,
      minecraftUsername: customers.minecraftUsername,
      minecraftUuid: customers.minecraftUuid,
    })
    .from(supportTickets)
    .leftJoin(customers, eq(supportTickets.customerId, customers.id))
    .where(whereClause)
    .orderBy(desc(supportTickets.createdAt));

  const ticketIds = ticketRows.map((t) => t.id);
  const replyRows = ticketIds.length > 0
    ? await db.select().from(ticketReplies).where(inArray(ticketReplies.ticketId, ticketIds)).orderBy(ticketReplies.createdAt)
    : [];

  const repliesByTicketId = new Map<string, typeof replyRows>();
  for (const r of replyRows) {
    const list = repliesByTicketId.get(r.ticketId) ?? [];
    list.push(r);
    repliesByTicketId.set(r.ticketId, list);
  }

  return json({
    tickets: ticketRows.map((t) => ({
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      minecraftUsername: t.minecraftUsername ?? "Unknown",
      minecraftUuid: t.minecraftUuid ?? null,
      replies: (repliesByTicketId.get(t.id) ?? []).map((r) => ({
        id: r.id,
        authorName: r.authorName,
        message: r.message,
        createdAt: r.createdAt,
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

  await db.insert(ticketReplies).values({
    id: crypto.randomUUID(),
    ticketId,
    employeeId: staff?.employeeId ?? null,
    authorName: staff?.email ?? "Staff",
    message,
    createdAt: new Date(),
  });

  await db.update(supportTickets).set({ status: "IN_PROGRESS" }).where(eq(supportTickets.id, ticketId));

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

  await db.update(supportTickets).set({ status: status as any }).where(eq(supportTickets.id, ticketId));
  await logActivity(staff?.employeeId, "RESOLVE", "ticket", ticketId, `Ticket ${ticketId} -> ${status}`);
  return json({ success: true });
}

// ─── CUSTOMERS (Admin only) ──────────────────────────────────

export async function handleAdminGetCustomers(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // Subquery: customer IDs that have at least one PAID or FULFILLED order
  const buyerIdsSubquery = db
    .select({ customerId: orders.customerId })
    .from(orders)
    .where(and(
      sql`${orders.customerId} IS NOT NULL`,
      sql`${orders.status} IN ('PAID', 'FULFILLED')`,
    ))
    .groupBy(orders.customerId);

  const buyerCustomerIdRows = await buyerIdsSubquery;
  const buyerCustomerIds = buyerCustomerIdRows
    .map((r) => r.customerId)
    .filter((id): id is string => id !== null);

  if (buyerCustomerIds.length === 0) {
    return json({
      customers: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  const [customerRows, totalRows] = await Promise.all([
    db
      .select({
        id: customers.id,
        minecraftUsername: customers.minecraftUsername,
        minecraftUuid: customers.minecraftUuid,
        avatarUrl: customers.avatarUrl,
        country: customers.country,
        lastLoginAt: customers.lastLoginAt,
        createdAt: customers.createdAt,
        email: users.email,
      })
      .from(customers)
      .leftJoin(users, eq(customers.userId, users.id))
      .where(inArray(customers.id, buyerCustomerIds))
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() })
      .from(customers)
      .where(inArray(customers.id, buyerCustomerIds)),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const customerIds = customerRows.map((c) => c.id);

  const orderRows = customerIds.length > 0
    ? await db.select({ customerId: orders.customerId, id: orders.id, total: orders.total, status: orders.status, createdAt: orders.createdAt })
        .from(orders)
        .where(inArray(orders.customerId, customerIds))
    : [];

  const ordersByCustomer = new Map<string, typeof orderRows>();
  for (const o of orderRows) {
    if (!o.customerId) continue;
    const list = ordersByCustomer.get(o.customerId) ?? [];
    list.push(o);
    ordersByCustomer.set(o.customerId, list);
  }

  return json({
    customers: customerRows.map((c) => {
      const custOrders = ordersByCustomer.get(c.id) ?? [];
      return {
        id: c.id,
        minecraftUsername: c.minecraftUsername,
        minecraftUuid: c.minecraftUuid,
        avatarUrl: c.avatarUrl,
        country: c.country,
        lastLoginAt: c.lastLoginAt,
        createdAt: c.createdAt,
        email: c.email ?? "",
        totalSpent: custOrders.reduce((sum, o) =>
          o.status === "PAID" || o.status === "FULFILLED" ? sum + Number(o.total) : sum, 0),
        purchaseCount: custOrders.filter((o) =>
          o.status === "PAID" || o.status === "FULFILLED").length,
        orders: custOrders,
      };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ─── CUSTOMER DELETE/ARCHIVE (Admin only) ────────────────────

export async function handleAdminDeleteCustomer(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;

  let body: any;
  try { body = await request.json(); } catch { return error("Invalid request body", 400); }

  const { customerId } = body;
  if (!customerId) return error("Missing customerId", 400);

  // Fetch customer
  const customerRows = await db
    .select({ id: customers.id, userId: customers.userId })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customerRows[0]) return error("Customer not found", 404);

  const customer = customerRows[0];

  // Check for orders
  const orderCountRows = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.customerId, customerId));

  const orderCount = Number(orderCountRows[0]?.count ?? 0);

  if (orderCount > 0) {
    // Customer has orders — cannot delete, block with clear message
    return json({ ok: false, action: "blocked", message: `Cannot delete customer with ${orderCount} order(s). Order history must be preserved.` }, 400);
  }

  // No orders — safe to hard delete
  // Delete related data first (non-cascade schema)
  await db.delete(playerBans).where(eq(playerBans.customerId, customerId));
  await db.delete(playerNotes).where(eq(playerNotes.customerId, customerId));
  await db.delete(playerRanks).where(eq(playerRanks.customerId, customerId));

  // Delete the customer record
  await db.delete(customers).where(eq(customers.id, customerId));

  // Delete the linked user account
  if (customer.userId) {
    await db.delete(users).where(eq(users.id, customer.userId));
  }

  await logActivity(null, "DELETE", "customer", customerId, "Deleted orphan customer (no orders)");
  return json({ ok: true, action: "deleted", message: "Customer record deleted (no order history)" });
}

// ─── EMPLOYEES (Admin only) ──────────────────────────────────

export async function handleAdminGetEmployees(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;

  const employeeRows = await db
    .select({
      id: employees.id,
      displayName: employees.displayName,
      department: employees.department,
      isActive: employees.isActive,
      disabledAt: employees.disabledAt,
      createdAt: employees.createdAt,
      userId: employees.userId,
      email: users.email,
      minecraftUsername: users.name,
      avatarUrl: users.image,
      role: users.role,
    })
    .from(employees)
    .leftJoin(users, eq(employees.userId, users.id))
    .orderBy(desc(employees.createdAt));

  const employeeIds = employeeRows.map((e) => e.id);

  const [permRows, ticketCountRows] = await Promise.all([
    employeeIds.length > 0
      ? db.select().from(rolePermissions).where(inArray(rolePermissions.employeeId, employeeIds))
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

  return json({
    employees: employeeRows.map((e) => ({
      id: e.id,
      displayName: e.displayName,
      department: e.department,
      isActive: e.isActive,
      disabledAt: e.disabledAt,
      createdAt: e.createdAt,
      email: e.email ?? "",
      minecraftUsername: e.minecraftUsername ?? "",
      avatarUrl: e.avatarUrl ?? "",
      role: e.role ?? "EMPLOYEE",
      userId: e.userId,
      ticketCount: ticketCountMap.get(e.id) ?? 0,
      permissions: permMap.get(e.id) ?? null,
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

  const now = new Date();
  const userId = crypto.randomUUID();
  const employeeId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    email,
    name: minecraftUsername ?? displayName,
    role: role ?? "EMPLOYEE",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(employees).values({
    id: employeeId,
    userId,
    displayName,
    department: department ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(rolePermissions).values({
    id: crypto.randomUUID(),
    employeeId,
    products: true,
    orders: true,
    support: true,
    customers: false,
    employees: false,
    logs: false,
    settings: false,
    tournaments: true,
    notifications: true,
    playerManage: true,
    employeeMonitor: false,
    platformLogs: true,
    createdAt: now,
    updatedAt: now,
  });

  await logActivity(staff?.employeeId, "CREATE", "employee", employeeId,
    `Created employee ${displayName}`);
  return json({ employee: { id: employeeId, displayName, department, isActive: true } }, 201);
}

export async function handleAdminUpdateEmployee(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;
  const staff = getStaffSession(request);

  const body = await request.json();
  const { id, displayName, department, isActive, role } = body;
  if (!id) return error("id required", 400);

  const empData: Record<string, unknown> = { updatedAt: new Date() };
  if (displayName !== undefined) empData.displayName = displayName;
  if (department !== undefined) empData.department = department;
  if (isActive !== undefined) {
    empData.isActive = isActive;
    if (!isActive) empData.disabledAt = new Date();
    else empData.disabledAt = null;
  }
  await db.update(employees).set(empData as any).where(eq(employees.id, id));

  if (role !== undefined) {
    const empRows = await db.select({ userId: employees.userId }).from(employees).where(eq(employees.id, id)).limit(1);
    if (empRows[0]) {
      await db.update(users).set({ role }).where(eq(users.id, empRows[0].userId));
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

  await db.delete(employees).where(eq(employees.id, id));
  await logActivity(staff?.employeeId, "DELETE", "employee", id, `Deleted employee ${id}`);
  return json({ success: true });
}



// ─── PERMISSIONS (Admin only) ────────────────────────────────

export async function handleAdminGetPermissions(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");
  if (!employeeId) return error("employeeId required", 400);

  const permRows = await db.select().from(rolePermissions).where(eq(rolePermissions.employeeId, employeeId)).limit(1);
  return json({ permissions: permRows[0] ?? null });
}

export async function handleAdminUpdatePermissions(request: Request) {
  const authErr = await requireRole(request, ["SUPER_ADMIN"]);
  if (authErr) return authErr;
  const staff = getStaffSession(request);

  const body = await request.json();
  const { employeeId, products: prodPerms, orders: orderPerms, support, customers: custPerms, employees: empPerms, logs: logPerms, settings } = body;
  if (!employeeId) return error("employeeId required", 400);

  const existingRows = await db.select().from(rolePermissions).where(eq(rolePermissions.employeeId, employeeId)).limit(1);
  const now = new Date();

  if (existingRows[0]) {
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (prodPerms !== undefined) updateData.products = prodPerms;
    if (orderPerms !== undefined) updateData.orders = orderPerms;
    if (support !== undefined) updateData.support = support;
    if (custPerms !== undefined) updateData.customers = custPerms;
    if (empPerms !== undefined) updateData.employees = empPerms;
    if (logPerms !== undefined) updateData.logs = logPerms;
    if (settings !== undefined) updateData.settings = settings;
    await db.update(rolePermissions).set(updateData as any).where(eq(rolePermissions.employeeId, employeeId));
  } else {
    await db.insert(rolePermissions).values({
      id: crypto.randomUUID(),
      employeeId,
      products: prodPerms ?? true,
      orders: orderPerms ?? true,
      support: support ?? true,
      customers: custPerms ?? false,
      employees: empPerms ?? false,
      logs: logPerms ?? false,
      settings: settings ?? false,
      tournaments: true,
      notifications: true,
      playerManage: true,
      employeeMonitor: false,
      platformLogs: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  const updatedRows = await db.select().from(rolePermissions).where(eq(rolePermissions.employeeId, employeeId)).limit(1);

  await logActivity(staff?.employeeId, "UPDATE", "permissions", employeeId,
    `Updated permissions for employee ${employeeId}`);
  return json({ permissions: updatedRows[0] ?? null });
}

// ─── DASHBOARD STATS ─────────────────────────────────────────

export async function handleAdminDashboardStats(request: Request) {
  const authErr = await requireRole(request, ["EMPLOYEE", "SUPER_ADMIN"]);
  if (authErr) return authErr;

  const [totalOrders, pendingOrders, paidOrders, totalCustomers, openTickets, totalProducts, revenueRows] =
    await Promise.all([
      db.select({ count: count() }).from(orders),
      db.select({ count: count() }).from(orders).where(eq(orders.status, "PENDING")),
      db.select({ count: count() }).from(orders).where(eq(orders.status, "PAID")),
      db.select({ count: count() }).from(customers),
      db.select({ count: count() }).from(supportTickets).where(inArray(supportTickets.status, ["OPEN", "IN_PROGRESS"])),
      db.select({ count: count() }).from(products),
      db.select({ total: sql<string | null>`cast(sum(${orders.total}) as char)` })
        .from(orders)
        .where(inArray(orders.status, ["PAID", "FULFILLED"])),
    ]);

  return json({
    stats: {
      totalOrders: Number(totalOrders[0]?.count ?? 0),
      pendingOrders: Number(pendingOrders[0]?.count ?? 0),
      paidOrders: Number(paidOrders[0]?.count ?? 0),
      totalCustomers: Number(totalCustomers[0]?.count ?? 0),
      openTickets: Number(openTickets[0]?.count ?? 0),
      totalProducts: Number(totalProducts[0]?.count ?? 0),
      totalRevenue: Number(revenueRows[0]?.total ?? 0),
    },
  });
}

// ─── SERVER REVIEWS ──────────────────────────────────────────

export async function handleGetServerReviews() {
  try {
    const reviewRows = await db
      .select({
        id: serverReviews.id,
        minecraftUsername: serverReviews.minecraftUsername,
        avatarUrl: customers.avatarUrl,
        rating: serverReviews.rating,
        title: serverReviews.title,
        message: serverReviews.message,
        createdAt: serverReviews.createdAt,
      })
      .from(serverReviews)
      .leftJoin(customers, eq(serverReviews.customerId, customers.id))
      .orderBy(desc(serverReviews.createdAt))
      .limit(50);

    const allRatings = await db.select({ rating: serverReviews.rating }).from(serverReviews);
    const totalReviews = allRatings.length;
    const overallRating = totalReviews > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const starBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allRatings.forEach((r) => { starBreakdown[r.rating as keyof typeof starBreakdown]++; });

    return json({
      reviews: reviewRows.map((r) => ({
        id: r.id,
        minecraftUsername: r.minecraftUsername,
        avatarUrl: r.avatarUrl ?? null,
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
  if (!session?.user?.customerId) return json({ error: "Unauthorized — login required" }, 401);

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
    const customerId = session.user.customerId;

    const existingRows = customerId
      ? await db.select().from(serverReviews).where(eq(serverReviews.customerId, customerId)).limit(1)
      : [];
    const existing = existingRows[0] ?? null;
    if (existing) { devlog("[ServerReviews] Duplicate review from customer", customerId); return error("You have already submitted a review", 409); }

    const reviewId = crypto.randomUUID();
    const now = new Date();
    await db.insert(serverReviews).values({
      id: reviewId,
      userId: null,
      customerId: customerId,
      minecraftUsername: session.user.fullName || session.user.phoneNumber || "",
      rating,
      title,
      message,
      createdAt: now,
      updatedAt: now,
    });
    devlog("[ServerReviews] Review created:", reviewId);
    return json({ review: { id: reviewId, rating, title, message } }, 201);
  } catch (err: any) {
    console.error("[ServerReviews] Database create failed:", err?.message || err);
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
  const offset = (page - 1) * limit;

  const conditions = [];
  if (deliveryFilter) conditions.push(eq(orders.deliveryStatus, deliveryFilter as any));
  if (search) {
    conditions.push(
      or(
        like(orders.minecraftUsername, `%${search}%`),
        like(orders.email, `%${search}%`),
        like(orders.id, `%${search}%`),
      )!,
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [orderRows, totalRows] = await Promise.all([
    db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(orders).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const orderIds = orderRows.map((o) => o.id);

  const [itemRows, logRows] = await Promise.all([
    orderIds.length > 0
      ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : [] as typeof orderItems.$inferSelect[],
    orderIds.length > 0
      ? db
          .select()
          .from(activityLogs)
          .where(and(inArray(activityLogs.entityId, orderIds), like(activityLogs.action, "DELIVERY%")))
          .orderBy(desc(activityLogs.createdAt))
          .limit(500)
      : [] as typeof activityLogs.$inferSelect[],
  ]);

  const itemsByOrderId = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const list = itemsByOrderId.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrderId.set(item.orderId, list);
  }

  const logsByOrderId: Record<string, typeof logRows> = {};
  for (const log of logRows) {
    if (!log.entityId) continue;
    if (!logsByOrderId[log.entityId]) logsByOrderId[log.entityId] = [];
    logsByOrderId[log.entityId].push(log);
  }

  return json({
    deliveries: orderRows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      minecraftUsername: o.minecraftUsername,
      minecraftUuid: o.minecraftUuid,
      email: o.email,
      items: (itemsByOrderId.get(o.id) ?? []).map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
      commands: buildDeliveryCommands(o.minecraftUsername, itemsByOrderId.get(o.id) ?? []),
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
