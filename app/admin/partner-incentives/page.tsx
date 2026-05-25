import { redirect } from 'next/navigation';

import {
  createPartnerIncentiveAction,
  updatePartnerIncentiveStatusAction,
} from '@/app/admin/partner-incentives/actions';
import { ManagementSectionHeader, adminManagementNavItems } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { isAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type PartnerIncentivesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatDateLocal(value: Date | null): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const INCENTIVE_STATUS_LABELS = {
  DRAFT: '초안',
  CONFIRMED: '확정',
  PAID: '지급완료',
} as const;

export default async function PartnerIncentivesPage({ searchParams }: PartnerIncentivesPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    redirect('/posts');
  }

  const query = await searchParams;

  const [partnerManagers, incentives] = await Promise.all([
    prisma.staffAssignment.findMany({
      where: { role: 'PARTNER_MANAGER', isActive: true },
      select: { userId: true, user: { select: { displayName: true } } },
      distinct: ['userId'],
    }),
    prisma.partnerIncentive.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        partnerUserId: true,
        periodStart: true,
        periodEnd: true,
        totalSalesAmount: true,
        incentiveRate: true,
        incentiveAmount: true,
        currency: true,
        status: true,
        notes: true,
        paidAt: true,
        confirmedByUserId: true,
        paidByUserId: true,
        campaignSnapshots: true,
        createdAt: true,
        partnerUser: { select: { displayName: true } },
        confirmedByUser: { select: { displayName: true } },
        paidByUser: { select: { displayName: true } },
      },
    }),
  ]);

  const today = new Date();
  const defaultPeriodStart = formatDateLocal(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const defaultPeriodEnd = formatDateLocal(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
  );

  const inputClass =
    'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const selectClass =
    'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const submitClass =
    'rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <section className="space-y-6">
      <ManagementSectionHeader
        sectionLabel="어드민"
        pageLabel="파트너 인센티브 관리"
        items={adminManagementNavItems}
      />

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}
      {query.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>
      ) : null}

      {/* Create new incentive */}
      <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
          <span>인센티브 생성</span>
          <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
        </summary>
        <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-[#777]">
            지정 기간 내 해당 파트너 매니저에게 귀속된 캠페인의 확정 금액 합계를 자동으로 계산합니다.
          </p>
          <form action={createPartnerIncentiveAction} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">파트너 매니저 <span className="text-red-500">*</span></span>
              <select name="partnerUserId" required className={selectClass}>
                <option value="">선택</option>
                {partnerManagers.map((pm) => (
                  <option key={pm.userId} value={pm.userId}>
                    {pm.user.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">통화</span>
              <select name="currency" defaultValue="NZD" className={selectClass}>
                <option value="NZD">NZD</option>
                <option value="KRW">KRW</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">집계 시작일 <span className="text-red-500">*</span></span>
              <input type="date" name="periodStart" required defaultValue={defaultPeriodStart} className={inputClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">집계 종료일 <span className="text-red-500">*</span></span>
              <input type="date" name="periodEnd" required defaultValue={defaultPeriodEnd} className={inputClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">인센티브율 (소수, 예: 0.1 = 10%) <span className="text-red-500">*</span></span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                name="incentiveRate"
                required
                defaultValue="0.1"
                className={inputClass}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-[#555]">메모</span>
              <textarea name="notes" rows={2} className={inputClass} />
            </label>
            <div className="sm:col-span-2">
              <FormSubmitButton idleLabel="인센티브 초안 생성" pendingLabel="계산 중..." className={submitClass} />
            </div>
          </form>
        </div>
      </details>

      {/* Incentive list */}
      <div className="space-y-3">
        {incentives.length === 0 ? (
          <p className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#888]">
            등록된 인센티브가 없습니다.
          </p>
        ) : (
          incentives.map((incentive) => {
            const statusColor =
              incentive.status === 'PAID'
                ? 'bg-green-50 text-green-700'
                : incentive.status === 'CONFIRMED'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-50 text-gray-600';

            const snapshots = Array.isArray(incentive.campaignSnapshots)
              ? (incentive.campaignSnapshots as {
                  campaignId: string;
                  advertiserName: string | null;
                  productCode: string;
                  productName: string;
                  finalAmount: number;
                  status: string;
                }[])
              : [];

            return (
              <details key={incentive.id} className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                      {INCENTIVE_STATUS_LABELS[incentive.status]}
                    </span>
                    <span className="font-semibold text-sm">{incentive.partnerUser.displayName}</span>
                    <span className="text-xs text-[#888]">
                      {formatDateLocal(incentive.periodStart)} ~ {formatDateLocal(incentive.periodEnd)}
                    </span>
                    <span className="text-sm font-medium">
                      인센티브 {incentive.currency} {Number(incentive.incentiveAmount).toFixed(2)}
                    </span>
                    <span className="text-xs text-[#888]">
                      (매출 {incentive.currency} {Number(incentive.totalSalesAmount).toFixed(2)} × {(Number(incentive.incentiveRate) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
                </summary>

                <div className="space-y-4 border-t border-[#f0f0f0] px-4 pb-4 pt-3">
                  {incentive.notes && (
                    <p className="text-xs text-[#666] bg-[#fafafa] rounded px-2 py-1">{incentive.notes}</p>
                  )}

                  <div className="text-xs text-[#777] space-y-1">
                    {incentive.confirmedByUser && (
                      <p>확정: {incentive.confirmedByUser.displayName}</p>
                    )}
                    {incentive.paidAt && (
                      <p>지급일: {incentive.paidAt.toLocaleDateString('ko-KR')} {incentive.paidByUser ? `(${incentive.paidByUser.displayName})` : ''}</p>
                    )}
                    <p>생성일: {incentive.createdAt.toLocaleDateString('ko-KR')}</p>
                  </div>

                  {/* Snapshot table */}
                  {snapshots.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#555] mb-1">포함된 캠페인 ({snapshots.length}건)</p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="border-b border-[#f0f0f0] text-left text-[#888]">
                              <th className="px-2 py-1">광고주</th>
                              <th className="px-2 py-1">상품</th>
                              <th className="px-2 py-1">확정 금액</th>
                              <th className="px-2 py-1">상태</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snapshots.map((snap) => (
                              <tr key={snap.campaignId} className="border-b border-[#f8f8f8]">
                                <td className="px-2 py-1">{snap.advertiserName ?? '-'}</td>
                                <td className="px-2 py-1">[{snap.productCode}] {snap.productName}</td>
                                <td className="px-2 py-1 font-medium">{incentive.currency} {snap.finalAmount.toFixed(2)}</td>
                                <td className="px-2 py-1">{snap.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Status transitions */}
                  <div className="flex flex-wrap gap-2 border-t border-[#f0f0f0] pt-3">
                    {incentive.status === 'DRAFT' && (
                      <form action={updatePartnerIncentiveStatusAction}>
                        <input type="hidden" name="id" value={incentive.id} />
                        <input type="hidden" name="status" value="CONFIRMED" />
                        <FormSubmitButton
                          idleLabel="확정"
                          pendingLabel="처리 중..."
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        />
                      </form>
                    )}
                    {incentive.status === 'CONFIRMED' && (
                      <form action={updatePartnerIncentiveStatusAction}>
                        <input type="hidden" name="id" value={incentive.id} />
                        <input type="hidden" name="status" value="PAID" />
                        <FormSubmitButton
                          idleLabel="지급 완료 처리"
                          pendingLabel="처리 중..."
                          className="rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                        />
                      </form>
                    )}
                    {incentive.status !== 'DRAFT' && (
                      <form action={updatePartnerIncentiveStatusAction}>
                        <input type="hidden" name="id" value={incentive.id} />
                        <input type="hidden" name="status" value="DRAFT" />
                        <FormSubmitButton
                          idleLabel="초안으로 되돌리기"
                          pendingLabel="처리 중..."
                          className="rounded-lg border border-[#e8e8e8] px-3 py-1 text-xs text-[#666] hover:bg-[#f9f9f9]"
                        />
                      </form>
                    )}
                  </div>
                </div>
              </details>
            );
          })
        )}
      </div>
    </section>
  );
}
