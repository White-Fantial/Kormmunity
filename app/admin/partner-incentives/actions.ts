'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PartnerIncentiveStatus } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { isAdmin } from '@/lib/permissions';

const INCENTIVE_PATH = '/admin/partner-incentives';

function normalizeText(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function redirectIncentive(query?: Record<string, string>): never {
  if (!query || Object.keys(query).length === 0) {
    redirect(INCENTIVE_PATH);
  }
  redirect(`${INCENTIVE_PATH}?${new URLSearchParams(query).toString()}`);
}

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    redirect('/posts');
  }
  return user;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export async function createPartnerIncentiveAction(formData: FormData) {
  const currentUser = await requireAdminUser();

  const partnerUserId = normalizeText(formData.get('partnerUserId'));
  const periodStartRaw = normalizeText(formData.get('periodStart')) || null;
  const periodEndRaw = normalizeText(formData.get('periodEnd')) || null;
  const incentiveRateRaw = normalizeText(formData.get('incentiveRate'));
  const currency = normalizeText(formData.get('currency')) || 'NZD';
  const notes = normalizeText(formData.get('notes')) || null;

  if (!partnerUserId || !periodStartRaw || !periodEndRaw || !incentiveRateRaw) {
    redirectIncentive({ error: '파트너, 기간, 인센티브율은 필수입니다.' });
  }

  const periodStart = parseDate(periodStartRaw);
  const periodEnd = parseDate(periodEndRaw);

  if (!periodStart || !periodEnd) {
    redirectIncentive({ error: '유효하지 않은 기간입니다.' });
  }

  if (periodStart > periodEnd) {
    redirectIncentive({ error: '시작일이 종료일보다 늦을 수 없습니다.' });
  }

  const incentiveRate = Number(incentiveRateRaw);
  if (Number.isNaN(incentiveRate) || incentiveRate < 0 || incentiveRate > 1) {
    redirectIncentive({ error: '인센티브율은 0 이상 1 이하의 소수로 입력해 주세요. (예: 0.1 = 10%)' });
  }

  // Load attributed campaigns in period with finalAmount
  const periodEndWithTime = new Date(
    periodEnd.getFullYear(),
    periodEnd.getMonth(),
    periodEnd.getDate(),
    23,
    59,
    59,
    999,
  );

  const campaigns = await prisma.adCampaign.findMany({
    where: {
      sourcedByUserId: partnerUserId,
      finalAmount: { not: null },
      OR: [
        { startAt: { gte: periodStart, lte: periodEndWithTime } },
        { endAt: { gte: periodStart, lte: periodEndWithTime } },
        { startAt: { lte: periodStart }, endAt: { gte: periodEndWithTime } },
        { startAt: { lte: periodStart }, endAt: null },
      ],
    },
    select: {
      id: true,
      finalAmount: true,
      status: true,
      startAt: true,
      endAt: true,
      advertiser: { select: { name: true } },
      adProduct: { select: { name: true, code: true } },
    },
  });

  const totalSalesAmount = campaigns.reduce(
    (sum, c) => sum + Number(c.finalAmount ?? 0),
    0,
  );
  const incentiveAmount = Math.round(totalSalesAmount * incentiveRate * 100) / 100;

  const campaignSnapshots = campaigns.map((c) => ({
    campaignId: c.id,
    advertiserName: c.advertiser?.name ?? null,
    productCode: c.adProduct.code,
    productName: c.adProduct.name,
    finalAmount: Number(c.finalAmount),
    startAt: c.startAt?.toISOString() ?? null,
    endAt: c.endAt?.toISOString() ?? null,
    status: c.status,
  }));

  await prisma.partnerIncentive.create({
    data: {
      partnerUserId,
      periodStart,
      periodEnd: periodEndWithTime,
      totalSalesAmount,
      incentiveRate,
      incentiveAmount,
      currency,
      status: 'DRAFT',
      notes,
      campaignSnapshots,
    },
  });

  revalidatePath(INCENTIVE_PATH);
  redirectIncentive({ success: `인센티브 초안이 생성되었습니다. 총 매출 ${totalSalesAmount.toFixed(2)} ${currency} · 인센티브 ${incentiveAmount.toFixed(2)} ${currency}` });
}

export async function updatePartnerIncentiveStatusAction(formData: FormData) {
  const currentUser = await requireAdminUser();

  const id = normalizeText(formData.get('id'));
  const status = normalizeText(formData.get('status')) as PartnerIncentiveStatus;

  if (!id || !status) {
    redirectIncentive({ error: '인센티브 ID와 상태는 필수입니다.' });
  }

  const validStatuses: PartnerIncentiveStatus[] = ['DRAFT', 'CONFIRMED', 'PAID'];
  if (!validStatuses.includes(status)) {
    redirectIncentive({ error: '유효하지 않은 인센티브 상태입니다.' });
  }

  const incentive = await prisma.partnerIncentive.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!incentive) {
    redirectIncentive({ error: '인센티브 레코드를 찾을 수 없습니다.' });
  }

  await prisma.partnerIncentive.update({
    where: { id },
    data: {
      status,
      ...(status === 'CONFIRMED'
        ? { confirmedByUserId: currentUser.id }
        : {}),
      ...(status === 'PAID'
        ? { paidAt: new Date(), paidByUserId: currentUser.id }
        : {}),
    },
  });

  revalidatePath(INCENTIVE_PATH);
  const label = status === 'CONFIRMED' ? '확정' : status === 'PAID' ? '지급 완료' : '초안';
  redirectIncentive({ success: `인센티브 상태가 ${label}로 변경되었습니다.` });
}
