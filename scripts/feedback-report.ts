import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function run() {
  const signals = await prisma.feedback.groupBy({
    by: ["signal"],
    _count: { _all: true },
  });
  logger.info({ signals }, "feedback:report");
  await prisma.$disconnect();
}

run().catch((error) => {
  logger.error(error, "feedback:report:error");
  prisma.$disconnect().finally(() => process.exit(1));
});
