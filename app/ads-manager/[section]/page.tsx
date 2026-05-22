import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  createAdCampaignAction,
  createAdContentAction,
  createAdProductAction,
  createAdProposalAction,
  toggleAdProductActiveAction,
  updateAdCampaignAction,
  updateAdCampaignStatusAction,
  updateAdContentAction,
  updateAdContentStatusAction,
  updateAdProductAction,
  updateAdProposalContentAction,
  updateAdProposalStatusAction,
  upsertAdGeoPricingAction,
  upsertAdPlacementPricingAction,
  upsertAdPlacementRuleAction,
} from '@/app/admin/ads/actions';
import { adsManagerNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessAdsManagerSection } from '@/lib/permissions';
import {
  AD_BILLING_STATUS_LABELS,
  AD_BILLING_UNIT_LABELS,
  AD_CAMPAIGN_STATUS_LABELS,
  AD_LAYOUT_LABELS,
  AD_PLACEMENT_TYPE_LABELS,
  AD_SIZE_LABELS,
} from '@/lib/ads/types';
import { AdContentCreateForm } from '@/components/ads/ad-content-form';

export const dynamic = 'force-dynamic';

type AdminAdsPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    campaignId?: string;
    productId?: string;
    proposalId?: string;
    contentId?: string;
    geoPricingId?: string;
    placementPricingId?: string;
  }>;
};

const AD_MANAGER_SECTIONS = ['campaigns', 'products', 'proposals', 'contents', 'rules'] as const;
type AdManagerSection = (typeof AD_MANAGER_SECTIONS)[number];

function isAdManagerSection(value: string): value is AdManagerSection {
  return (AD_MANAGER_SECTIONS as readonly string[]).includes(value);
}

function formatDateTimeLocal(value: Date | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateLocal(value: Date | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function AdsManagerSectionPage({ params, searchParams }: AdminAdsPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canAccessAdsManagerSection(currentUser)) {
    redirect('/posts');
  }

  const routeParams = await params;
  const query = await searchParams;
  if (!isAdManagerSection(routeParams.section)) {
    redirect('/ads-manager/campaigns');
  }

  const activeSection = routeParams.section;

  const [adProducts, adCampaigns, placementRules, countries, advertisers, adProposals, adContents, adGeoPricings, adPlacementPricings] = await Promise.all([
    prisma.adProduct.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        placementType: true,
        size: true,
        layout: true,
        billingUnit: true,
        currency: true,
        basePrice: true,
        isActive: true,
        sortOrder: true,
        description: true,
        _count: { select: { campaigns: true } },
      },
    }),
    prisma.adCampaign.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        status: true,
        priority: true,
        startAt: true,
        endAt: true,
        maxImpressions: true,
        estimatedAmount: true,
        finalAmount: true,
        billingStatus: true,
        landingUrl: true,
        notes: true,
        reviewNotes: true,
        reviewedAt: true,
        targetCountryId: true,
        targetCityId: true,
        postId: true,
        adContentId: true,
        post: { select: { id: true, title: true, status: true } },
        adContent: { select: { id: true, title: true, status: true } },
        advertiser: { select: { name: true } },
        adProduct: { select: { id: true, name: true, code: true, placementType: true, size: true, layout: true } },
        targetCountry: { select: { name: true } },
        targetCity: { select: { name: true } },
        _count: { select: { impressions: true, clicks: true } },
      },
    }),
    prisma.adPlacementRule.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        placementType: true,
        insertAfter: true,
        repeatInterval: true,
        maxPerPage: true,
        isActive: true,
      },
    }),
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, cities: { where: { isActive: true }, select: { id: true, name: true } } },
    }),
    prisma.advertiser.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true },
    }),
    prisma.adProposal.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        status: true,
        title: true,
        body: true,
        advertiserId: true,
        advertiser: { select: { name: true } },
        advertisedProductCode: true,
        requestedStartAt: true,
        requestedEndAt: true,
        requestedBudget: true,
        requestedLandingUrl: true,
        negotiationNotes: true,
        rejectedReason: true,
        createdAt: true,
      },
    }),
    prisma.adContent.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        status: true,
        title: true,
        body: true,
        advertiserId: true,
        advertiser: { select: { name: true } },
        proposalId: true,
        landingUrl: true,
        thumbnailUrl: true,
        displayName: true,
        categoryName: true,
        cityName: true,
        reviewNotes: true,
        updatedAt: true,
      },
    }),
    prisma.adGeoPricing.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        countryId: true,
        cityId: true,
        multiplier: true,
        isActive: true,
        effectiveFrom: true,
        effectiveTo: true,
        updatedAt: true,
        country: { select: { name: true } },
        city: { select: { name: true } },
      },
    }),
    prisma.adPlacementPricing.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        placementType: true,
        multiplier: true,
        isActive: true,
        effectiveFrom: true,
        effectiveTo: true,
        updatedAt: true,
      },
    }),
  ]);

  const inlineRule = placementRules.find((r) => r.placementType === 'FEED_INLINE');
  const selectedCampaign = query.campaignId
    ? adCampaigns.find((campaign) => campaign.id === query.campaignId)
    : null;
  const selectedProduct = query.productId
    ? adProducts.find((product) => product.id === query.productId)
    : null;
  const selectedProposal = query.proposalId
    ? adProposals.find((proposal) => proposal.id === query.proposalId)
    : null;
  const selectedContent = query.contentId
    ? adContents.find((content) => content.id === query.contentId)
    : null;

  const selectedContentLogs = selectedContent
    ? await prisma.adAuditLog.findMany({
        where: { adContentId: selectedContent.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          actionType: true,
          message: true,
          metadata: true,
          createdAt: true,
          actor: { select: { displayName: true } },
        },
      })
    : [];
  const selectedGeoPricing = query.geoPricingId
    ? adGeoPricings.find((pricing) => pricing.id === query.geoPricingId)
    : null;
  const selectedPlacementPricing = query.placementPricingId
    ? adPlacementPricings.find((pricing) => pricing.id === query.placementPricingId)
    : null;

  const negotiatedProposals = adProposals
    .filter((p) => p.status === 'NEGOTIATED')
    .map((p) => ({
      id: p.id,
      title: p.title,
      advertiserId: p.advertiserId,
      advertiserName: p.advertiser.name,
    }));

  const inputClass =
    'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const selectClass =
    'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const submitClass =
    'rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60';
  const contentStatuses = ['DRAFT', 'REVIEW', 'APPROVED', 'REJECTED'] as const;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">광고 매니저 — 광고 관리</h1>
        <ManagementSectionNav items={adsManagerNavItems} />
      </div>

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}
      {query.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>
      ) : null}

      {/* ── Campaigns tab ──────────────────────────────────────────────────── */}
      {activeSection === 'campaigns' && (
        <div className="space-y-6">
          <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
              <span>새 캠페인 등록</span>
              <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
            </summary>
            <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
              <form action={createAdCampaignAction} className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">광고 콘텐츠 (legacy 게시글 ID와 둘 중 하나 필수)</span>
                  <select name="adContentId" className={selectClass}>
                    <option value="">콘텐츠 선택 안 함 (legacy post 사용 시)</option>
                    {adContents
                      .filter((content) => content.status === 'APPROVED')
                      .map((content) => (
                        <option key={content.id} value={content.id}>
                          {content.title ?? '(제목 없음)'} · {content.advertiser.name} · {content.id.slice(0, 8)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">legacy 게시글 ID (선택)</span>
                  <input type="text" name="postId" placeholder="Legacy Post ID" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">광고 상품 <span className="text-red-500">*</span></span>
                  <select name="adProductId" required className={selectClass}>
                    <option value="">상품 선택</option>
                    {adProducts.filter((p) => p.isActive).map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name} ({AD_PLACEMENT_TYPE_LABELS[p.placementType]})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">우선순위 (높을수록 먼저)</span>
                  <input type="number" name="priority" defaultValue={0} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">최대 노출수 (빈칸 = 무제한)</span>
                  <input type="number" name="maxImpressions" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">집행 시작일</span>
                  <input type="date" name="startAt" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">집행 종료일</span>
                  <input type="date" name="endAt" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">타겟 국가</span>
                  <select name="targetCountryId" className={selectClass}>
                    <option value="">전체 (무관)</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">타겟 도시 (선택)</span>
                  <select name="targetCityId" className={selectClass}>
                    <option value="">전체 (무관)</option>
                    {countries.map((country) => (
                      <optgroup key={country.id} label={country.name}>
                        {country.cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">랜딩 URL (빈칸 = 게시글 상세)</span>
                  <input type="url" name="landingUrl" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">메모</span>
                  <textarea name="notes" rows={2} className={inputClass} />
                </label>
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="캠페인 등록" pendingLabel="등록 중..." className={submitClass} />
                </div>
              </form>
            </div>
          </details>

          <div className="space-y-3">
            {adCampaigns.length === 0 ? (
              <p className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#888]">
                등록된 캠페인이 없습니다.
              </p>
            ) : (
              adCampaigns.map((campaign) => {
                const statusLabel = AD_CAMPAIGN_STATUS_LABELS[campaign.status];
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
                const ctr =
                  campaign._count.impressions > 0
                    ? ((campaign._count.clicks / campaign._count.impressions) * 100).toFixed(2)
                    : '0.00';
                const estimatedAmountText =
                  campaign.estimatedAmount != null
                    ? `NZD ${Number(campaign.estimatedAmount).toFixed(2)}`
                    : '-';
                const finalAmountText =
                  campaign.finalAmount != null
                    ? `NZD ${Number(campaign.finalAmount).toFixed(2)}`
                    : '-';

                return (
                  <div
                    key={campaign.id}
                    className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[campaign.status] ?? 'bg-gray-50 text-gray-600'}`}
                          >
                            {statusLabel}
                          </span>
                          <Link
                            href={`/ads-manager/campaigns?campaignId=${campaign.id}`}
                            className="text-sm font-medium text-[#3c1e1e] underline-offset-2 hover:underline"
                          >
                            {campaign.adContent?.title ??
                              campaign.post?.title ??
                              `(제목 없음) — ${campaign.id.slice(0, 8)}`}
                          </Link>
                          <span className="text-xs text-[#888]">[{campaign.adProduct.code}] {campaign.adProduct.name}</span>
                        </div>
                        <p className="text-xs text-[#888]">
                          {AD_PLACEMENT_TYPE_LABELS[campaign.adProduct.placementType]} ·
                          우선순위 {campaign.priority} ·
                          노출 {campaign._count.impressions.toLocaleString()}회 ·
                          클릭 {campaign._count.clicks.toLocaleString()}회 ·
                          CTR {ctr}%
                          {campaign.targetCountry ? ` · ${campaign.targetCountry.name}` : ''}
                          {campaign.targetCity ? ` / ${campaign.targetCity.name}` : ''}
                          {campaign.maxImpressions ? ` · 최대 ${campaign.maxImpressions.toLocaleString()}회` : ''}
                          {campaign.advertiser ? ` · ${campaign.advertiser.name}` : ''}
                        </p>
                        <p className="text-xs text-[#888]">
                          과금 상태 {AD_BILLING_STATUS_LABELS[campaign.billingStatus]} · 견적 {estimatedAmountText} · 확정 {finalAmountText}
                        </p>
                        <p className="text-xs text-[#888]">
                          content: {campaign.adContentId ?? '-'} / legacy post: {campaign.postId ?? '-'}
                        </p>
                        {(campaign.startAt || campaign.endAt) && (
                          <p className="text-xs text-[#888]">
                            {campaign.startAt ? new Date(campaign.startAt).toLocaleDateString('ko-KR') : '시작일 미정'} ~{' '}
                            {campaign.endAt ? new Date(campaign.endAt).toLocaleDateString('ko-KR') : '종료일 미정'}
                          </p>
                        )}
                        {campaign.notes && (
                          <p className="text-xs text-[#777]">{campaign.notes}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            'DRAFT',
                            'REVIEW',
                            'APPROVED',
                            'REQUEST_CHANGES',
                            'ACTIVE',
                            'PAUSED',
                            'ENDED',
                            'CANCELLED',
                          ] as const
                        ).map((s) => (
                          campaign.status !== s && (
                            <form key={s} action={updateAdCampaignStatusAction}>
                              <input type="hidden" name="id" value={campaign.id} />
                              <input type="hidden" name="status" value={s} />
                              <button
                                type="submit"
                                className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]"
                              >
                                {AD_CAMPAIGN_STATUS_LABELS[s]}으로 변경
                              </button>
                            </form>
                          )
                        ))}
                        <Link
                          href={`/ads-manager/campaigns?campaignId=${campaign.id}`}
                          className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]"
                        >
                          상세 보기
                        </Link>
                        <Link
                          href={`/ads/preview/campaign/${campaign.id}`}
                          className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]"
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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">캠페인 상세/수정</h2>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/ads/preview/campaign/${selectedCampaign.id}`}
                    className="text-xs underline text-[#666]"
                    target="_blank"
                    rel="noreferrer"
                  >
                    미리보기
                  </Link>
                  <span className="text-xs text-[#888]">ID: {selectedCampaign.id}</span>
                </div>
              </div>
              <form action={updateAdCampaignAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={selectedCampaign.id} />
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">우선순위 (높을수록 먼저)</span>
                  <input
                    type="number"
                    name="priority"
                    defaultValue={selectedCampaign.priority}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">최대 노출수 (빈칸 = 무제한)</span>
                  <input
                    type="number"
                    name="maxImpressions"
                    defaultValue={selectedCampaign.maxImpressions ?? ''}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">집행 시작일</span>
                  <input
                    type="date"
                    name="startAt"
                    defaultValue={formatDateLocal(selectedCampaign.startAt)}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">집행 종료일</span>
                  <input
                    type="date"
                    name="endAt"
                    defaultValue={formatDateLocal(selectedCampaign.endAt)}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">타겟 국가</span>
                  <select
                    name="targetCountryId"
                    defaultValue={selectedCampaign.targetCountryId ?? ''}
                    className={selectClass}
                  >
                    <option value="">전체 (무관)</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">타겟 도시 (선택)</span>
                  <select
                    name="targetCityId"
                    defaultValue={selectedCampaign.targetCityId ?? ''}
                    className={selectClass}
                  >
                    <option value="">전체 (무관)</option>
                    {countries.map((country) => (
                      <optgroup key={country.id} label={country.name}>
                        {country.cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">과금 요약</span>
                  <p className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-xs text-[#666]">
                    상태: {AD_BILLING_STATUS_LABELS[selectedCampaign.billingStatus]} · 견적:{' '}
                    {selectedCampaign.estimatedAmount != null
                      ? `NZD ${Number(selectedCampaign.estimatedAmount).toFixed(2)}`
                      : '-'}{' '}
                    · 확정:{' '}
                    {selectedCampaign.finalAmount != null
                      ? `NZD ${Number(selectedCampaign.finalAmount).toFixed(2)}`
                      : '-'}
                  </p>
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">랜딩 URL (빈칸 = 게시글 상세)</span>
                  <input
                    type="url"
                    name="landingUrl"
                    defaultValue={selectedCampaign.landingUrl ?? ''}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">메모</span>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={selectedCampaign.notes ?? ''}
                    className={inputClass}
                  />
                </label>
                {selectedCampaign.reviewNotes ? (
                  <div className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-[#555]">광고주 수정 요청 메모</span>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 whitespace-pre-wrap">
                      {selectedCampaign.reviewNotes}
                      {selectedCampaign.reviewedAt && (
                        <p className="mt-1 text-amber-600">
                          {new Date(selectedCampaign.reviewedAt).toLocaleString('ko-KR')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="캠페인 수정 저장" pendingLabel="저장 중..." className={submitClass} />
                </div>
              </form>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Proposals tab ──────────────────────────────────────────────────── */}
      {activeSection === 'proposals' && (
        <div className="space-y-6">
          <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
              <span>광고 제안 등록</span>
              <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
            </summary>
            <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
              <form action={createAdProposalAction} className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">광고주 <span className="text-red-500">*</span></span>
                  <select name="advertiserId" required className={selectClass}>
                    <option value="">광고주 선택</option>
                    {advertisers.map((advertiser) => (
                      <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">상품 코드 (선택)</span>
                  <select name="advertisedProductCode" className={selectClass}>
                    <option value="">상품 선택 안 함</option>
                    {adProducts.filter((p) => p.isActive).map((p) => (
                      <option key={p.id} value={p.code}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">제안 제목 <span className="text-red-500">*</span></span>
                  <input type="text" name="title" required className={inputClass} />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">제안 내용 <span className="text-red-500">*</span></span>
                  <textarea name="body" required rows={4} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">희망 시작일</span>
                  <input type="date" name="requestedStartAt" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">희망 종료일</span>
                  <input type="date" name="requestedEndAt" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">예산 (NZD)</span>
                  <input type="number" step="0.01" min="0" name="requestedBudget" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">희망 랜딩 URL</span>
                  <input type="url" name="requestedLandingUrl" className={inputClass} />
                </label>
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="제안 등록" pendingLabel="등록 중..." className={submitClass} />
                </div>
              </form>
            </div>
          </details>

          <div className="space-y-3">
            {adProposals.length === 0 ? (
              <p className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#888]">
                등록된 광고 제안이 없습니다.
              </p>
            ) : (
              adProposals.map((proposal) => (
                <div key={proposal.id} className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{proposal.title}</p>
                      <p className="text-xs text-[#888]">{proposal.advertiser.name} · {proposal.status}</p>
                    </div>
                    <Link href={`/ads-manager/proposals?proposalId=${proposal.id}`} className="text-xs underline">
                      상세 보기
                    </Link>
                  </div>
                  <p className="line-clamp-2 text-sm text-[#666]">{proposal.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(['SUBMITTED', 'IN_NEGOTIATION', 'NEGOTIATED', 'REJECTED'] as const).map((status) => (
                      proposal.status !== status ? (
                        <form key={status} action={updateAdProposalStatusAction}>
                          <input type="hidden" name="id" value={proposal.id} />
                          <input type="hidden" name="status" value={status} />
                          <button type="submit" className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]">
                            {status}
                          </button>
                        </form>
                      ) : null
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedProposal ? (
            <div className="space-y-4 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">제안 상세/수정</h2>
                <span className="text-xs text-[#888]">ID: {selectedProposal.id}</span>
              </div>

              <form action={updateAdProposalContentAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={selectedProposal.id} />
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">광고주</span>
                  <p className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-sm text-[#555]">
                    {selectedProposal.advertiser.name}
                  </p>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">상품 코드</span>
                  <select name="advertisedProductCode" defaultValue={selectedProposal.advertisedProductCode ?? ''} className={selectClass}>
                    <option value="">상품 선택 안 함</option>
                    {adProducts.filter((p) => p.isActive).map((p) => (
                      <option key={p.id} value={p.code}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">제안 제목 <span className="text-red-500">*</span></span>
                  <input type="text" name="title" required defaultValue={selectedProposal.title} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">제안 내용 <span className="text-red-500">*</span></span>
                  <textarea name="body" required rows={4} defaultValue={selectedProposal.body} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">희망 시작일</span>
                  <input
                    type="date"
                    name="requestedStartAt"
                    defaultValue={formatDateLocal(selectedProposal.requestedStartAt)}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">희망 종료일</span>
                  <input
                    type="date"
                    name="requestedEndAt"
                    defaultValue={formatDateLocal(selectedProposal.requestedEndAt)}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">예산 (NZD)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="requestedBudget"
                    defaultValue={selectedProposal.requestedBudget != null ? Number(selectedProposal.requestedBudget).toString() : ''}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">희망 랜딩 URL</span>
                  <input
                    type="url"
                    name="requestedLandingUrl"
                    defaultValue={selectedProposal.requestedLandingUrl ?? ''}
                    className={inputClass}
                  />
                </label>
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="내용 저장" pendingLabel="저장 중..." className={submitClass} />
                </div>
              </form>

              <form action={updateAdProposalStatusAction} className="grid gap-3 sm:grid-cols-2 border-t border-[#f0f0f0] pt-4">
                <input type="hidden" name="id" value={selectedProposal.id} />
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">상태</span>
                  <select name="status" defaultValue={selectedProposal.status} className={selectClass}>
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="IN_NEGOTIATION">IN_NEGOTIATION</option>
                    <option value="NEGOTIATED">NEGOTIATED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">반려 사유</span>
                  <input type="text" name="rejectedReason" defaultValue={selectedProposal.rejectedReason ?? ''} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">협의 메모</span>
                  <textarea name="negotiationNotes" rows={3} defaultValue={selectedProposal.negotiationNotes ?? ''} className={inputClass} />
                </label>
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="상태 저장" pendingLabel="저장 중..." className={submitClass} />
                </div>
              </form>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Contents tab ───────────────────────────────────────────────────── */}
      {activeSection === 'contents' && (
        <div className="space-y-6">
          <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
              <span>광고 콘텐츠 등록</span>
              <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
            </summary>
            <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
              <AdContentCreateForm
                advertisers={advertisers}
                negotiatedProposals={negotiatedProposals}
                createAction={createAdContentAction}
                inputClass={inputClass}
                selectClass={selectClass}
              />
            </div>
          </details>

          <div className="space-y-3">
            {adContents.length === 0 ? (
              <p className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#888]">
                등록된 광고 콘텐츠가 없습니다.
              </p>
            ) : (
              adContents.map((content) => (
                <div key={content.id} className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{content.title ?? '(제목 없음)'}</p>
                      <p className="text-xs text-[#888]">{content.advertiser.name} · {content.status}</p>
                    </div>
                    <Link href={`/ads-manager/contents?contentId=${content.id}`} className="text-xs underline">
                      상세 보기
                    </Link>
                  </div>
                  <p className="line-clamp-2 text-sm text-[#666]">{content.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contentStatuses.map((status) => (
                      content.status !== status ? (
                        <form key={status} action={updateAdContentStatusAction}>
                          <input type="hidden" name="id" value={content.id} />
                          <input type="hidden" name="status" value={status} />
                          <button type="submit" className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]">
                            {status}
                          </button>
                        </form>
                      ) : null
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedContent ? (
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold">콘텐츠 상세/수정</h2>
              <form action={updateAdContentAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={selectedContent.id} />
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">제목</span>
                  <input type="text" name="title" defaultValue={selectedContent.title ?? ''} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">본문</span>
                  <textarea name="body" rows={4} defaultValue={selectedContent.body} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">썸네일 URL</span>
                  <input type="url" name="thumbnailUrl" defaultValue={selectedContent.thumbnailUrl ?? ''} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">랜딩 URL</span>
                  <input type="url" name="landingUrl" defaultValue={selectedContent.landingUrl ?? ''} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">
                    노출 작성자명{' '}
                    <span className="text-xs text-[#888]">(빈칸이면 광고주 이름이 표시됩니다)</span>
                  </span>
                  <input type="text" name="displayName" defaultValue={selectedContent.displayName ?? ''} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">카테고리명</span>
                  <input type="text" name="categoryName" defaultValue={selectedContent.categoryName ?? ''} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">도시명</span>
                  <input type="text" name="cityName" defaultValue={selectedContent.cityName ?? ''} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">연결 제안 (Negotiated 상태만 표시)</span>
                  <select name="proposalId" defaultValue={selectedContent.proposalId ?? ''} className={selectClass}>
                    <option value="">제안 연결 안 함</option>
                    {negotiatedProposals.map((proposal) => (
                      <option key={proposal.id} value={proposal.id}>
                        {proposal.title} — {proposal.advertiserName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">리뷰 메모</span>
                  <textarea name="reviewNotes" rows={3} defaultValue={selectedContent.reviewNotes ?? ''} className={inputClass} />
                </label>
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="콘텐츠 저장" pendingLabel="저장 중..." className={submitClass} />
               </div>
              </form>
              <form action={updateAdContentStatusAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={selectedContent.id} />
                <select name="status" defaultValue={selectedContent.status} className={selectClass}>
                  {contentStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button type="submit" className="rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm hover:bg-[#f9f9f9]">
                  상태 변경
                </button>
              </form>
              <div className="mt-4 border-t border-[#f0f0f0] pt-4">
                <h3 className="mb-2 text-sm font-semibold">콘텐츠 로그 (광고 매니저 전용)</h3>
                {selectedContentLogs.length === 0 ? (
                  <p className="text-xs text-[#888]">기록된 로그가 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedContentLogs.map((log) => (
                      <li key={log.id} className="rounded-lg border border-[#f0f0f0] px-3 py-2 text-xs">
                        <p className="font-medium text-[#444]">
                          {log.actionType}
                          {log.message ? ` · ${log.message}` : ''}
                        </p>
                        <p className="mt-0.5 text-[#888]">
                          {new Date(log.createdAt).toLocaleString('ko-KR')}
                          {log.actor?.displayName ? ` · ${log.actor.displayName}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Products tab ───────────────────────────────────────────────────── */}
      {activeSection === 'products' && (
        <div className="space-y-6">
          <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
              <span>새 광고 상품 추가</span>
              <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
            </summary>
            <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
              <form action={createAdProductAction} className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">상품 코드 (영문, 고유) <span className="text-red-500">*</span></span>
                  <input type="text" name="code" required placeholder="예: TOP_BANNER_L" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">상품명 <span className="text-red-500">*</span></span>
                  <input type="text" name="name" required placeholder="예: 상단 배너 (대형)" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">노출 위치 <span className="text-red-500">*</span></span>
                  <select name="placementType" required className={selectClass}>
                    <option value="TOP_FIXED">상단 고정</option>
                    <option value="FEED_INLINE">피드 중간 삽입</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">크기</span>
                  <select name="size" className={selectClass}>
                    {Object.entries(AD_SIZE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">레이아웃</span>
                  <select name="layout" className={selectClass}>
                    {Object.entries(AD_LAYOUT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">과금 단위</span>
                  <select name="billingUnit" className={selectClass}>
                    {Object.entries(AD_BILLING_UNIT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">통화 (예: NZD)</span>
                  <input type="text" name="currency" defaultValue="NZD" maxLength={10} className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">기준 단가 (NZD)</span>
                  <input type="number" name="basePrice" defaultValue="0" step="0.01" min="0" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">정렬 순서</span>
                  <input type="number" name="sortOrder" defaultValue="0" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">설명 (선택)</span>
                  <textarea name="description" rows={2} className={inputClass} />
                </label>
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="상품 추가" pendingLabel="추가 중..." className={submitClass} />
                </div>
              </form>
            </div>
          </details>

          <div className="overflow-x-auto rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0f0f0] text-left text-[#888]">
                  <th className="px-4 py-3">코드</th>
                  <th className="px-4 py-3">상품명</th>
                  <th className="px-4 py-3">위치</th>
                  <th className="px-4 py-3">크기/레이아웃</th>
                  <th className="px-4 py-3">단가</th>
                  <th className="px-4 py-3">캠페인</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {adProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-[#888]">
                      등록된 광고 상품이 없습니다.
                    </td>
                  </tr>
                ) : (
                  adProducts.map((product) => (
                    <tr key={product.id} className="border-b border-[#f9f9f9] last:border-b-0">
                      <td className="px-4 py-2 font-mono text-xs">{product.code}</td>
                      <td className="px-4 py-2">
                       <p className="font-medium">{product.name}</p>
                        <Link
                          href={`/ads-manager/products?productId=${product.id}`}
                          className="text-xs text-[#666] underline-offset-2 hover:underline"
                        >
                          상세 보기
                        </Link>
                        {product.description && (
                          <p className="text-xs text-[#888]">{product.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-2">{AD_PLACEMENT_TYPE_LABELS[product.placementType]}</td>
                      <td className="px-4 py-2">
                        {AD_SIZE_LABELS[product.size]} / {AD_LAYOUT_LABELS[product.layout]}
                      </td>
                      <td className="px-4 py-2">
                        {product.currency} {Number(product.basePrice).toFixed(2)}
                        <span className="ml-1 text-xs text-[#888]">
                          ({AD_BILLING_UNIT_LABELS[product.billingUnit]})
                        </span>
                      </td>
                      <td className="px-4 py-2">{product._count.campaigns}개</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            product.isActive
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {product.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <form action={toggleAdProductActiveAction}>
                          <input type="hidden" name="id" value={product.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]"
                          >
                            {product.isActive ? '비활성화' : '활성화'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedProduct ? (
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">광고 상품 상세/수정</h2>
                <span className="text-xs text-[#888]">ID: {selectedProduct.id}</span>
              </div>
              <form action={updateAdProductAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={selectedProduct.id} />
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">상품명 <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={selectedProduct.name}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">노출 위치 <span className="text-red-500">*</span></span>
                  <select
                    name="placementType"
                    required
                    defaultValue={selectedProduct.placementType}
                    className={selectClass}
                  >
                    <option value="TOP_FIXED">상단 고정</option>
                    <option value="FEED_INLINE">피드 중간 삽입</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">크기</span>
                  <select name="size" defaultValue={selectedProduct.size} className={selectClass}>
                    {Object.entries(AD_SIZE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">레이아웃</span>
                  <select name="layout" defaultValue={selectedProduct.layout} className={selectClass}>
                    {Object.entries(AD_LAYOUT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">과금 단위</span>
                  <select
                    name="billingUnit"
                    defaultValue={selectedProduct.billingUnit}
                    className={selectClass}
                  >
                    {Object.entries(AD_BILLING_UNIT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">통화 (예: NZD)</span>
                  <input
                    type="text"
                    name="currency"
                    defaultValue={selectedProduct.currency}
                    maxLength={10}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">기준 단가 (NZD)</span>
                  <input
                    type="number"
                    name="basePrice"
                    step="0.01"
                    min="0"
                    defaultValue={Number(selectedProduct.basePrice)}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">정렬 순서</span>
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={selectedProduct.sortOrder}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">설명 (선택)</span>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={selectedProduct.description ?? ''}
                    className={inputClass}
                  />
                </label>
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="상품 수정 저장" pendingLabel="저장 중..." className={submitClass} />
                </div>
              </form>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Rules tab ──────────────────────────────────────────────────────── */}
      {activeSection === 'rules' && (
        <div className="space-y-6">
          <p className="text-sm text-[#666]">
            노출 규칙과 가격 가중치(지역/위치)를 관리합니다.
          </p>

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <h2 className="mb-4 font-semibold">피드 중간 삽입 (FEED_INLINE) 규칙</h2>
            <form action={upsertAdPlacementRuleAction} className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="placementType" value="FEED_INLINE" />
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">첫 광고 삽입 위치 (N번째 게시글 뒤)</span>
                <input
                  type="number"
                  name="insertAfter"
                  defaultValue={inlineRule?.insertAfter ?? 5}
                  min={1}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">이후 반복 간격 (N개 게시글마다)</span>
                <input
                  type="number"
                  name="repeatInterval"
                  defaultValue={inlineRule?.repeatInterval ?? 10}
                  min={1}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">페이지당 최대 광고 수</span>
                <input
                  type="number"
                  name="maxPerPage"
                  defaultValue={inlineRule?.maxPerPage ?? 2}
                  min={1}
                  className={inputClass}
                />
              </label>
              <div className="sm:col-span-3">
                <FormSubmitButton idleLabel="규칙 저장" pendingLabel="저장 중..." className={submitClass} />
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">지역 가중치 설정 (AdGeoPricing)</h2>
              {selectedGeoPricing ? (
                <Link href="/ads-manager/rules" className="text-xs text-[#666] underline-offset-2 hover:underline">
                  새 항목 등록으로 전환
                </Link>
              ) : null}
            </div>
            <form action={upsertAdGeoPricingAction} className="grid gap-3 sm:grid-cols-2">
              {selectedGeoPricing ? <input type="hidden" name="id" value={selectedGeoPricing.id} /> : null}
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">국가 (선택)</span>
                <select
                  name="countryId"
                  defaultValue={selectedGeoPricing?.countryId ?? ''}
                  className={selectClass}
                >
                  <option value="">선택 안 함</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">도시 (선택)</span>
                <select
                  name="cityId"
                  defaultValue={selectedGeoPricing?.cityId ?? ''}
                  className={selectClass}
                >
                  <option value="">선택 안 함</option>
                  {countries.map((country) => (
                    <optgroup key={country.id} label={country.name}>
                      {country.cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">가중치(multiplier) <span className="text-red-500">*</span></span>
                <input
                  type="number"
                  name="multiplier"
                  step="0.0001"
                  min="0.0001"
                  required
                  defaultValue={selectedGeoPricing ? Number(selectedGeoPricing.multiplier) : 1}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">활성 여부</span>
                <div className="flex h-[38px] items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={selectedGeoPricing ? selectedGeoPricing.isActive : true}
                    className="h-4 w-4 rounded border-[#d0d0d0]"
                  />
                </div>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">적용 시작</span>
                <input
                  type="datetime-local"
                  name="effectiveFrom"
                  defaultValue={formatDateTimeLocal(selectedGeoPricing?.effectiveFrom ?? null)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">적용 종료</span>
                <input
                  type="datetime-local"
                  name="effectiveTo"
                  defaultValue={formatDateTimeLocal(selectedGeoPricing?.effectiveTo ?? null)}
                  className={inputClass}
                />
              </label>
              <div className="sm:col-span-2">
                <FormSubmitButton
                  idleLabel={selectedGeoPricing ? '지역 가중치 수정 저장' : '지역 가중치 등록'}
                  pendingLabel="저장 중..."
                  className={submitClass}
                />
              </div>
            </form>
          </div>

          {adGeoPricings.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0f0f0] text-left text-[#888]">
                    <th className="px-4 py-3">대상</th>
                    <th className="px-4 py-3">가중치</th>
                    <th className="px-4 py-3">적용 기간</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {adGeoPricings.map((pricing) => (
                    <tr key={pricing.id} className="border-b border-[#f9f9f9] last:border-b-0">
                      <td className="px-4 py-2">
                        {pricing.city
                          ? `도시: ${pricing.city.name}`
                          : pricing.country
                            ? `국가: ${pricing.country.name}`
                            : '-'}
                      </td>
                      <td className="px-4 py-2">{Number(pricing.multiplier).toFixed(4)}</td>
                      <td className="px-4 py-2 text-xs text-[#666]">
                        {pricing.effectiveFrom ? new Date(pricing.effectiveFrom).toLocaleString('ko-KR') : '즉시'} ~{' '}
                        {pricing.effectiveTo ? new Date(pricing.effectiveTo).toLocaleString('ko-KR') : '무기한'}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            pricing.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {pricing.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/ads-manager/rules?geoPricingId=${pricing.id}`}
                          className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]"
                        >
                          상세/수정
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">노출 위치 가중치 설정 (AdPlacementPricing)</h2>
              {selectedPlacementPricing ? (
                <Link href="/ads-manager/rules" className="text-xs text-[#666] underline-offset-2 hover:underline">
                  새 항목 등록으로 전환
                </Link>
              ) : null}
            </div>
            <form action={upsertAdPlacementPricingAction} className="grid gap-3 sm:grid-cols-2">
              {selectedPlacementPricing ? (
                <input type="hidden" name="id" value={selectedPlacementPricing.id} />
              ) : null}
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">노출 위치 <span className="text-red-500">*</span></span>
                <select
                  name="placementType"
                  defaultValue={selectedPlacementPricing?.placementType ?? 'FEED_INLINE'}
                  className={selectClass}
                >
                  <option value="TOP_FIXED">상단 고정</option>
                  <option value="FEED_INLINE">피드 중간 삽입</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">가중치(multiplier) <span className="text-red-500">*</span></span>
                <input
                  type="number"
                  name="multiplier"
                  step="0.0001"
                  min="0.0001"
                  required
                  defaultValue={selectedPlacementPricing ? Number(selectedPlacementPricing.multiplier) : 1}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">활성 여부</span>
                <div className="flex h-[38px] items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={selectedPlacementPricing ? selectedPlacementPricing.isActive : true}
                    className="h-4 w-4 rounded border-[#d0d0d0]"
                  />
                </div>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">적용 시작</span>
                <input
                  type="datetime-local"
                  name="effectiveFrom"
                  defaultValue={formatDateTimeLocal(selectedPlacementPricing?.effectiveFrom ?? null)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">적용 종료</span>
                <input
                  type="datetime-local"
                  name="effectiveTo"
                  defaultValue={formatDateTimeLocal(selectedPlacementPricing?.effectiveTo ?? null)}
                  className={inputClass}
                />
              </label>
              <div className="sm:col-span-2">
                <FormSubmitButton
                  idleLabel={selectedPlacementPricing ? '위치 가중치 수정 저장' : '위치 가중치 등록'}
                  pendingLabel="저장 중..."
                  className={submitClass}
                />
              </div>
            </form>
          </div>

          {adPlacementPricings.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0f0f0] text-left text-[#888]">
                    <th className="px-4 py-3">노출 위치</th>
                    <th className="px-4 py-3">가중치</th>
                    <th className="px-4 py-3">적용 기간</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {adPlacementPricings.map((pricing) => (
                    <tr key={pricing.id} className="border-b border-[#f9f9f9] last:border-b-0">
                      <td className="px-4 py-2">{AD_PLACEMENT_TYPE_LABELS[pricing.placementType]}</td>
                      <td className="px-4 py-2">{Number(pricing.multiplier).toFixed(4)}</td>
                      <td className="px-4 py-2 text-xs text-[#666]">
                        {pricing.effectiveFrom ? new Date(pricing.effectiveFrom).toLocaleString('ko-KR') : '즉시'} ~{' '}
                        {pricing.effectiveTo ? new Date(pricing.effectiveTo).toLocaleString('ko-KR') : '무기한'}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            pricing.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {pricing.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/ads-manager/rules?placementPricingId=${pricing.id}`}
                          className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]"
                        >
                          상세/수정
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {placementRules.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0f0f0] text-left text-[#888]">
                    <th className="px-4 py-3">위치</th>
                    <th className="px-4 py-3">첫 삽입 위치</th>
                    <th className="px-4 py-3">반복 간격</th>
                    <th className="px-4 py-3">최대 수</th>
                    <th className="px-4 py-3">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {placementRules.map((rule) => (
                    <tr key={rule.id} className="border-b border-[#f9f9f9] last:border-b-0">
                      <td className="px-4 py-2">{AD_PLACEMENT_TYPE_LABELS[rule.placementType]}</td>
                      <td className="px-4 py-2">{rule.insertAfter}번째 뒤</td>
                      <td className="px-4 py-2">{rule.repeatInterval}개마다</td>
                      <td className="px-4 py-2">{rule.maxPerPage}개</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            rule.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {rule.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
