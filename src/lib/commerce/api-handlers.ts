import { getPrismaClient } from "@/lib/db/prisma";

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

export const commerceApiHandlers: Record<string, Partial<Record<string, RouteHandler>>> = {
  "/api/products": {
    GET: async () => {
      const prisma = await getPrismaClient();
      const products = await prisma.product.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
      });
      return json({
        products: products.map((p) => {
          const meta = p.metadata as Record<string, any> | null;
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description,
            price: Number(p.price),
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
      if (!body.code) return error("Coupon code is required.", 400);

      const prisma = await getPrismaClient();
      const coupon = await prisma.coupon.findUnique({ where: { code: body.code.toUpperCase().trim() } });
      if (!coupon || !coupon.active) return error("Invalid coupon.", 404);

      return json({
        coupon: {
          code: coupon.code,
          percentageOff: coupon.percentageOff,
          amountOff: coupon.amountOff ? Number(coupon.amountOff) : null,
          description: coupon.description,
        },
      });
    },
  },
};