import { getHubMCSession } from "@/lib/auth/session";
import {
  createRazorpayOrder,
  createOrderInDatabase,
  getRazorpayKeyId,
  getPendingOrder,
  removePendingOrder,
  roundAmountToPaise,
  storePendingOrder,
  verifyPaymentSignature,
  checkDuplicatePayment,
  generateOrderNumber,
} from "@/lib/payment/razorpay";
import { buildCartLines, calculateOrderSummary } from "@/lib/commerce/pricing";
import { getPrismaClient } from "@/lib/db/prisma";
import { triggerDelivery } from "@/lib/commerce/delivery";
import type { PaymentMethod, CartItem } from "@/lib/commerce/types";

function mapPaymentMethod(method: string): string {
  const mapping: Record<string, string> = {
    card: "CARD",
    upi: "UPI",
    netbanking: "NETBANKING",
    wallet: "WALLET",
  };
  return mapping[method] || "CARD";
}

export async function handleCreateOrder(request: Request): Promise<Response> {
  try {
    const session = await getHubMCSession(request);
    if (!session?.user?.minecraftUsername) {
      return new Response(
        JSON.stringify({ error: "Minecraft login required to purchase." }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }

    const body = (await request.json()) as {
      minecraftUsername: string;
      minecraftUuid: string;
      email: string;
      country: string;
      paymentMethod: PaymentMethod;
      couponCode?: string | null;
      items: CartItem[];
    };

    if (
      !body.minecraftUsername ||
      !body.minecraftUuid ||
      !body.email ||
      !body.country ||
      !body.paymentMethod ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid checkout payload." }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const prisma = await getPrismaClient();
    const dbProducts = await prisma.product.findMany({ where: { active: true } });
    const products = dbProducts.map((p) => {
      const meta = p.metadata as Record<string, any> | null;
      return {
        id: p.id, slug: p.slug, name: p.name,
        description: p.description, price: Number(p.price),
        image: p.imageUrl, imageUrl: p.imageUrl,
        accent: meta?.accent ?? "blue", badge: meta?.badge ?? "", rewards: meta?.rewards ?? [],
      };
    });

    let coupon: { code: string; percentageOff: number } | null = null;
    if (body.couponCode) {
      const dbCoupon = await prisma.coupon.findUnique({ where: { code: body.couponCode.toUpperCase().trim() } });
      if (dbCoupon && dbCoupon.active && dbCoupon.percentageOff) {
        coupon = { code: dbCoupon.code, percentageOff: dbCoupon.percentageOff };
      }
    }

    const pricingCoupon = coupon ? { code: coupon.code, percentageOff: coupon.percentageOff, description: "" } : null;
    const lines = buildCartLines(body.items, products);
    if (lines.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid products in cart." }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const summary = calculateOrderSummary(body.items, pricingCoupon, products);
    const amountInPaise = roundAmountToPaise(summary.total);
    const receipt = `receipt_${Date.now()}_${body.minecraftUsername}`;

    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder(amountInPaise, "INR", receipt, {
        minecraftUsername: body.minecraftUsername,
        minecraftUuid: body.minecraftUuid,
      });
    } catch (razorpayError) {
      console.error("Razorpay order creation failed:", razorpayError);
      return new Response(
        JSON.stringify({ error: "Payment gateway error. Please try again." }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }

    await storePendingOrder(razorpayOrder.id, {
      minecraftUsername: body.minecraftUsername,
      minecraftUuid: body.minecraftUuid,
      email: body.email,
      country: body.country,
      paymentMethod: body.paymentMethod,
      lines,
      coupon,
      subtotal: summary.subtotal,
      discountAmount: summary.discountAmount,
      total: summary.total,
      customerId: session.user.customerId ?? null,
      receipt,
    });

    return new Response(
      JSON.stringify({
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: getRazorpayKeyId(),
        amount: amountInPaise,
        currency: "INR",
        receipt,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    console.error("handleCreateOrder error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}

export async function handleVerifyPayment(request: Request): Promise<Response> {
  try {
    const session = await getHubMCSession(request);
    const body = (await request.json()) as {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    };

    if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      return new Response(
        JSON.stringify({ error: "Missing payment verification fields." }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const isValid = verifyPaymentSignature(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Payment signature verification failed." }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const isDuplicate = await checkDuplicatePayment(body.razorpayPaymentId);
    if (isDuplicate) {
      return new Response(
        JSON.stringify({ error: "This payment has already been processed." }),
        { status: 409, headers: { "content-type": "application/json" } },
      );
    }

    const pendingData = await getPendingOrder(body.razorpayOrderId);

    if (!pendingData) {
      return new Response(
        JSON.stringify({ error: "Pending order not found. It may have expired." }),
        { status: 404, headers: { "content-type": "application/json" } },
      );
    }

    const orderNumber = await generateOrderNumber();

    const orderResult = await createOrderInDatabase({
      orderNumber,
      minecraftUsername: pendingData.minecraftUsername,
      minecraftUuid: pendingData.minecraftUuid,
      email: pendingData.email,
      country: pendingData.country,
      paymentMethod: mapPaymentMethod(pendingData.paymentMethod),
      subtotal: pendingData.subtotal,
      discountAmount: pendingData.discountAmount,
      total: pendingData.total,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
      receipt: pendingData.receipt,
      items: pendingData.lines.map((line: any) => ({
        productId: line.product.id,
        productName: line.product.name,
        quantity: line.quantity,
        unitPrice: line.product.price,
        subtotal: line.subtotal,
      })),
      couponCode: pendingData.coupon?.code ?? null,
      couponPercentageOff: pendingData.coupon?.percentageOff ?? null,
      customerId: pendingData.customerId,
    });

    await removePendingOrder(body.razorpayOrderId);

    triggerDelivery(orderResult.id, {
      minecraftUsername: pendingData.minecraftUsername,
      minecraftUuid: pendingData.minecraftUuid,
      items: pendingData.lines.map((line: any) => ({
        productId: line.product.id,
        productName: line.product.name,
        quantity: line.quantity,
      })),
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderResult.id,
        orderNumber,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    console.error("handleVerifyPayment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
