import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { verifyItem } from "@/lib/verification";
import { logger } from "@/lib/logger";

async function run() {
  const items = await prisma.item.findMany({
    where: {
      verification: null,
    },
    select: { id: true },
    take: 25,
  });

  for (const item of items) {
    logger.info({ itemId: item.id }, "verify:pending");
    await verifyItem(item.id);
  }

  await prisma.$disconnect();
}

run().catch((error) => {
  logger.error(error, "verify:pending:error");
  prisma.$disconnect().finally(() => process.exit(1));
});
