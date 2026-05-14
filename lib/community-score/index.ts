import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { type CommunityScoreReason, getCommunityScoreConfig } from '@/lib/reputation-settings';

export {
  COMMUNITY_SCORE_POST_AUTO_HOLD_THRESHOLD,
  COMMUNITY_SCORE_COMMENT_AUTO_HOLD_THRESHOLD,
  COMMUNITY_SCORE_BASE_DELTAS,
  getNeighbourWarmthWeight,
} from './scoring';

import {
  getNeighbourWarmthWeight,
} from './scoring';

// ─── Central helper ───────────────────────────────────────────────────────────

type ApplyCommunityScoreChangeParams = {
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  actorId: string | null;
  reason: CommunityScoreReason;
  metadata?: Record<string, unknown>;
};

export async function applyCommunityScoreChange({
  targetType,
  targetId,
  actorId,
  reason,
  metadata,
}: ApplyCommunityScoreChangeParams): Promise<void> {
  const { baseDelta, postAutoHoldThreshold, commentAutoHoldThreshold } =
    await getCommunityScoreConfig(reason);
  let weight = 1.0;

  if (actorId) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { neighbourWarmth: true },
    });

    if (actor) {
      weight = getNeighbourWarmthWeight(actor.neighbourWarmth);
    }
  }

  const finalDelta = baseDelta * weight;

  if (targetType === 'POST') {
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.update({
        where: { id: targetId },
        data: { communityScore: { increment: finalDelta } },
        select: { communityScore: true, status: true },
      });

      await tx.communityScoreEvent.create({
        data: {
          targetType: 'POST',
          targetId,
          postId: targetId,
          actorId,
          baseDelta,
          weight,
          finalDelta,
          reason,
          metadata: metadata !== undefined ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      if (
        post.status === 'PUBLISHED' &&
        post.communityScore < postAutoHoldThreshold
      ) {
        await tx.post.update({
          where: { id: targetId },
          data: {
            status: 'HELD',
            isPinned: false,
            pinnedAt: null,
            heldAt: new Date(),
            heldReason: 'AUTO_SCORE',
          },
        });
      }
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.update({
        where: { id: targetId },
        data: { communityScore: { increment: finalDelta } },
        select: { communityScore: true, status: true },
      });

      await tx.communityScoreEvent.create({
        data: {
          targetType: 'COMMENT',
          targetId,
          commentId: targetId,
          actorId,
          baseDelta,
          weight,
          finalDelta,
          reason,
          metadata: metadata !== undefined ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      if (
        comment.status === 'PUBLISHED' &&
        comment.communityScore < commentAutoHoldThreshold
      ) {
        await tx.comment.update({
          where: { id: targetId },
          data: { status: 'HELD' },
        });
      }
    });
  }
}
