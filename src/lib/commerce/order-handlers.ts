import { eq } from "drizzle-orm";
import { getHubMCSession } from "@/lib/auth/session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import { getOrdersForUser, retryDelivery } from "@/lib/commerce/delivery";
import { db } from "@/lib/db";
import { activityLogs, orderItems, orders } from "@/lib/db/schema";
import { toNumber } from "@/lib/db/drizzle-helpers";

export async function handleGetOrders(request: Request): Promise<Response> {
  try {
    const session = await getHubMCSession(request);
    const customerId = session?.user?.customerId;

    if (!customerId) {
      return new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const userOrders = await getOrdersForUser(customerId);

    return new Response(JSON.stringify({ orders: userOrders }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("handleGetOrders error:", error);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function handleRetryDelivery(request: Request): Promise<Response> {
  try {
    const session = await getHubMCSession(request);
    if (!session?.user?.customerId) {
      return new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const body = (await request.json()) as { orderId?: string };
    if (!body.orderId) {
      return new Response(JSON.stringify({ error: "orderId is required." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, body.orderId))
      .limit(1);

    const order = orderRows[0];
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    if (order.customerId !== session.user.customerId) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }

    const success = await retryDelivery(body.orderId);

    if (!success) {
      return new Response(JSON.stringify({ error: "Order not found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Delivery retry initiated." }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    console.error("handleRetryDelivery error:", error);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

async function isStaffSession(request: Request): Promise<boolean> {
  const admin = await getAdminSession(request);
  if (admin) return true;

  const employee = await getEmployeeSession(request);
  if (employee) return true;

  return false;
}

export async function handleRefundOrder(request: Request): Promise<Response> {
  try {
    if (!(await isStaffSession(request))) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Admin or employee session required." }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      );
    }

    const body = (await request.json()) as { orderId: string; reason?: string };
    if (!body.orderId) {
      return new Response(JSON.stringify({ error: "orderId is required." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, body.orderId))
      .limit(1);

    const order = orderRows[0];
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    if (order.status === "REFUNDED") {
      return new Response(JSON.stringify({ error: "Order has already been refunded." }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }

    await db
      .update(orders)
      .set({
        status: "REFUNDED",
        refundedAt: new Date(),
        refundReason: body.reason || "No reason provided",
      })
      .where(eq(orders.id, body.orderId));

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      action: "REFUND",
      entity: "Order",
      entityId: body.orderId,
      details: `Order ${order.orderNumber} refunded. Reason: ${body.reason || "No reason provided"}`,
      severity: "WARN",
      createdAt: new Date(),
    });

    return new Response(
      JSON.stringify({ success: true, message: "Order refunded successfully." }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    console.error("handleRefundOrder error:", error);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function handleGetOrderInvoice(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is required." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    const order = orderRows[0];

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const itemRows = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const customerSession = await getHubMCSession(request);
    const isStaff = await isStaffSession(request);
    const isOwner = customerSession?.user?.customerId && customerSession.user.customerId === order.customerId;

    if (!isStaff && !isOwner) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const html = generateInvoiceHtml({
      orderNumber: order.orderNumber,
      createdAt: new Date(order.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      minecraftUsername: order.minecraftUsername,
      email: order.email,
      country: order.country,
      paymentMethod: order.paymentMethod,
      razorpayPaymentId: order.razorpayPaymentId,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      items: itemRows.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        unitPrice: toNumber(i.unitPrice),
        subtotal: toNumber(i.subtotal),
      })),
      subtotal: toNumber(order.subtotal),
      discountAmount: toNumber(order.discountAmount),
      total: toNumber(order.total),
    });

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": `attachment; filename="invoice-${order.orderNumber}.html"`,
      },
    });
  } catch (error) {
    console.error("handleGetOrderInvoice error:", error);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateInvoiceHtml(data: {
  orderNumber: string;
  createdAt: string;
  minecraftUsername: string;
  email: string;
  country: string;
  paymentMethod: string;
  razorpayPaymentId: string | null;
  status: string;
  deliveryStatus: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }>;
  subtotal: number;
  discountAmount: number;
  total: number;
}): string {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.08);">${escapeHtml(item.name)}</td>
      <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;">${escapeHtml(String(item.quantity))}</td>
      <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;">₹${item.unitPrice.toFixed(2)}</td>
      <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;">₹${item.subtotal.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice - ${escapeHtml(data.orderNumber)}</title></head>
<body style="margin:0;padding:40px;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:700px;margin:0 auto;background:rgba(11,11,11,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:40px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#ff8a2a;font-size:28px;margin:0;">HUBMC</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:4px 0 0;">Payment Invoice</p>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
      <div>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">INVOICE NUMBER</p>
        <p style="color:#fff;font-size:18px;font-weight:700;margin:4px 0;">${escapeHtml(data.orderNumber)}</p>
      </div>
      <div style="text-align:right;">
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">DATE</p>
        <p style="color:#fff;font-size:18px;font-weight:700;margin:4px 0;">${escapeHtml(data.createdAt)}</p>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:24px;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;">
      <div>
        <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 4px;">PLAYER</p>
        <p style="color:#fff;font-size:14px;margin:0;">${escapeHtml(data.minecraftUsername)}</p>
        <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 4px;">EMAIL</p>
        <p style="color:#fff;font-size:14px;margin:0;">${escapeHtml(data.email)}</p>
      </div>
      <div style="text-align:right;">
        <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 4px;">PAYMENT</p>
        <p style="color:#fff;font-size:14px;margin:0;">${escapeHtml(data.paymentMethod)}</p>
        <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 4px;">PAYMENT ID</p>
        <p style="color:#fff;font-size:12px;margin:0;">${escapeHtml(data.razorpayPaymentId || "—")}</p>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:rgba(255,138,42,0.1);">
          <th style="padding:12px;text-align:left;color:#ff8a2a;font-size:12px;">Item</th>
          <th style="padding:12px;text-align:center;color:#ff8a2a;font-size:12px;">Qty</th>
          <th style="padding:12px;text-align:right;color:#ff8a2a;font-size:12px;">Unit Price</th>
          <th style="padding:12px;text-align:right;color:#ff8a2a;font-size:12px;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;text-align:right;">
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:4px 0;">Subtotal: <span style="color:#fff;">₹${data.subtotal.toFixed(2)}</span></p>
      ${data.discountAmount > 0 ? `<p style="color:rgba(255,255,255,0.5);font-size:14px;margin:4px 0;">Discount: <span style="color:#22c55e;">−₹${data.discountAmount.toFixed(2)}</span></p>` : ""}
      <p style="color:#ff8a2a;font-size:24px;font-weight:700;margin:8px 0 0;">₹${data.total.toFixed(2)}</p>
    </div>
    <div style="margin-top:24px;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;text-align:center;">
      <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">Status: <span style="color:${data.status === "REFUNDED" ? "#ef4444" : "#22c55e"};font-weight:600;">${escapeHtml(data.status)}</span> &middot; Delivery: <span style="color:${data.deliveryStatus === "DELIVERED" ? "#22c55e" : data.deliveryStatus === "FAILED" ? "#ef4444" : "#ff8a2a"};font-weight:600;">${escapeHtml(data.deliveryStatus)}</span></p>
    </div>
  </div>
</body>
</html>`;
}