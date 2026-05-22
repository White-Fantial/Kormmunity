import { createHash } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('campaignId' in body) ||
    typeof (body as Record<string, unknown>).campaignId !== 'string'
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { campaignId, postId, adContentId, placementType, positionIndex } = body as {
    campaignId: string;
    postId?: string;
    adContentId?: string;
    placementType?: string;
    positionIndex?: number;
  };

  if (!postId && !adContentId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const currentUser = await getCurrentUser();

  const ip = getRequestIp(request);
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const fingerprint = currentUser?.id
    ? null
    : createHash('sha256')
        .update(`ad-imp:${ip}:${userAgent}`)
        .digest('hex');

  const resolvedPlacementType =
    placementType === 'TOP_FIXED' ? 'TOP_FIXED' : ('FEED_INLINE' as const);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.adImpression.create({
        data: {
          campaignId,
          postId: postId ?? null,
          adContentId: adContentId ?? null,
          placementType: resolvedPlacementType,
          pageKey: 'feed',
          positionIndex: typeof positionIndex === 'number' ? positionIndex : 0,
          viewerUserId: currentUser?.id ?? null,
          viewerFingerprint: fingerprint,
        },
      });

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await tx.adDailyStat.upsert({
        where: { campaignId_date: { campaignId, date: today } },
        create: { campaignId, date: today, impressions: 1, clicks: 0 },
        update: { impressions: { increment: 1 } },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
