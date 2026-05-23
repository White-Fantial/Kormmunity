import Link from 'next/link';
import { redirect } from 'next/navigation';

import { reviewAdvertiserMemberCampaignAction } from '@/app/advertiser-member/actions';
import {
  advertiserMemberNavItems,
  ManagementSectionNav,
} from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessAdvertiserMemberSection } from '@/lib/permissions';
import {
  AD_BILLING_STATUS_LABELS,
  AD_CAMPAIGN_STATUS_LABELS,
  AD_PLACEMENT_TYPE_LABELS,
} from '@/lib/ads/types';

export const dynamic = 'force-dynamic';

type AdvertiserMemberCampaignsPageProps = {
  searchParams: Promise<{ campaignId?: string; error?: string; success?: string }>;
};

export default async function AdvertiserMemberCampaignsPage({
  searchParams,
}: AdvertiserMemberCampaignsPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await canAccessAdvertiserMemberSection(currentUser))) {
    redirect('/posts');
  }

  const query = await searchParams;
  const memberships = await prisma.advertiserMember.findMany({
    where: { userId: currentUser.id, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: {
      advertiserId: true,
    },
  });

  const advertiserIds = memberships.map((membership) => membership.advertiserId);
  const adCampaigns = advertiserIds.length
    ? await prisma.adCampaign.findMany({
        where: {
          advertiserId: { in: advertiserIds },
          status: { not: 'DRAFT' },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          status: true,
          billingStatus: true,
          priority: true,
          startAt: true,
          endAt: true,
          maxImpressions: true,
          estimatedAmount: true,
          proposedAmount: true,
          finalAmount: true,
          notes: true,
          reviewNotes: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
          postId: true,
          adContentId: true,
          advertiser: { select: { name: true } },
          adProduct: { select: { code: true, name: true, placementType: true } },
          targetCountry: { select: { name: true } },
          targetCity: { select: { name: true } },
          adContent: { select: { title: true } },
          post: { select: { title: true } },
          _count: { select: { impressions: true, clicks: true } },
        },
      })
    : [];

  const selectedCampaign = query.campaignId
    ? adCampaigns.find((campaign) => campaign.id === query.campaignId)
    : null;

  const inputClass =
    'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const submitClass =
    'rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">광고주 멤버 — 캠페인 조회</h1>
        <ManagementSectionNav items={advertiserMemberNavItems} />
      </div>

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}
      {query.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>
      ) : null}

      <div className="space-y-3">
        {adCampaigns.length === 0 ? (
          <p className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#888]">
            멤버로 속한 광고주의 캠페인이 없습니다.
          </p>
        ) : (
          adCampaigns.map((campaign) => {
            const ctr =
              campaign._count.impressions > 0
                ? ((campaign._count.clicks / campaign._count.impressions) * 100).toFixed(2)
                : '0.00';
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
              <div
                key={campaign.id}
                className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[campaign.status] ?? 'bg-gray-50 text-gray-600'}`}
                      >
                        {AD_CAMPAIGN_STATUS_LABELS[campaign.status]}
                      </span>
                      <p className="text-sm font-semibold">
                        {campaign.adContent?.title ??
                          campaign.post?.title ??
                          `(제목 없음) — ${campaign.id.slice(0, 8)}`}
                      </p>
                      <span className="text-xs text-[#888]">
                        [{campaign.adProduct.code}] {campaign.adProduct.name}
                      </span>
                    </div>
                    <p className="text-xs text-[#888]">
                      광고주 {campaign.advertiser?.name ?? '-'} · 노출 유형{' '}
                      {AD_PLACEMENT_TYPE_LABELS[campaign.adProduct.placementType]} · 우선순위{' '}
                      {campaign.priority}
                    </p>
                    <p className="text-xs text-[#888]">
                      과금 상태 {AD_BILLING_STATUS_LABELS[campaign.billingStatus]}
                    </p>
                    <p className="text-xs text-[#888]">
                      자동 계산{' '}
                      {campaign.estimatedAmount != null
                        ? `NZD ${Number(campaign.estimatedAmount).toFixed(2)}`
                        : '-'}{' '}
                      · 제안{' '}
                      {campaign.proposedAmount != null
                        ? `NZD ${Number(campaign.proposedAmount).toFixed(2)}`
                        : '미제안'}{' '}
                      · 확정{' '}
                      {campaign.finalAmount != null
                        ? `NZD ${Number(campaign.finalAmount).toFixed(2)}`
                        : '미확정'}
                    </p>
                    {campaign.status === 'REVIEW' && campaign.finalAmount == null ? (
                      <p className="text-xs font-medium text-amber-700">
                        가격 미확정: 승인 전 협의 금액이 확정되지 않았습니다.
                      </p>
                    ) : null}
                    <p className="text-xs text-[#888]">
                      노출 {campaign._count.impressions.toLocaleString()}회 · 클릭{' '}
                      {campaign._count.clicks.toLocaleString()}회 · CTR {ctr}%
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Link
                      href={`/advertiser-member/campaigns?campaignId=${campaign.id}`}
                      className="text-xs underline"
                    >
                      상세 보기
                    </Link>
                    <Link
                      href={`/ads/preview/campaign/${campaign.id}`}
                      className="text-xs underline text-[#666]"
                      target="_blank"
                      rel="noreferrer"
                    >
                      미리보기
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedCampaign ? (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">캠페인 상세</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#888]">광고주</dt>
              <dd className="mt-0.5 font-medium">{selectedCampaign.advertiser?.name ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">진행상태</dt>
              <dd className="mt-0.5 font-medium">
                {AD_CAMPAIGN_STATUS_LABELS[selectedCampaign.status]}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">과금 상태</dt>
              <dd className="mt-0.5 font-medium">
                {AD_BILLING_STATUS_LABELS[selectedCampaign.billingStatus]}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">우선순위</dt>
              <dd className="mt-0.5">{selectedCampaign.priority}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-[#888]">연결된 콘텐츠/글</dt>
              <dd className="mt-0.5">
                {selectedCampaign.adContent?.title ??
                  selectedCampaign.post?.title ??
                  '(연결된 콘텐츠/글 없음)'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">집행 기간</dt>
              <dd className="mt-0.5">
                {selectedCampaign.startAt
                  ? new Date(selectedCampaign.startAt).toLocaleDateString('ko-KR')
                  : '시작일 미정'}{' '}
                ~{' '}
                {selectedCampaign.endAt
                  ? new Date(selectedCampaign.endAt).toLocaleDateString('ko-KR')
                  : '종료일 미정'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">최대 노출수</dt>
              <dd className="mt-0.5">
                {selectedCampaign.maxImpressions != null
                  ? `${selectedCampaign.maxImpressions.toLocaleString()}회`
                  : '무제한'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">견적 금액</dt>
              <dd className="mt-0.5">
                {selectedCampaign.estimatedAmount != null
                  ? `NZD ${Number(selectedCampaign.estimatedAmount).toFixed(2)}`
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">제안 금액</dt>
              <dd className="mt-0.5">
                {selectedCampaign.proposedAmount != null
                  ? `NZD ${Number(selectedCampaign.proposedAmount).toFixed(2)}`
                  : '미제안'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">확정 금액</dt>
              <dd className="mt-0.5">
                {selectedCampaign.finalAmount != null
                  ? `NZD ${Number(selectedCampaign.finalAmount).toFixed(2)}`
                  : '미확정'}
              </dd>
            </div>
            {selectedCampaign.finalAmount == null ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#888]">가격 확정 상태</dt>
                <dd className="mt-0.5 text-amber-700">
                  협의 확정 금액이 아직 입력되지 않았습니다.
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-[#888]">타겟 위치</dt>
              <dd className="mt-0.5">
                {selectedCampaign.targetCountry?.name ?? '전체'}
                {selectedCampaign.targetCity?.name
                  ? ` / ${selectedCampaign.targetCity.name}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">최종 수정일</dt>
              <dd className="mt-0.5">
                {new Date(selectedCampaign.updatedAt).toLocaleDateString('ko-KR')}
              </dd>
            </div>
            {selectedCampaign.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#888]">메모</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[#666]">
                  {selectedCampaign.notes}
                </dd>
              </div>
            ) : null}
            {selectedCampaign.reviewNotes ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#888]">이전 리뷰 메모</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[#666]">
                  {selectedCampaign.reviewNotes}
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-xs text-[#888]">캠페인 미리보기</dt>
              <dd className="mt-0.5">
                <Link
                  href={`/ads/preview/campaign/${selectedCampaign.id}`}
                  className="text-xs underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  미리보기 열기
                </Link>
              </dd>
            </div>
          </dl>

          {selectedCampaign.status === 'REVIEW' ? (
            <div className="mt-4 space-y-3 border-t border-[#f0f0f0] pt-4">
              <h3 className="text-sm font-semibold">캠페인 리뷰</h3>
              <p className="text-xs text-[#888]">
                캠페인 내용을 미리보기로 확인한 후 승인하거나 수정 요청을 할 수 있습니다.
                내용 직접 수정은 광고 매니저에게 전달됩니다.
              </p>

              <form action={reviewAdvertiserMemberCampaignAction}>
                <input type="hidden" name="id" value={selectedCampaign.id} />
                <input type="hidden" name="action" value="APPROVE" />
                <FormSubmitButton
                  idleLabel="캠페인 승인"
                  pendingLabel="처리 중..."
                  className={submitClass}
                />
              </form>

              <form action={reviewAdvertiserMemberCampaignAction} className="space-y-2">
                <input type="hidden" name="id" value={selectedCampaign.id} />
                <input type="hidden" name="action" value="REQUEST_CHANGES" />
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">수정 요청 내용</span>
                  <textarea
                    name="reviewNotes"
                    rows={3}
                    required
                    placeholder="광고 매니저에게 요청할 수정 사항을 입력해 주세요."
                    className={inputClass}
                  />
                </label>
                <FormSubmitButton
                  idleLabel="수정 요청 보내기"
                  pendingLabel="전송 중..."
                  className={submitClass}
                />
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
