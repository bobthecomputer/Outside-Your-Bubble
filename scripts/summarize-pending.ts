import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { summarizeItem } from "@/lib/summarizer";
import { logger } from "@/lib/logger";

async function run() {
  const items = await prisma.item.findMany({
    where: {
      summary: null,
    },
    select: { id: true, title: true },
    take: 25,
  });

  for (const item of items) {
    logger.info({ itemId: item.id }, "summarize:pending");
    await summarizeItem(item.id);
  }

  await prisma.$disconnect();
}

run().catch((error) => {
  logger.error(error, "summarize:pending:error");
  prisma.$disconnect().finally(() => process.exit(1));
});
