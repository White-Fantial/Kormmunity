import { prisma } from '@/lib/db/prisma';
import { adjustNeighbourWarmth } from '@/lib/neighbour-warmth';

export async function applyUserWarmthDelta(userId: string, baseDelta: number) {
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, neighbourWarmth: true },
  });

  if (!targetUser) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      neighbourWarmth: adjustNeighbourWarmth(targetUser.neighbourWarmth, baseDelta),
    },
  });
}
