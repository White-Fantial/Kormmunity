import { NextResponse } from 'next/server';

import { processPendingKakaoDeliveryIntents } from '@/lib/notifications/kakao-pipeline';

function isAuthorized(request: Request) {
  const secret = process.env.NOTIFICATION_JOB_SECRET;
  if (!secret) {
    return true;
  }

  return request.headers.get('x-notification-job-secret') === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limitFromBody = typeof body?.limit === 'number' ? body.limit : Number(body?.limit ?? 100);
  const limit = Number.isFinite(limitFromBody) ? Math.max(1, Math.min(500, limitFromBody)) : 100;

  const result = await processPendingKakaoDeliveryIntents(limit);

  return NextResponse.json({ ok: true, ...result });
}
