import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';

const SERVICE_TIMEZONE = 'Pacific/Auckland';

function getLocalDayStart(date: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => {
    const value = parts.find((part) => part.type === type)?.value ?? '0';
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  let hour = get('hour');
  if (hour === 24) hour = 0;
  const minute = get('minute');
  const second = get('second');

  const elapsedSinceMidnightMs =
    (hour * 3_600 + minute * 60 + second) * 1_000 + date.getMilliseconds();
  return new Date(date.getTime() - elapsedSinceMidnightMs);
}

function normalizePath(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return null;

  const noHash = trimmed.split('#')[0] ?? trimmed;
  const noQuery = noHash.split('?')[0] ?? noHash;
  return noQuery || '/';
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const normalizedPath = normalizePath(payload?.path);

    if (payload?.event === 'app_init' && normalizedPath) {
      const today = getLocalDayStart(new Date(), SERVICE_TIMEZONE);
      await prisma.pageViewDailyStat.upsert({
        where: { date_path: { date: today, path: normalizedPath } },
        update: { viewCount: { increment: 1 } },
        create: {
          date: today,
          path: normalizedPath,
          viewCount: 1,
        },
      });
    }

    console.info(
      JSON.stringify({
        source: 'client',
        ...payload,
        at: new Date().toISOString(),
      }),
    );
  } catch {
    // no-op
  }

  return NextResponse.json({ ok: true });
}
