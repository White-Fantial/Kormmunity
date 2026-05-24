import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  createAdCampaignAction,
  confirmAdCampaignPricingAction,
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
import { CampaignPricingLivePreview } from '@/components/ads/campaign-pricing-live-preview';

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
    statsRange?: string;
    statsStartDate?: string;
    statsEndDate?: string;
    statsCountryId?: string;
    statsCityId?: string;
    statsStatus?: string;
    statsProductId?: string;
    statsActiveOnly?: string;
  }>;
};

const AD_MANAGER_SECTIONS = ['campaigns', 'products', 'proposals', 'contents', 'rules'] as const;
type AdManagerSection = (typeof AD_MANAGER_SECTIONS)[number];
type StatsRangePreset = 'today' | '7d' | '30d' | 'custom';

const STATS_RANGE_PRESETS: StatsRangePreset[] = ['today', '7d', '30d', 'custom'];
const MIN_IMPRESSIONS_FOR_PRICING_DECISION = 300;
const PRICE_SUGGESTION_LABELS = {
  INCREASE: '가격 + 제안',
  DECREASE: '가격 - 제안',
  HOLD: '유지',
  INSUFFICIENT: '표본 부족',
} as const;

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

function toDateStartOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function toDateEndOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function parseDateFromQuery(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getWeekStart(value: Date): Date {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }
  return `NZD ${value.toFixed(2)}`;
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

  const [adProducts, adCampaigns, placementRules, countries, advertisers, adProposals, adContents, adGeoPricings, partnerManagers] = await Promise.all([
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
        advertiserId: true,
        status: true,
        priority: true,
        startAt: true,
        endAt: true,
        maxImpressions: true,
        estimatedAmount: true,
        proposedAmount: true,
        finalAmount: true,
        pricingConfirmationSnapshot: true,
        billingStatus: true,
        priceAdjustmentReason: true,
        priceConfirmedAt: true,
        priceConfirmedByUserId: true,
        landingUrl: true,
        notes: true,
        reviewNotes: true,
        reviewedAt: true,
        targetCountryId: true,
        targetCityId: true,
        adContentId: true,
        sourcedByUserId: true,
        adContent: { select: { id: true, title: true, status: true } },
        advertiser: { select: { name: true } },
        priceConfirmedByUser: { select: { displayName: true } },
        sourcedByUser: { select: { displayName: true } },
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
    prisma.staffAssignment.findMany({
      where: { role: 'PARTNER_MANAGER', isActive: true },
      select: {
        userId: true,
        user: { select: { displayName: true } },
      },
      distinct: ['userId'],
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
  const selectedProposalCampaigns = selectedProposal
    ? adCampaigns.filter((campaign) => campaign.advertiserId === selectedProposal.advertiserId)
    : [];
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
  const selectedStatsRange = STATS_RANGE_PRESETS.includes((query.statsRange ?? '') as StatsRangePreset)
    ? (query.statsRange as StatsRangePreset)
    : '30d';
  const statsCountryId = query.statsCountryId ?? '';
  const statsCityId = query.statsCityId ?? '';
  const statsStatus = query.statsStatus ?? 'ALL';
  const statsProductId = query.statsProductId ?? '';
  const statsActiveOnly = query.statsActiveOnly === '1';
  const today = new Date();
  const defaultStatsEnd = toDateEndOfDay(today);
  const defaultStatsStart = toDateStartOfDay(addDays(today, -29));
  let statsStartDate = defaultStatsStart;
  let statsEndDate = defaultStatsEnd;

  if (selectedStatsRange === 'today') {
    statsStartDate = toDateStartOfDay(today);
    statsEndDate = toDateEndOfDay(today);
  } else if (selectedStatsRange === '7d') {
    statsStartDate = toDateStartOfDay(addDays(today, -6));
    statsEndDate = defaultStatsEnd;
  } else if (selectedStatsRange === 'custom') {
    const parsedStartDate = parseDateFromQuery(query.statsStartDate);
    const parsedEndDate = parseDateFromQuery(query.statsEndDate);
    if (parsedStartDate && parsedEndDate) {
      statsStartDate = toDateStartOfDay(parsedStartDate);
      statsEndDate = toDateEndOfDay(parsedEndDate);
    }
  }

  if (statsStartDate.getTime() > statsEndDate.getTime()) {
    const swappedStart = toDateStartOfDay(statsEndDate);
    const swappedEnd = toDateEndOfDay(statsStartDate);
    statsStartDate = swappedStart;
    statsEndDate = swappedEnd;
  }

  const statsStartDateInput = formatDateLocal(statsStartDate);
  const statsEndDateInput = formatDateLocal(statsEndDate);

  const filteredStatsCampaigns = adCampaigns.filter((campaign) => {
    if (statsProductId && campaign.adProduct.id !== statsProductId) {
      return false;
    }

    if (statsCountryId && campaign.targetCountryId !== statsCountryId) {
      return false;
    }

    if (statsCityId && campaign.targetCityId !== statsCityId) {
      return false;
    }

    if (statsActiveOnly && campaign.status !== 'ACTIVE') {
      return false;
    }

    if (statsStatus !== 'ALL' && campaign.status !== statsStatus) {
      return false;
    }

    return true;
  });

  const filteredStatsCampaignIds = filteredStatsCampaigns.map((campaign) => campaign.id);
  const filteredDailyStats =
    filteredStatsCampaignIds.length > 0
      ? await prisma.adDailyStat.findMany({
          where: {
            campaignId: { in: filteredStatsCampaignIds },
            date: {
              gte: statsStartDate,
              lte: statsEndDate,
            },
          },
          select: {
            campaignId: true,
            date: true,
            impressions: true,
            clicks: true,
          },
          orderBy: [{ date: 'asc' }],
        })
      : [];

  const statsByCampaignId = new Map<string, { impressions: number; clicks: number }>();
  for (const stat of filteredDailyStats) {
    const prev = statsByCampaignId.get(stat.campaignId) ?? { impressions: 0, clicks: 0 };
    statsByCampaignId.set(stat.campaignId, {
      impressions: prev.impressions + stat.impressions,
      clicks: prev.clicks + stat.clicks,
    });
  }

  const campaignStatsRows = filteredStatsCampaigns.map((campaign) => {
    const periodStats = statsByCampaignId.get(campaign.id) ?? { impressions: 0, clicks: 0 };
    const spend = Number(campaign.finalAmount ?? campaign.proposedAmount ?? campaign.estimatedAmount ?? 0);
    const ctr = periodStats.impressions > 0 ? (periodStats.clicks / periodStats.impressions) * 100 : 0;
    const cpc = periodStats.clicks > 0 ? spend / periodStats.clicks : null;
    const cpm = periodStats.impressions > 0 ? (spend / periodStats.impressions) * 1000 : null;
    const isInventoryTight = campaign.maxImpressions != null && campaign.maxImpressions > 0
      ? periodStats.impressions / campaign.maxImpressions >= 0.8
      : false;
    return {
      campaign,
      spend,
      ...periodStats,
      ctr,
      cpc,
      cpm,
      isInventoryTight,
    };
  });

  const totalImpressions = campaignStatsRows.reduce((acc, row) => acc + row.impressions, 0);
  const totalClicks = campaignStatsRows.reduce((acc, row) => acc + row.clicks, 0);
  const totalSpend = campaignStatsRows.reduce((acc, row) => acc + row.spend, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : null;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null;
  const overallEcpm = avgCpm ?? 0;
  const ctrHighBand = Math.max(0.5, avgCtr * 1.1);
  const ctrLowBand = avgCtr > 0 ? avgCtr * 0.9 : 0;
  const ecpmHighBand = Math.max(0.1, overallEcpm * 1.1);
  const ecpmLowBand = overallEcpm > 0 ? overallEcpm * 0.9 : 0;

  const basePriceByProductId = new Map(adProducts.map((product) => [product.id, Number(product.basePrice)]));
  const campaignStatusOptions = ['ALL', ...Object.keys(AD_CAMPAIGN_STATUS_LABELS)];
  const productStatsMap = new Map<
    string,
    {
      productId: string;
      productCode: string;
      productName: string;
      placementType: string;
      campaigns: number;
      activeCampaigns: number;
      inventoryTightCampaigns: number;
      impressions: number;
      clicks: number;
      spend: number;
      basePrice: number | null;
    }
  >();

  for (const row of campaignStatsRows) {
    const key = row.campaign.adProduct.id;
    const prev = productStatsMap.get(key) ?? {
      productId: key,
      productCode: row.campaign.adProduct.code,
      productName: row.campaign.adProduct.name,
      placementType: row.campaign.adProduct.placementType,
      campaigns: 0,
      activeCampaigns: 0,
      inventoryTightCampaigns: 0,
      impressions: 0,
      clicks: 0,
      spend: 0,
      basePrice: basePriceByProductId.get(key) ?? null,
    };

    prev.campaigns += 1;
    if (row.campaign.status === 'ACTIVE') {
      prev.activeCampaigns += 1;
    }
    if (row.isInventoryTight) {
      prev.inventoryTightCampaigns += 1;
    }
    prev.impressions += row.impressions;
    prev.clicks += row.clicks;
    prev.spend += row.spend;
    productStatsMap.set(key, prev);
  }

  const productStats = Array.from(productStatsMap.values())
    .map((group) => {
      const ctr = group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0;
      const cpc = group.clicks > 0 ? group.spend / group.clicks : null;
      const cpm = group.impressions > 0 ? (group.spend / group.impressions) * 1000 : null;
      const ecpm = cpm ?? 0;
      const relativePerformance = overallEcpm > 0 ? (ecpm / overallEcpm) * 100 : 0;
      const meetsSampleSize = group.impressions >= MIN_IMPRESSIONS_FOR_PRICING_DECISION;
      const hasTightInventory = group.inventoryTightCampaigns > 0;
      const suggestion: 'INCREASE' | 'DECREASE' | 'HOLD' | 'INSUFFICIENT' =
        !meetsSampleSize
          ? 'INSUFFICIENT'
          : ctr >= ctrHighBand && ecpm >= ecpmHighBand && hasTightInventory
            ? 'INCREASE'
            : ctr <= ctrLowBand && ecpm <= ecpmLowBand
              ? 'DECREASE'
              : 'HOLD';
      const suggestedRate = suggestion === 'INCREASE' ? 0.05 : suggestion === 'DECREASE' ? -0.05 : 0;
      const simulatedBasePrice =
        group.basePrice != null ? Math.max(0, group.basePrice * (1 + suggestedRate)) : null;
      const suggestionReason =
        suggestion === 'INSUFFICIENT'
          ? `노출 ${formatCount(group.impressions)}회로 최소 표본 ${formatCount(MIN_IMPRESSIONS_FOR_PRICING_DECISION)}회 미달`
          : suggestion === 'INCREASE'
            ? `CTR ${formatPercent(ctr)}·eCPM ${formatCurrency(ecpm)}가 기준 이상이고 재고 부담(최대노출 근접)이 관측됨`
            : suggestion === 'DECREASE'
              ? `CTR ${formatPercent(ctr)}·eCPM ${formatCurrency(ecpm)}가 기준 대비 하회`
              : `성과가 기준 밴드(CTR ${formatPercent(ctrLowBand)}~${formatPercent(ctrHighBand)}, eCPM ${formatCurrency(ecpmLowBand)}~${formatCurrency(ecpmHighBand)}) 내`;

      return {
        ...group,
        ctr,
        cpc,
        cpm,
        ecpm,
        relativePerformance,
        suggestion,
        suggestedRate,
        simulatedBasePrice,
        suggestionReason,
      };
    })
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);

  const maxProductImpressions = productStats.reduce((max, row) => Math.max(max, row.impressions), 0);
  const maxProductCtr = productStats.reduce((max, row) => Math.max(max, row.ctr), 0);

  const dailyTrendMap = new Map<string, { impressions: number; clicks: number }>();
  for (const stat of filteredDailyStats) {
    const key = formatDateLocal(stat.date);
    const prev = dailyTrendMap.get(key) ?? { impressions: 0, clicks: 0 };
    dailyTrendMap.set(key, {
      impressions: prev.impressions + stat.impressions,
      clicks: prev.clicks + stat.clicks,
    });
  }
  const dailyTrend = Array.from(dailyTrendMap.entries())
    .map(([date, value]) => ({
      date,
      impressions: value.impressions,
      clicks: value.clicks,
      ctr: value.impressions > 0 ? (value.clicks / value.impressions) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weeklyTrendMap = new Map<string, { impressions: number; clicks: number }>();
  for (const stat of filteredDailyStats) {
    const weekStart = formatDateLocal(getWeekStart(stat.date));
    const prev = weeklyTrendMap.get(weekStart) ?? { impressions: 0, clicks: 0 };
    weeklyTrendMap.set(weekStart, {
      impressions: prev.impressions + stat.impressions,
      clicks: prev.clicks + stat.clicks,
    });
  }
  const weeklyTrend = Array.from(weeklyTrendMap.entries())
    .map(([weekStart, value]) => ({
      weekStart,
      impressions: value.impressions,
      clicks: value.clicks,
      ctr: value.impressions > 0 ? (value.clicks / value.impressions) * 100 : 0,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const comparableProducts = productStats.filter((row) => row.impressions > 0).sort((a, b) => b.ctr - a.ctr);
  const quartileSize = Math.max(1, Math.floor(comparableProducts.length * 0.25));
  const topQuartileProducts = comparableProducts.slice(0, quartileSize);
  const bottomQuartileProducts = comparableProducts.slice(-quartileSize);

  const latest7DayStart = toDateStartOfDay(addDays(today, -6));
  const latest30DayStart = toDateStartOfDay(addDays(today, -29));
  const recent7dStats = await prisma.adDailyStat.aggregate({
    _sum: { impressions: true, clicks: true },
    where: {
      campaignId: { in: filteredStatsCampaignIds.length > 0 ? filteredStatsCampaignIds : ['__none__'] },
      date: { gte: latest7DayStart, lte: toDateEndOfDay(today) },
    },
  });
  const recent30dStats = await prisma.adDailyStat.aggregate({
    _sum: { impressions: true, clicks: true },
    where: {
      campaignId: { in: filteredStatsCampaignIds.length > 0 ? filteredStatsCampaignIds : ['__none__'] },
      date: { gte: latest30DayStart, lte: toDateEndOfDay(today) },
    },
  });
  const recent7dImpressions = recent7dStats._sum.impressions ?? 0;
  const recent30dImpressions = recent30dStats._sum.impressions ?? 0;
  const recent7dClicks = recent7dStats._sum.clicks ?? 0;
  const recent30dClicks = recent30dStats._sum.clicks ?? 0;
  const recent7dCtr = recent7dImpressions > 0 ? (recent7dClicks / recent7dImpressions) * 100 : 0;
  const recent30dCtr = recent30dImpressions > 0 ? (recent30dClicks / recent30dImpressions) * 100 : 0;
  const ctrChange7dVs30d = recent30dCtr > 0 ? ((recent7dCtr - recent30dCtr) / recent30dCtr) * 100 : 0;

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
          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">캠페인 통계 필터</h2>
              <div className="text-xs text-[#777]">
                기준 기간: {statsStartDateInput} ~ {statsEndDateInput}
              </div>
            </div>
            <form method="get" action="/ads-manager/campaigns" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">기간</span>
                <select name="statsRange" defaultValue={selectedStatsRange} className={selectClass}>
                  <option value="today">오늘</option>
                  <option value="7d">최근 7일</option>
                  <option value="30d">최근 30일</option>
                  <option value="custom">직접 선택</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">시작일</span>
                <input type="date" name="statsStartDate" defaultValue={statsStartDateInput} className={inputClass} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">종료일</span>
                <input type="date" name="statsEndDate" defaultValue={statsEndDateInput} className={inputClass} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">캠페인 상태</span>
                <select name="statsStatus" defaultValue={statsStatus} className={selectClass}>
                  {campaignStatusOptions.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption === 'ALL'
                        ? '전체 등록 캠페인'
                        : AD_CAMPAIGN_STATUS_LABELS[statusOption as keyof typeof AD_CAMPAIGN_STATUS_LABELS]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">타겟 국가</span>
                <select name="statsCountryId" defaultValue={statsCountryId} className={selectClass}>
                  <option value="">전체</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[#555]">타겟 도시</span>
                <select name="statsCityId" defaultValue={statsCityId} className={selectClass}>
                  <option value="">전체</option>
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
                <span className="text-[#555]">광고 상품</span>
                <select name="statsProductId" defaultValue={statsProductId} className={selectClass}>
                  <option value="">전체</option>
                  {adProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      [{product.code}] {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm">
                <input type="checkbox" name="statsActiveOnly" value="1" defaultChecked={statsActiveOnly} />
                ACTIVE만 보기
              </label>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                <button type="submit" className={submitClass}>적용</button>
                <Link href="/ads-manager/campaigns" className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm hover:bg-[#fafafa]">
                  초기화
                </Link>
              </div>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <p className="text-xs text-[#777]">총 캠페인 수</p>
              <p className="mt-1 text-xl font-semibold">{formatCount(filteredStatsCampaigns.length)}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <p className="text-xs text-[#777]">총 노출</p>
              <p className="mt-1 text-xl font-semibold">{formatCount(totalImpressions)}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <p className="text-xs text-[#777]">총 클릭</p>
              <p className="mt-1 text-xl font-semibold">{formatCount(totalClicks)}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <p className="text-xs text-[#777]">평균 CTR</p>
              <p className="mt-1 text-xl font-semibold">{formatPercent(avgCtr)}</p>
              <p className="text-xs text-[#888]">7일 vs 30일: {formatPercent(ctrChange7dVs30d)}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <p className="text-xs text-[#777]">총 집행금액</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(totalSpend)}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <p className="text-xs text-[#777]">평균 CPC</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(avgCpc)}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <p className="text-xs text-[#777]">평균 CPM</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(avgCpm)}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <p className="text-xs text-[#777]">가격 판단 밴드</p>
              <p className="mt-1 text-sm text-[#555]">
                CTR {formatPercent(ctrLowBand)} ~ {formatPercent(ctrHighBand)}
              </p>
              <p className="text-sm text-[#555]">
                eCPM {formatCurrency(ecpmLowBand)} ~ {formatCurrency(ecpmHighBand)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">상품별 성과 비교</h2>
              <p className="text-xs text-[#777]">표본 최소 {formatCount(MIN_IMPRESSIONS_FOR_PRICING_DECISION)}회 미만은 가격 조정 제외</p>
            </div>
            {productStats.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#e8e8e8] bg-[#fafafa] px-3 py-4 text-sm text-[#888]">
                선택한 조건의 상품별 통계가 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f0f0f0] text-left text-xs text-[#777]">
                      <th className="px-2 py-2">상품</th>
                      <th className="px-2 py-2">노출/클릭</th>
                      <th className="px-2 py-2">CTR</th>
                      <th className="px-2 py-2">CPC</th>
                      <th className="px-2 py-2">CPM</th>
                      <th className="px-2 py-2">eCPM</th>
                      <th className="px-2 py-2">상대 성과</th>
                      <th className="px-2 py-2">가격 제안</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productStats.map((row) => {
                      const impressionBar = maxProductImpressions > 0 ? (row.impressions / maxProductImpressions) * 100 : 0;
                      const ctrBar = maxProductCtr > 0 ? (row.ctr / maxProductCtr) * 100 : 0;
                      const suggestionClass =
                        row.suggestion === 'INCREASE'
                          ? 'bg-green-50 text-green-700'
                          : row.suggestion === 'DECREASE'
                            ? 'bg-amber-50 text-amber-700'
                            : row.suggestion === 'INSUFFICIENT'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-blue-50 text-blue-700';

                      return (
                        <tr key={row.productId} className="border-b border-[#f5f5f5] align-top">
                          <td className="px-2 py-3">
                            <p className="font-medium text-[#222]">[{row.productCode}] {row.productName}</p>
                            <p className="text-xs text-[#888]">{AD_PLACEMENT_TYPE_LABELS[row.placementType as keyof typeof AD_PLACEMENT_TYPE_LABELS]}</p>
                            <p className="text-xs text-[#888]">캠페인 {formatCount(row.campaigns)}개 · ACTIVE {formatCount(row.activeCampaigns)}개</p>
                          </td>
                          <td className="px-2 py-3">
                            <p>{formatCount(row.impressions)} / {formatCount(row.clicks)}</p>
                            <div className="mt-1 h-1.5 rounded bg-[#f1f1f1]">
                              <div className="h-1.5 rounded bg-[#fee500]" style={{ width: `${impressionBar}%` }} />
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <p>{formatPercent(row.ctr)}</p>
                            <div className="mt-1 h-1.5 rounded bg-[#f1f1f1]">
                              <div className="h-1.5 rounded bg-[#3c1e1e]" style={{ width: `${ctrBar}%` }} />
                            </div>
                          </td>
                          <td className="px-2 py-3">{formatCurrency(row.cpc)}</td>
                          <td className="px-2 py-3">{formatCurrency(row.cpm)}</td>
                          <td className="px-2 py-3">{formatCurrency(row.ecpm)}</td>
                          <td className="px-2 py-3">{row.relativePerformance.toFixed(1)}%</td>
                          <td className="px-2 py-3">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${suggestionClass}`} title={row.suggestionReason}>
                              {PRICE_SUGGESTION_LABELS[row.suggestion]}
                            </span>
                            <p className="mt-1 text-xs text-[#777]" title={row.suggestionReason}>
                              시뮬레이션: {row.basePrice != null ? formatCurrency(row.basePrice) : '-'} → {formatCurrency(row.simulatedBasePrice)}
                            </p>
                            <p className="text-xs text-[#777]">승인: 상품 상세에서 basePrice 반영</p>
                            <Link href={`/ads-manager/products?productId=${row.productId}`} className="mt-1 inline-block text-xs underline text-[#666]">
                              시뮬레이션 확인/승인으로 이동
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm space-y-3">
              <h2 className="text-base font-semibold">CTR 추세 (일/주)</h2>
              <div>
                <p className="mb-2 text-xs font-medium text-[#666]">일 단위</p>
                <div className="space-y-1">
                  {dailyTrend.length === 0 ? (
                    <p className="text-sm text-[#888]">일 단위 데이터가 없습니다.</p>
                  ) : (
                    dailyTrend.slice(-12).map((point) => (
                      <div key={point.date} className="grid grid-cols-[84px_1fr_auto] items-center gap-2 text-xs">
                        <span className="text-[#777]">{point.date.slice(5)}</span>
                        <div className="h-1.5 rounded bg-[#f1f1f1]">
                          <div
                            className="h-1.5 rounded bg-[#3c1e1e]"
                            style={{ width: `${maxProductCtr > 0 ? Math.min(100, (point.ctr / Math.max(maxProductCtr, 0.01)) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-[#555]">{formatPercent(point.ctr)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-[#666]">주 단위</p>
                <div className="space-y-1">
                  {weeklyTrend.length === 0 ? (
                    <p className="text-sm text-[#888]">주 단위 데이터가 없습니다.</p>
                  ) : (
                    weeklyTrend.slice(-8).map((point) => (
                      <div key={point.weekStart} className="flex items-center justify-between rounded border border-[#f3f3f3] px-2 py-1 text-xs">
                        <span className="text-[#777]">{point.weekStart} 주</span>
                        <span className="text-[#555]">CTR {formatPercent(point.ctr)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm space-y-3">
              <h2 className="text-base font-semibold">성과 분포 (상/하위 25%)</h2>
              <div>
                <p className="mb-2 text-xs font-medium text-green-700">상위 25%</p>
                <div className="space-y-1">
                  {topQuartileProducts.length === 0 ? (
                    <p className="text-sm text-[#888]">상위 분포 데이터가 없습니다.</p>
                  ) : (
                    topQuartileProducts.map((row) => (
                      <div key={`top-${row.productId}`} className="rounded border border-green-100 bg-green-50 px-2 py-1 text-xs text-green-800">
                        [{row.productCode}] {row.productName} · CTR {formatPercent(row.ctr)} · eCPM {formatCurrency(row.ecpm)}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-amber-700">하위 25%</p>
                <div className="space-y-1">
                  {bottomQuartileProducts.length === 0 ? (
                    <p className="text-sm text-[#888]">하위 분포 데이터가 없습니다.</p>
                  ) : (
                    bottomQuartileProducts.map((row) => (
                      <div key={`bottom-${row.productId}`} className="rounded border border-amber-100 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        [{row.productCode}] {row.productName} · CTR {formatPercent(row.ctr)} · eCPM {formatCurrency(row.ecpm)}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-xs text-[#666]">
                가격 반영은 즉시 적용 대신 <strong>시뮬레이션 → 승인</strong> 순서로 진행하세요.
              </div>
            </div>
          </div>

          <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
              <span>새 캠페인 등록</span>
              <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
            </summary>
            <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
              <form id="campaign-create-form" action={createAdCampaignAction} className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">광고 콘텐츠 <span className="text-red-500">*</span></span>
                  <select name="adContentId" required className={selectClass}>
                    <option value="">콘텐츠 선택</option>
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
                  <span className="text-[#555]">광고주 제안 금액 (NZD, 선택)</span>
                  <input type="number" step="0.01" min="0" name="proposedAmount" className={inputClass} />
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
                <CampaignPricingLivePreview
                  formId="campaign-create-form"
                  adProducts={adProducts.map((product) => ({
                    id: product.id,
                    code: product.code,
                    name: product.name,
                    placementType: product.placementType,
                    billingUnit: product.billingUnit,
                    currency: product.currency,
                    basePrice: Number(product.basePrice),
                    isActive: product.isActive,
                  }))}
                  adGeoPricings={adGeoPricings.map((pricing) => ({
                    id: pricing.id,
                    cityId: pricing.cityId,
                    countryId: pricing.countryId,
                    multiplier: Number(pricing.multiplier),
                    isActive: pricing.isActive,
                    effectiveFrom: pricing.effectiveFrom?.toISOString() ?? null,
                    effectiveTo: pricing.effectiveTo?.toISOString() ?? null,
                  }))}
                />
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
                const proposedAmountText =
                  campaign.proposedAmount != null
                    ? `NZD ${Number(campaign.proposedAmount).toFixed(2)}`
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
                            {campaign.adContent?.title ?? `(제목 없음) — ${campaign.id.slice(0, 8)}`}
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
                          과금 상태 {AD_BILLING_STATUS_LABELS[campaign.billingStatus]} · 자동 계산 {estimatedAmountText} · 제안 {proposedAmountText} · 확정 {finalAmountText}
                        </p>
                        <p className="text-xs text-[#888]">content: {campaign.adContentId ?? '-'}{campaign.sourcedByUser ? ` · 영업: ${campaign.sourcedByUser.displayName}` : ''}</p>                        {(campaign.startAt || campaign.endAt) && (
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
              <form id="campaign-update-form" action={updateAdCampaignAction} className="grid gap-3 sm:grid-cols-2">
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
                  <span className="text-[#555]">광고주 제안 금액 (NZD, 선택)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="proposedAmount"
                    defaultValue={selectedCampaign.proposedAmount != null ? Number(selectedCampaign.proposedAmount).toString() : ''}
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
                    · 제안:{' '}
                    {selectedCampaign.proposedAmount != null
                      ? `NZD ${Number(selectedCampaign.proposedAmount).toFixed(2)}`
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
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">영업 담당 파트너 매니저</span>
                  <select
                    name="sourcedByUserId"
                    defaultValue={selectedCampaign.sourcedByUserId ?? ''}
                    className={selectClass}
                  >
                    <option value="">(미지정)</option>
                    {partnerManagers.map((pm) => (
                      <option key={pm.userId} value={pm.userId}>
                        {pm.user.displayName}
                      </option>
                    ))}
                  </select>
                  {selectedCampaign.sourcedByUser && (
                    <p className="text-xs text-[#777]">현재: {selectedCampaign.sourcedByUser.displayName}</p>
                  )}
                </label>
                {selectedCampaign.reviewNotes ? (
                  <div className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-[#555]">광고주 수정 요청 메모</span>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 whitespace-pre-wrap">
                      {selectedCampaign.reviewNotes}
                      {selectedCampaign.reviewedAt && (
                        <p className="mt-1 text-amber-600">
                          {new Date(selectedCampaign.reviewedAt).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
                <CampaignPricingLivePreview
                  formId="campaign-update-form"
                  adProducts={adProducts.map((product) => ({
                    id: product.id,
                    code: product.code,
                    name: product.name,
                    placementType: product.placementType,
                    billingUnit: product.billingUnit,
                    currency: product.currency,
                    basePrice: Number(product.basePrice),
                    isActive: product.isActive,
                  }))}
                  adGeoPricings={adGeoPricings.map((pricing) => ({
                    id: pricing.id,
                    cityId: pricing.cityId,
                    countryId: pricing.countryId,
                    multiplier: Number(pricing.multiplier),
                    isActive: pricing.isActive,
                    effectiveFrom: pricing.effectiveFrom?.toISOString() ?? null,
                    effectiveTo: pricing.effectiveTo?.toISOString() ?? null,
                  }))}
                  savedEstimatedAmount={selectedCampaign.estimatedAmount != null ? Number(selectedCampaign.estimatedAmount) : null}
                  savedProposedAmount={selectedCampaign.proposedAmount != null ? Number(selectedCampaign.proposedAmount) : null}
                />
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="캠페인 수정 저장" pendingLabel="저장 중..." className={submitClass} />
                </div>
              </form>
              <div className="mt-3 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3 text-xs text-[#666]">
                <p>
                  자동 견적 대비 조정:{' '}
                  {selectedCampaign.estimatedAmount != null && selectedCampaign.finalAmount != null
                    ? `NZD ${(Number(selectedCampaign.finalAmount) - Number(selectedCampaign.estimatedAmount)).toFixed(2)}`
                    : '-'}
                </p>
                <p>
                  확정자:{' '}
                  {selectedCampaign.priceConfirmedByUser?.displayName ??
                    selectedCampaign.priceConfirmedByUserId ??
                    '-'}
                </p>
                <p>
                  확정일:{' '}
                  {selectedCampaign.priceConfirmedAt
                    ? new Date(selectedCampaign.priceConfirmedAt).toLocaleDateString('ko-KR')
                    : '-'}
                </p>
                <p>조정 사유: {selectedCampaign.priceAdjustmentReason ?? '-'}</p>
              </div>
              <form action={confirmAdCampaignPricingAction} className="mt-3 grid gap-3 sm:grid-cols-2 border-t border-[#f0f0f0] pt-4">
                <input type="hidden" name="id" value={selectedCampaign.id} />
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">확정 금액 (NZD) <span className="text-red-500">*</span></span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="finalAmount"
                    required
                    defaultValue={selectedCampaign.finalAmount != null ? Number(selectedCampaign.finalAmount).toString() : ''}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[#555]">가격 조정 사유</span>
                  <textarea
                    name="priceAdjustmentReason"
                    rows={2}
                    defaultValue={selectedCampaign.priceAdjustmentReason ?? ''}
                    className={inputClass}
                  />
                </label>
                <div className="sm:col-span-2">
                  <FormSubmitButton idleLabel="확정 금액 저장" pendingLabel="저장 중..." className={submitClass} />
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
              <div className="space-y-2 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3 text-xs text-[#666]">
                <p className="font-semibold text-[#444]">제안 예산 대비 캠페인 금액 연결</p>
                <p>
                  제안 예산:{' '}
                  {selectedProposal.requestedBudget != null
                    ? `NZD ${Number(selectedProposal.requestedBudget).toFixed(2)}`
                    : '-'}
                </p>
                {selectedProposalCampaigns.length === 0 ? (
                  <p>해당 광고주에 연결된 캠페인이 아직 없습니다.</p>
                ) : (
                  <ul className="space-y-1">
                    {selectedProposalCampaigns.map((campaign) => (
                      <li key={campaign.id} className="rounded border border-[#ececec] bg-white px-2 py-1">
                        {campaign.adContent?.title ?? campaign.id.slice(0, 8)} · 견적{' '}
                        {campaign.estimatedAmount != null
                          ? `NZD ${Number(campaign.estimatedAmount).toFixed(2)}`
                          : '-'}{' '}
                        · 확정{' '}
                        {campaign.finalAmount != null
                          ? `NZD ${Number(campaign.finalAmount).toFixed(2)}`
                          : '미확정'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
              <div className="space-y-1">
                <h2 className="font-semibold">지역 가중치 설정 (AdGeoPricing)</h2>
                <p className="text-xs text-[#666]">
                  국가 단위(도시 미선택) 캠페인은 국가별 설정이 없으면 기본 multiplier 1.5를 사용합니다.
                </p>
              </div>
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
                  defaultValue={selectedGeoPricing ? Number(selectedGeoPricing.multiplier) : 1.5}
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
