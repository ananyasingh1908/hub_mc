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
            accent: meta?.accent ?? "blue",
            badge: meta?.badge ?? "",
            rewards: meta?.rewards ?? [],
          };
        }),
      });
    },
  },

  "/api/cart/add": {
    POST: async (request) => {
      const body = await readJson<{ productId?: string; quantity?: number }>(request);
      if (!body.productId) return error("productId is required.", 400);

      const prisma = await getPrismaClient();
      const product = await prisma.product.findUnique({ where: { id: body.productId } });
      if (!product) return error("Product not found.", 404);

      const meta = product.metadata as Record<string, any> | null;
      const line = {
        product: {
          id: product.id, slug: product.slug, name: product.name,
          description: product.description, price: Number(product.price),
          image: product.imageUrl, imageUrl: product.imageUrl,
          accent: meta?.accent ?? "blue", badge: meta?.badge ?? "", rewards: meta?.rewards ?? [],
        },
        quantity: Math.max(1, body.quantity ?? 1),
        subtotal: Number(product.price) * Math.max(1, body.quantity ?? 1),
      };

      return json({ items: [line] });
    },
  },

  "/api/cart/remove": {
    POST: async (request) => {
      return json({ items: [] });
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

  "/api/support": {
    POST: async (request) => {
      const body = await readJson<{
        minecraftUsername?: string;
        email?: string;
        subject?: string;
        message?: string;
      }>(request);

      if (!body.minecraftUsername || !body.email || !body.subject || !body.message) {
        return error("Invalid support payload.", 400);
      }

      const prisma = await getPrismaClient();
      const customer = await prisma.customer.findUnique({
        where: { minecraftUsername: body.minecraftUsername },
        include: { user: true },
      });

      const ticket = await prisma.supportTicket.create({
        data: {
          subject: body.subject,
          message: body.message,
          status: "OPEN",
          customerId: customer?.id ?? null,
          userId: customer?.userId ?? null,
        },
      });

      return json({ ticket: { id: ticket.id, status: ticket.status, createdAt: ticket.createdAt.toISOString() } }, { status: 201 });
    },
  },
};
