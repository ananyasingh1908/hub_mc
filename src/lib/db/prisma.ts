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
    prismaPromise = import("@prisma/client").then((module) => {
      const PrismaClientCtor = (module as { PrismaClient: new (...args: any[]) => PrismaClient }).PrismaClient;

      if (!PrismaClientCtor) {
        throw new Error(
          "Prisma Client has not been generated yet. Run `npx prisma generate` after configuring DATABASE_URL.",
        );
      }

      const client = new PrismaClientCtor({
        log: ["warn", "error"],
      });

      if (process.env.NODE_ENV !== "production") {
        globalThis.__hubmcPrisma__ = client;
      }

      return client;
    });
  }

  return prismaPromise;
}
