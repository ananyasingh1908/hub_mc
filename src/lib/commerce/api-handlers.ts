import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coupons, products } from "@/lib/db/schema";
import { toNumber } from "@/lib/db/drizzle-helpers";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: jsonHeaders,
    ...init,
  });
}

function error(msg: string, status: number) {
  return json({ error: msg }, { status });
}

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

type RouteHandler = (request: Request) => Promise<Response> | Response;

export const commerceApiHandlers: Record<
  string,
  Partial<Record<string, RouteHandler>>
> = {
  "/api/products": {
    GET: async () => {
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.active, true))
        .orderBy(desc(products.createdAt));

      return json({
        products: productRows.map((p) => {
          const meta = (p.metadata as Record<string, any> | null) ?? null;

          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description,
            price: toNumber(p.price),
            image: p.imageUrl,
            imageUrl: p.imageUrl,
            category: p.category,
            accent: meta?.accent ?? "blue",
            badge: meta?.badge ?? "",
            rewards: meta?.rewards ?? [],
          };
        }),
      });
    },
  },

  "/api/coupon": {
    POST: async (request) => {
      const body = await readJson<{ code?: string }>(request);

      if (!body.code) {
        return error("Coupon code is required.", 400);
      }

      const normalizedCode = body.code.toUpperCase().trim();

      const couponRows = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, normalizedCode))
        .limit(1);

      const coupon = couponRows[0];

      if (!coupon || !coupon.active) {
        return error("Invalid coupon.", 404);
      }

      return json({
        coupon: {
          code: coupon.code,
          percentageOff: coupon.percentageOff,
          amountOff: coupon.amountOff ? toNumber(coupon.amountOff) : null,
          description: coupon.description,
        },
      });
    },
  },
};