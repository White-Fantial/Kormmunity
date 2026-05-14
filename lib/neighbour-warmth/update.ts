import { prisma } from '@/lib/db/prisma';
import { adjustNeighbourWarmth } from '@/lib/neighbour-warmth';
import { type WarmthReason, getWarmthConfig } from '@/lib/reputation-settings';

export async function applyUserWarmthDelta(userId: string, reason: WarmthReason) {
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, neighbourWarmth: true },
  });

  if (!targetUser) return;
  const { baseDelta, curve } = await getWarmthConfig(reason);

  const previousWarmth = targetUser.neighbourWarmth;
  const newWarmth = adjustNeighbourWarmth(previousWarmth, baseDelta, curve);
  const actualDelta = newWarmth - previousWarmth;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { neighbourWarmth: newWarmth },
    }),
    prisma.neighbourWarmthLog.create({
      data: {
        userId,
        reason,
        baseDelta,
        actualDelta,
        previousWarmth,
        newWarmth,
      },
    }),
  ]);
}
