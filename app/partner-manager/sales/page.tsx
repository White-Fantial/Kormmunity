import { redirect } from 'next/navigation';

import { ManagementSectionNav, partnerManagerNavItems } from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  canAccessPartnerManagerSection,
  isAdmin,
} from '@/lib/permissions';
import {
  AD_BILLING_STATUS_LABELS,
  AD_CAMPAIGN_STATUS_LABELS,
} from '@/lib/ads/types';

export const dynamic = 'force-dynamic';

type SalesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    partnerId?: string;
  }>;
};

function parseDateFromQuery(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLocal(value: Date | null): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export default async function PartnerManagerSalesPage({ searchParams }: SalesPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canAccessPartnerManagerSection(currentUser)) {
    redirect('/posts');
  }

  const query = await searchParams;
  const isAdminUser = isAdmin(currentUser);

  const today = new Date();
  const defaultEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);

  const parsedStart = parseDateFromQuery(query.startDate);
  const parsedEnd = parseDateFromQuery(query.endDate);
  const filterStart = parsedStart ?? defaultStartDate;
  const filterEnd = parsedEnd
    ? new Date(parsedEnd.getFullYear(), parsedEnd.getMonth(), parsedEnd.getDate(), 23, 59, 59, 999)
    : defaultEndDate;

  const filterStatus = query.status ?? 'ALL';
  const filterPartnerId = isAdminUser ? (query.partnerId ?? '') : currentUser.id;

  // For admin: load all partner managers to populate the filter
  const partnerManagersForFilter = isAdminUser
    ? await prisma.staffAssignment.findMany({
        where: { role: 'PARTNER_MANAGER', isActive: true },
        select: { userId: true, user: { select: { displayName: true } } },
        distinct: ['userId'],
      })
    : [];

  // Build filter for campaigns
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      sourcedByUserId: filterPartnerId ? filterPartnerId : { not: null },
      ...(filterStatus !== 'ALL' ? { status: filterStatus as 'ACTIVE' | 'ENDED' | 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REQUEST_CHANGES' | 'PAUSED' | 'CANCELLED' } : {}),
      OR: [
        { startAt: { gte: filterStart, lte: filterEnd } },
        { endAt: { gte: filterStart, lte: filterEnd } },
        { startAt: { lte: filterStart }, endAt: { gte: filterEnd } },
        { startAt: { lte: filterStart }, endAt: null },
      ],
    },
    orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      finalAmount: true,
      proposedAmount: true,
      estimatedAmount: true,
      billingStatus: true,
      sourcedByUserId: true,
      sourcedByUser: { select: { displayName: true } },
      advertiser: { select: { name: true } },
      adProduct: { select: { name: true, code: true } },
    },
  });

  // Load related incentives keyed by campaignId via JSON snapshot
  const campaignIds = campaigns.map((c) => c.id);
  const relatedIncentives =
    campaignIds.length > 0
      ? await prisma.partnerIncentive.findMany({
          where: filterPartnerId ? { partnerUserId: filterPartnerId } : {},
          select: {
            id: true,
            status: true,
            incentiveAmount: true,
            currency: true,
            campaignSnapshots: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

  // Build map: campaignId -> incentive
  const incentiveByCampaignId = new Map<string, { id: string; status: string; incentiveAmount: number; currency: string }>();
  for (const incentive of relatedIncentives) {
    const snapshots = Array.isArray(incentive.campaignSnapshots)
      ? (incentive.campaignSnapshots as { campaignId: string }[])
      : [];
    for (const snap of snapshots) {
      if (!incentiveByCampaignId.has(snap.campaignId)) {
        incentiveByCampaignId.set(snap.campaignId, {
          id: incentive.id,
          status: incentive.status,
          incentiveAmount: Number(incentive.incentiveAmount),
          currency: incentive.currency,
        });
      }
    }
  }

  // Aggregate totals
  const totalFinalAmount = campaigns.reduce((sum, c) => {
    const amount = c.finalAmount != null ? Number(c.finalAmount) : 0;
    return sum + amount;
  }, 0);
  const confirmedCampaigns = campaigns.filter((c) => c.finalAmount != null);

  const inputClass =
    'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const selectClass =
    'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const submitClass =
    'rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60';

  const statusOptions = ['ALL', 'DRAFT', 'REVIEW', 'APPROVED', 'REQUEST_CHANGES', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED'] as const;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">파트너 매니저 — 영업 실적</h1>
        <ManagementSectionNav items={partnerManagerNavItems} />
      </div>

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}
      {query.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>
      ) : null}

      {/* Filter */}
      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">필터</h2>
        <form method="get" action="/partner-manager/sales" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="text-[#555]">시작일</span>
            <input type="date" name="startDate" defaultValue={formatDateLocal(filterStart)} className={inputClass} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[#555]">종료일</span>
            <input type="date" name="endDate" defaultValue={formatDateLocal(filterEnd)} className={inputClass} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[#555]">캠페인 상태</span>
            <select name="status" defaultValue={filterStatus} className={selectClass}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? '전체' : AD_CAMPAIGN_STATUS_LABELS[s as keyof typeof AD_CAMPAIGN_STATUS_LABELS]}
                </option>
              ))}
            </select>
          </label>
          {isAdminUser && (
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">파트너 매니저</span>
              <select name="partnerId" defaultValue={filterPartnerId} className={selectClass}>
                <option value="">전체</option>
                {partnerManagersForFilter.map((pm) => (
                  <option key={pm.userId} value={pm.userId}>
                    {pm.user.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-end gap-2">
            <button type="submit" className={submitClass}>적용</button>
          </div>
        </form>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <p className="text-xs text-[#777]">조회된 캠페인</p>
          <p className="mt-1 text-xl font-semibold">{campaigns.length}건</p>
        </div>
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <p className="text-xs text-[#777]">확정 금액 합산</p>
          <p className="mt-1 text-xl font-semibold">
            NZD {totalFinalAmount.toFixed(2)}
          </p>
          <p className="text-xs text-[#888]">확정 캠페인 {confirmedCampaigns.length}건</p>
        </div>
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <p className="text-xs text-[#777]">인센티브 지급 대상</p>
          <p className="mt-1 text-xl font-semibold">
            {campaigns.filter((c) => incentiveByCampaignId.has(c.id)).length}건 연결됨
          </p>
          <p className="text-xs text-[#888]">
            어드민에서 인센티브를 생성·확정할 수 있습니다
          </p>
        </div>
      </div>

      {/* Campaign table */}
      <div className="rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-[#f0f0f0]">
          <h2 className="text-base font-semibold">귀속 캠페인 목록</h2>
        </div>
        {campaigns.length === 0 ? (
          <p className="p-4 text-sm text-[#888]">
            선택한 조건의 귀속 캠페인이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0f0f0] text-left text-xs text-[#777]">
                  <th className="px-3 py-2">광고주</th>
                  <th className="px-3 py-2">상품</th>
                  <th className="px-3 py-2">기간</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">확정 금액</th>
                  <th className="px-3 py-2">청구 상태</th>
                  {isAdminUser && <th className="px-3 py-2">영업 담당</th>}
                  <th className="px-3 py-2">인센티브</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const finalAmount = campaign.finalAmount != null
                    ? `NZD ${Number(campaign.finalAmount).toFixed(2)}`
                    : campaign.proposedAmount != null
                      ? `NZD ${Number(campaign.proposedAmount).toFixed(2)} (제안)`
                      : '-';
                  const incentive = incentiveByCampaignId.get(campaign.id);
                  const statusColor: Record<string, string> = {
                    REVIEW: 'text-blue-700 bg-blue-50',
                    APPROVED: 'text-cyan-700 bg-cyan-50',
                    REQUEST_CHANGES: 'text-orange-700 bg-orange-50',
                    ACTIVE: 'text-green-700 bg-green-50',
                    PAUSED: 'text-amber-700 bg-amber-50',
                    DRAFT: 'text-gray-600 bg-gray-50',
                    ENDED: 'text-gray-500 bg-gray-50',
                    CANCELLED: 'text-red-600 bg-red-50',
                  };
                  return (
                    <tr key={campaign.id} className="border-b border-[#f5f5f5] text-xs">
                      <td className="px-3 py-2 font-medium">{campaign.advertiser?.name ?? '-'}</td>
                      <td className="px-3 py-2">[{campaign.adProduct.code}] {campaign.adProduct.name}</td>
                      <td className="px-3 py-2">
                        {campaign.startAt ? campaign.startAt.toLocaleDateString('ko-KR') : '-'}
                        {' ~ '}
                        {campaign.endAt ? campaign.endAt.toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 font-medium ${statusColor[campaign.status] ?? 'bg-gray-50 text-gray-600'}`}>
                          {AD_CAMPAIGN_STATUS_LABELS[campaign.status as keyof typeof AD_CAMPAIGN_STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium">{finalAmount}</td>
                      <td className="px-3 py-2">{AD_BILLING_STATUS_LABELS[campaign.billingStatus as keyof typeof AD_BILLING_STATUS_LABELS]}</td>
                      {isAdminUser && (
                        <td className="px-3 py-2">{campaign.sourcedByUser?.displayName ?? '-'}</td>
                      )}
                      <td className="px-3 py-2">
                        {incentive ? (
                          <span className={`rounded-full px-2 py-0.5 font-medium ${
                            incentive.status === 'PAID' ? 'bg-green-50 text-green-700' :
                            incentive.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {incentive.status === 'PAID' ? '지급완료' : incentive.status === 'CONFIRMED' ? '확정' : '초안'}
                            {' '}NZD {Number(incentive.incentiveAmount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[#bbb]">미연결</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
