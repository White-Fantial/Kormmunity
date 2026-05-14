import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canHoldPost } from '@/lib/permissions';

const PAGE_SIZE = 50;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canHoldPost(currentUser)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { userId } = await params;

  const logs = await prisma.neighbourWarmthLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    select: {
      id: true,
      reason: true,
      baseDelta: true,
      actualDelta: true,
      previousWarmth: true,
      newWarmth: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}
