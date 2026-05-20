import { redirect } from 'next/navigation';

import {
  createAdCampaignAction,
  createAdProductAction,
  toggleAdProductActiveAction,
  updateAdCampaignStatusAction,
  upsertAdPlacementRuleAction,
} from '@/app/admin/ads/actions';
import { adsManagerNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessAdsManager } from '@/lib/permissions';
import {
  AD_CAMPAIGN_STATUS_LABELS,
  AD_LAYOUT_LABELS,
  AD_PLACEMENT_TYPE_LABELS,
  AD_SIZE_LABELS,
} from '@/lib/ads/types';

export const dynamic = 'force-dynamic';

type AdminAdsPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

const ADS_SECTION_LABELS = {
  campaigns: '캠페인',
  products: '광고 상품',
  rules: '노출 규칙',
} as const;

type AdsSection = keyof typeof ADS_SECTION_LABELS;

function isAdsSection(value: string): value is AdsSection {
  return value in ADS_SECTION_LABELS;
}

export default async function AdsManagerPage({ params, searchParams }: AdminAdsPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canAccessAdsManager(currentUser)) {
    redirect('/posts');
  }

  const routeParams = await params;
  if (!isAdsSection(routeParams.section)) {
    redirect('/ads-manager/campaigns');
  }

  const section = routeParams.section;
  const params = await searchParams;

  const [adProducts, adCampaigns, placementRules, countries] = await Promise.all([
    prisma.adProduct.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        placementType: true,
        size: true,
        layout: true,
        pricingModel: true,
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
        landingUrl: true,
        notes: true,
        targetCountryId: true,
        targetCityId: true,
        post: { select: { id: true, title: true, status: true } },
        adProduct: { select: { id: true, name: true, code: true, placementType: true } },
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
  ]);

  const inlineRule = placementRules.find((r) => r.placementType === 'FEED_INLINE');

  const inputClass =
    'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const selectClass =
    'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const submitClass =
    'rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">광고 매니저 — {ADS_SECTION_LABELS[section]}</h1>
        <ManagementSectionNav items={adsManagerNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}
      {params.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{params.success}</p>
      ) : null}

      {/* ── Campaigns tab ──────────────────────────────────────────────────── */}
      {section === 'campaigns' && (
        <div className="space-y-6">
          <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
              <span>새 캠페인 등록</span>
              <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
            </summary>
            <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
              <form action={createAdCampaignAction} className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">광고 게시글 ID <span className="text-red-500">*</span></span>
                  <input type="text" name="postId" required placeholder="Post ID" className={inputClass} />
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
                  <input type="datetime-local" name="startAt" className={inputClass} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">집행 종료일</span>
                  <input type="datetime-local" name="endAt" className={inputClass} />
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
                  <span className="text-[#555]">타겟 도시 ID (선택)</span>
                  <input type="text" name="targetCityId" placeholder="City ID (선택)" className={inputClass} />
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
                          <span className="text-sm font-medium">
                            {campaign.post.title ?? `(제목 없음) — ${campaign.post.id.slice(0, 8)}`}
                          </span>
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
                        {(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED'] as const).map((s) => (
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
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Products tab ───────────────────────────────────────────────────── */}
      {section === 'products' && (
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
                  <span className="text-[#555]">가격 모델</span>
                  <select name="pricingModel" className={selectClass}>
                    <option value="FIXED">고정가 (FIXED)</option>
                    <option value="CPM">노출 보장형 (CPM)</option>
                  </select>
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
                        {product.description && (
                          <p className="text-xs text-[#888]">{product.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-2">{AD_PLACEMENT_TYPE_LABELS[product.placementType]}</td>
                      <td className="px-4 py-2">
                        {AD_SIZE_LABELS[product.size]} / {AD_LAYOUT_LABELS[product.layout]}
                      </td>
                      <td className="px-4 py-2">
                        NZD {Number(product.basePrice).toFixed(2)}
                        <span className="ml-1 text-xs text-[#888]">({product.pricingModel})</span>
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
        </div>
      )}

      {/* ── Rules tab ──────────────────────────────────────────────────────── */}
      {section === 'rules' && (
        <div className="space-y-6">
          <p className="text-sm text-[#666]">
            피드 중간 삽입 광고의 위치를 설정합니다. 상단 고정 광고는 항상 피드 최상단에 1개 표시됩니다.
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
