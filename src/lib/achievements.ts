import { prisma } from "./prisma";

export async function awardAchievement(
  userId: string,
  code: string,
  metadata?: Record<string, unknown>,
) {
  const existing = await prisma.achievement.findFirst({
    where: { userId, code },
  });

  if (existing) {
    if (metadata) {
      await prisma.achievement.update({
        where: { id: existing.id },
        data: { metadata },
      });
    }
    return existing;
  }

  return prisma.achievement.create({
    data: {
      userId,
      code,
      metadata,
    },
  });
}
