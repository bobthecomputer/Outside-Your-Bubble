import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function run() {
  const items = await prisma.item.findMany({
    include: {
      summary: true,
      verification: true,
    },
  });
  console.log(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      summary: Boolean(item.summary),
      verification: Boolean(item.verification),
      status: item.status,
    })),
  );
  await prisma.$disconnect();
}

run().catch((error) => {
  console.error(error);
  prisma.$disconnect();
});
