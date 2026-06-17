import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const patterns: [RegExp, string][] = [
  [/coin/i, "Coins"],
  [/rank/i, "Ranks"],
  [/omega/i, "Ranks"],
  [/archon/i, "Ranks"],
  [/emperor/i, "Ranks"],
  [/eternal/i, "Ranks"],
  [/crate/i, "Crates"],
  [/key/i, "Keys"],
  [/cosmetic/i, "Cosmetics"],
  [/bundle/i, "Bundles"],
];

async function main() {
  const products = await prisma.product.findMany();
  let updated = 0;

  for (const product of products) {
    const currentCat = product.category?.trim() || "";
    if (currentCat && currentCat !== "Ranks") continue;

    let category = "Misc";
    for (const [regex, cat] of patterns) {
      if (regex.test(product.name)) {
        category = cat;
        break;
      }
    }

    if (currentCat !== category) {
      await prisma.product.update({
        where: { id: product.id },
        data: { category },
      });
      console.log(`  ${product.name.padEnd(30)} ${currentCat || "(empty)"} → ${category}`);
      updated++;
    }
  }

  console.log(`\nDone. ${updated} product(s) categorized.`);
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
