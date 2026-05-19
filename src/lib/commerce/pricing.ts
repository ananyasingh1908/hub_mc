import type { CartItem, CartLine, Coupon, OrderSummary, Product } from "@/lib/commerce/types";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
}

export function buildCartLines(items: CartItem[], products: Product[]): CartLine[] {
  return items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return {
        product,
        quantity: item.quantity,
        subtotal: product.price * item.quantity,
      };
    })
    .filter((line): line is CartLine => line !== null);
}

export function calculateOrderSummary(items: CartItem[], coupon: Coupon | null, products: Product[]): OrderSummary {
  const lines = buildCartLines(items, products);
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const discountAmount = coupon
    ? Number(((subtotal * coupon.percentageOff) / 100).toFixed(2))
    : 0;
  const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  return {
    itemCount,
    subtotal,
    discountAmount,
    total,
  };
}
