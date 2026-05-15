import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canModerate } from '@/lib/permissions';

const PAGE_SIZE = 50;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canModerate(currentUser)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { postId } = await params;

  const events = await prisma.communityScoreEvent.findMany({
    where: { targetType: 'POST', targetId: postId },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    select: {
      id: true,
      reason: true,
      baseDelta: true,
      weight: true,
      finalDelta: true,
      actorId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ events });
}
