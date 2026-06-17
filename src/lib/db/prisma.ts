import type { PrismaClient } from "@prisma/client";

declare global {
  var __hubmcPrisma__: PrismaClient | undefined;
}

let prismaPromise: Promise<PrismaClient> | undefined;

export async function getPrismaClient(): Promise<PrismaClient> {
  if (globalThis.__hubmcPrisma__) {
    return globalThis.__hubmcPrisma__;
  }

  if (!prismaPromise) {
    prismaPromise = import("@prisma/client").then(async (module) => {
      const PrismaClientCtor = (module as { PrismaClient: new (...args: any[]) => any }).PrismaClient;

      if (!PrismaClientCtor) {
        throw new Error(
          "Prisma Client has not been generated yet. Run `npx prisma generate` after configuring DATABASE_URL.",
        );
      }

      const { withAccelerate } = await import("@prisma/extension-accelerate");

      const client = new PrismaClientCtor({
        log: ["warn", "error"],
      }).$extends(withAccelerate()) as unknown as PrismaClient;

      if (process.env.NODE_ENV !== "production") {
        globalThis.__hubmcPrisma__ = client;
      }

      return client;
    });
  }

  return prismaPromise;
}
