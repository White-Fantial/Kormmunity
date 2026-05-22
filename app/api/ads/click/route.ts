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

  const { campaignId, postId, adContentId, impressionId } = body as {
    campaignId: string;
    postId?: string;
    adContentId?: string;
    impressionId?: string;
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
        .update(`ad-click:${ip}:${userAgent}`)
        .digest('hex');

  try {
    await prisma.$transaction(async (tx) => {
      await tx.adClick.create({
        data: {
          campaignId,
          postId: postId ?? null,
          adContentId: adContentId ?? null,
          impressionId: impressionId ?? null,
          viewerUserId: currentUser?.id ?? null,
          viewerFingerprint: fingerprint,
        },
      });

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await tx.adDailyStat.upsert({
        where: { campaignId_date: { campaignId, date: today } },
        create: { campaignId, date: today, impressions: 0, clicks: 1 },
        update: { clicks: { increment: 1 } },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
