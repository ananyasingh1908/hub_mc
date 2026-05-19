import Razorpay from "razorpay";
import crypto from "crypto";
import { getPrismaClient } from "@/lib/db/prisma";

function requireRazorpayKeys(): { key_id: string; key_secret: string } {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment");
  }
  return { key_id, key_secret };
}

export function getRazorpayInstance(): Razorpay {
  const { key_id, key_secret } = requireRazorpayKeys();
  return new Razorpay({ key_id, key_secret });
}

export function getRazorpayKeyId(): string {
  return requireRazorpayKeys().key_id;
}

export async function storePendingOrder(
  razorpayOrderId: string,
  data: {
    minecraftUsername: string;
    minecraftUuid: string;
    email: string;
    country: string;
    paymentMethod: string;
    lines: Array<{ product: { id: string; name: string; price: number }; quantity: number; subtotal: number }>;
    coupon: { code: string; percentageOff: number } | null;
    subtotal: number;
    discountAmount: number;
    total: number;
    customerId: string | null;
    receipt: string;
  },
): Promise<void> {
  const prisma = await getPrismaClient();
  await prisma.pendingOrder.create({
    data: {
      razorpayOrderId,
      minecraftUsername: data.minecraftUsername,
      minecraftUuid: data.minecraftUuid,
      email: data.email,
      country: data.country,
      paymentMethod: data.paymentMethod,
      lines: data.lines,
      coupon: data.coupon,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      total: data.total,
      customerId: data.customerId,
      receipt: data.receipt,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
}

export async function getPendingOrder(razorpayOrderId: string): Promise<{
  minecraftUsername: string;
  minecraftUuid: string;
  email: string;
  country: string;
  paymentMethod: string;
  lines: Array<{ product: { id: string; name: string; price: number }; quantity: number; subtotal: number }>;
  coupon: { code: string; percentageOff: number } | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  customerId: string | null;
  receipt: string;
} | null> {
  const prisma = await getPrismaClient();
  const pending = await prisma.pendingOrder.findUnique({
    where: { razorpayOrderId },
  });
  if (!pending) return null;
  return {
    minecraftUsername: pending.minecraftUsername,
    minecraftUuid: pending.minecraftUuid,
    email: pending.email,
    country: pending.country,
    paymentMethod: pending.paymentMethod,
    lines: pending.lines as any,
    coupon: pending.coupon as any,
    subtotal: Number(pending.subtotal),
    discountAmount: Number(pending.discountAmount),
    total: Number(pending.total),
    customerId: pending.customerId,
    receipt: pending.receipt,
  };
}

export async function removePendingOrder(razorpayOrderId: string): Promise<void> {
  const prisma = await getPrismaClient();
  await prisma.pendingOrder.deleteMany({ where: { razorpayOrderId } });
}

export async function cleanupExpiredPendingOrders(): Promise<void> {
  const prisma = await getPrismaClient();
  await prisma.pendingOrder.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function createRazorpayOrder(
  amount: number,
  currency: string,
  receipt: string,
  notes: Record<string, string>,
) {
  const razorpay = getRazorpayInstance();
  return razorpay.orders.create({
    amount: Math.round(amount),
    currency,
    receipt,
    notes,
  });
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const body = `${orderId}|${paymentId}`;
  const { key_secret } = requireRazorpayKeys();
  const expectedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

export async function checkDuplicatePayment(razorpayPaymentId: string): Promise<boolean> {
  const prisma = await getPrismaClient();
  const existing = await prisma.order.findUnique({
    where: { razorpayPaymentId },
  });
  return existing !== null;
}

export async function generateOrderNumber(): Promise<string> {
  const prisma = await getPrismaClient();
  const count = await prisma.order.count();
  const seq = (count + 1).toString().padStart(5, "0");
  return `HUBMC-${seq}`;
}

export async function createOrderInDatabase(data: {
  orderNumber: string;
  minecraftUsername: string;
  minecraftUuid: string;
  email: string;
  country: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  receipt: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }>;
  couponCode: string | null;
  couponPercentageOff: number | null;
  customerId: string | null;
}): Promise<{ id: string }> {
  const prisma = await getPrismaClient();
  const order = await prisma.order.create({
    data: {
      orderNumber: data.orderNumber,
      minecraftUsername: data.minecraftUsername,
      minecraftUuid: data.minecraftUuid,
      email: data.email,
      country: data.country,
      status: "PAID",
      paymentMethod: data.paymentMethod.toUpperCase() as any,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      total: data.total,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
      receipt: data.receipt,
      paymentVerifiedAt: new Date(),
      deliveryStatus: "PENDING",
      customerId: data.customerId,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      },
    },
  });
  return { id: order.id };
}

export function roundAmountToPaise(amount: number): number {
  return Math.round(amount * 100);
}
