import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sources = [
    {
      url: "https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=2&sortBy=lastUpdatedDate&sortOrder=descending",
      type: "arxiv",
      title: "arXiv CS.AI latest",
    },
    {
      url: "https://feeds.npr.org/1001/rss.xml",
      type: "rss",
      title: "NPR News",
    },
  ];

  for (const source of sources) {
    await prisma.source.upsert({
      where: { url: source.url },
      update: {
        title: source.title,
        active: true,
      },
      create: source,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
