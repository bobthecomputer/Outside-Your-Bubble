import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { planSlate, type UserPreferenceVector } from "@/lib/ranking/personalization";
import { DEFAULT_PREFERENCES } from "@/lib/config";

type StoredPreferences = {
  topics?: string[];
  serendipity?: number;
  homeCountry?: string | null;
};

async function run() {
  const [user] = await prisma.user.findMany({ take: 1 });
  const items = await prisma.item.findMany({ select: { id: true, tags: true, status: true } });

  if (!user) {
    logger.warn("rank:train:no-user");
    return;
  }

  if (items.length === 0) {
    logger.warn({ user: user.id }, "rank:train:no-items");
    return;
  }

  const storedPrefs = (user.prefs as StoredPreferences | null) ?? {};
  const preferenceVector: UserPreferenceVector = {
    likedTopics: storedPrefs.topics ?? DEFAULT_PREFERENCES.topics,
    serendipity:
      typeof storedPrefs.serendipity === "number"
        ? storedPrefs.serendipity
        : DEFAULT_PREFERENCES.serendipity,
    nationality: user.nationality ?? storedPrefs.homeCountry ?? null,
  };

  const slate = planSlate({ items, preferences: preferenceVector });

  logger.info(
    {
      user: user.id,
      preferences: preferenceVector,
      topicDistribution: slate.topicDistribution,
      topSlate: slate.candidates.slice(0, 5),
    },
    "rank:train:slate-preview",
  );
  await prisma.$disconnect();
}

run().catch((error) => {
  logger.error(error, "rank:train:error");
  prisma.$disconnect().finally(() => process.exit(1));
});
