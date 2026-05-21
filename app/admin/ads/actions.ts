'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type {
  AdBillingStatus,
  AdBillingUnit,
  AdCampaignStatus,
  AdContentStatus,
  AdPlacementType,
  AdPricingModel,
  AdProposalStatus,
  Prisma,
} from '@prisma/client';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  buildPricingSnapshot,
  calculateEstimatedAmount,
  getBillingUnitForPricingModel,
  resolveGeoMultiplier,
  resolvePlacementMultiplier,
} from '@/lib/ads/pricing';
import {
  canAccessAdsManagerSection,
  canCreateAdProposal,
  canEditAdProposal,
  canManageAdContent,
} from '@/lib/permissions';

const ADS_MANAGER_SECTION_PATH = {
  campaigns: '/ads-manager/campaigns',
  products: '/ads-manager/products',
  proposals: '/ads-manager/proposals',
  contents: '/ads-manager/contents',
  rules: '/ads-manager/rules',
} as const;

type AdsManagerSection = keyof typeof ADS_MANAGER_SECTION_PATH;

function redirectAdsManager(section: AdsManagerSection, query?: Record<string, string>): never {
  const basePath = ADS_MANAGER_SECTION_PATH[section];
  if (!query || Object.keys(query).length === 0) {
    redirect(basePath);
  }

  redirect(`${basePath}?${new URLSearchParams(query).toString()}`);
}

function normalizeText(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function requireAdsUser() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdsManagerSection(user)) {
    redirect('/posts');
  }

  return user;
}

function parseNullableDateTime(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNullableInt(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeAdPricingModel(value: string): AdPricingModel {
  return value === 'CPM' ? 'CPM' : 'FIXED';
}

const VALID_BILLING_UNITS: AdBillingUnit[] = ['DAY', 'WEEK', 'MONTH', 'IMPRESSION_1000'];

function normalizeAdBillingUnit(value: string, pricingModel: AdPricingModel): AdBillingUnit {
  if ((VALID_BILLING_UNITS as string[]).includes(value)) {
    return value as AdBillingUnit;
  }

  return getBillingUnitForPricingModel(pricingModel);
}

async function logAdAudit(
  tx: Prisma.TransactionClient,
  data: {
    actorId?: string | null;
    advertiserId?: string | null;
    proposalId?: string | null;
    adContentId?: string | null;
    campaignId?: string | null;
    actionType: string;
    message?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await tx.adAuditLog.create({
    data: {
      actorId: data.actorId ?? null,
      advertiserId: data.advertiserId ?? null,
      proposalId: data.proposalId ?? null,
      adContentId: data.adContentId ?? null,
      campaignId: data.campaignId ?? null,
      actionType: data.actionType,
      message: data.message ?? null,
      metadata: data.metadata,
    },
  });
}

// ─── AdProduct ────────────────────────────────────────────────────────────────

export async function createAdProductAction(formData: FormData) {
  await requireAdsUser();

  const code = normalizeText(formData.get('code'));
  const name = normalizeText(formData.get('name'));
  const placementType = normalizeText(formData.get('placementType')) as AdPlacementType;
  const size = normalizeText(formData.get('size')) || 'M';
  const layout = normalizeText(formData.get('layout')) || 'THUMBNAIL';
  const pricingModel = normalizeAdPricingModel(normalizeText(formData.get('pricingModel')) || 'FIXED');
  const billingUnit = normalizeAdBillingUnit(normalizeText(formData.get('billingUnit')), pricingModel);
  const currency = normalizeText(formData.get('currency')) || 'NZD';
  const basePrice = parseFloat(normalizeText(formData.get('basePrice')) || '0');
  const description = normalizeText(formData.get('description')) || null;
  const sortOrder = parseInt(normalizeText(formData.get('sortOrder')) || '0', 10);

  if (!code || !name || !placementType) {
    redirectAdsManager('products', { error: '코드, 이름, 노출 위치는 필수입니다.' });
  }

  await prisma.adProduct.create({
    data: {
      code,
      name,
      placementType,
      size: size as 'S' | 'M' | 'L',
      layout: layout as 'TEXT' | 'THUMBNAIL' | 'IMAGE' | 'FEATURED',
      pricingModel,
      billingUnit,
      currency,
      basePrice,
      description,
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
    },
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.products);
  redirectAdsManager('products');
}

export async function updateAdProductAction(formData: FormData) {
  await requireAdsUser();

  const id = normalizeText(formData.get('id'));
  const name = normalizeText(formData.get('name'));
  const placementType = normalizeText(formData.get('placementType')) as AdPlacementType;
  const size = normalizeText(formData.get('size')) || 'M';
  const layout = normalizeText(formData.get('layout')) || 'THUMBNAIL';
  const pricingModel = normalizeAdPricingModel(normalizeText(formData.get('pricingModel')) || 'FIXED');
  const billingUnit = normalizeAdBillingUnit(normalizeText(formData.get('billingUnit')), pricingModel);
  const currency = normalizeText(formData.get('currency')) || 'NZD';
  const basePrice = parseFloat(normalizeText(formData.get('basePrice')) || '0');
  const description = normalizeText(formData.get('description')) || null;
  const sortOrder = parseInt(normalizeText(formData.get('sortOrder')) || '0', 10);

  if (!id || !name || !placementType) {
    redirectAdsManager('products', { error: '상품 ID, 이름, 노출 위치는 필수입니다.' });
  }

  await prisma.adProduct.update({
    where: { id },
    data: {
      name,
      placementType,
      size: size as 'S' | 'M' | 'L',
      layout: layout as 'TEXT' | 'THUMBNAIL' | 'IMAGE' | 'FEATURED',
      pricingModel,
      billingUnit,
      currency,
      basePrice,
      description,
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
    },
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.products);
  redirectAdsManager('products');
}

export async function toggleAdProductActiveAction(formData: FormData) {
  await requireAdsUser();

  const id = normalizeText(formData.get('id'));
  if (!id) {
    redirectAdsManager('products', { error: '상품 ID가 없습니다.' });
  }

  const product = await prisma.adProduct.findUnique({ where: { id }, select: { isActive: true } });
  if (!product) {
    redirectAdsManager('products', { error: '광고 상품을 찾을 수 없습니다.' });
  }

  await prisma.adProduct.update({ where: { id }, data: { isActive: !product.isActive } });

  revalidatePath(ADS_MANAGER_SECTION_PATH.products);
  redirectAdsManager('products');
}

// ─── AdProposal ────────────────────────────────────────────────────────────────

export async function createAdProposalAction(formData: FormData) {
  const currentUser = await requireAdsUser();

  const advertiserId = normalizeText(formData.get('advertiserId'));
  const title = normalizeText(formData.get('title'));
  const body = normalizeText(formData.get('body'));
  const requestedStartAt = parseNullableDateTime(normalizeText(formData.get('requestedStartAt')) || null);
  const requestedEndAt = parseNullableDateTime(normalizeText(formData.get('requestedEndAt')) || null);
  const requestedBudgetRaw = normalizeText(formData.get('requestedBudget'));
  const requestedLandingUrl = normalizeText(formData.get('requestedLandingUrl')) || null;
  const advertisedProductCode = normalizeText(formData.get('advertisedProductCode')) || null;

  if (!advertiserId || !title || !body) {
    redirectAdsManager('proposals', { error: '광고주, 제목, 내용은 필수입니다.' });
  }

  const allowed = await canCreateAdProposal(currentUser, advertiserId);
  if (!allowed) {
    redirectAdsManager('proposals', { error: '제안을 등록할 권한이 없습니다.' });
  }

  const requestedBudget = requestedBudgetRaw ? Number(requestedBudgetRaw) : null;

  const proposal = await prisma.adProposal.create({
    data: {
      advertiserId,
      submittedByUserId: currentUser.id,
      status: 'SUBMITTED',
      title,
      body,
      requestedStartAt,
      requestedEndAt,
      requestedBudget,
      requestedLandingUrl,
      advertisedProductCode,
    },
    select: { id: true },
  });

  await prisma.adAuditLog.create({
    data: {
      actorId: currentUser.id,
      advertiserId,
      proposalId: proposal.id,
      actionType: 'PROPOSAL_SUBMITTED',
      message: '광고 제안이 등록되었습니다.',
    },
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.proposals);
  redirectAdsManager('proposals', { success: '광고 제안이 등록되었습니다.' });
}

export async function updateAdProposalStatusAction(formData: FormData) {
  const currentUser = await requireAdsUser();

  const id = normalizeText(formData.get('id'));
  const status = normalizeText(formData.get('status')) as AdProposalStatus;
  const negotiationNotes = normalizeText(formData.get('negotiationNotes')) || null;
  const rejectedReason = normalizeText(formData.get('rejectedReason')) || null;

  if (!id || !status) {
    redirectAdsManager('proposals', { error: '제안 ID와 상태는 필수입니다.' });
  }

  const validStatuses: AdProposalStatus[] = [
    'SUBMITTED',
    'IN_NEGOTIATION',
    'NEGOTIATED',
    'REJECTED',
  ];
  if (!validStatuses.includes(status)) {
    redirectAdsManager('proposals', { error: '유효하지 않은 제안 상태입니다.' });
  }

  const proposal = await prisma.adProposal.findUnique({
    where: { id },
    select: {
      id: true,
      advertiserId: true,
      status: true,
      submittedByUserId: true,
    },
  });

  if (!proposal) {
    redirectAdsManager('proposals', { error: '광고 제안을 찾을 수 없습니다.' });
  }

  const isManager = canManageAdContent(currentUser);
  if (!isManager) {
    const allowed = await canEditAdProposal(currentUser, proposal);
    if (!allowed) {
      redirectAdsManager('proposals', { error: '제안을 수정할 권한이 없습니다.' });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.adProposal.update({
      where: { id },
      data: {
        status,
        negotiationNotes,
        rejectedReason,
        negotiatedByUserId:
          status === 'IN_NEGOTIATION' || status === 'NEGOTIATED' || status === 'REJECTED'
            ? currentUser.id
            : null,
      },
    });

    await logAdAudit(tx, {
      actorId: currentUser.id,
      advertiserId: proposal.advertiserId,
      proposalId: proposal.id,
      actionType: 'PROPOSAL_STATUS_CHANGED',
      message: `광고 제안 상태가 ${status}로 변경되었습니다.`,
      metadata: { from: proposal.status, to: status },
    });
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.proposals);
  redirectAdsManager('proposals', { success: '제안 상태가 변경되었습니다.' });
}

// ─── AdContent ─────────────────────────────────────────────────────────────────

export async function createAdContentAction(formData: FormData) {
  const currentUser = await requireAdsUser();

  if (!canManageAdContent(currentUser)) {
    redirectAdsManager('contents', { error: '광고 콘텐츠를 생성할 권한이 없습니다.' });
  }

  const proposalId = normalizeText(formData.get('proposalId')) || null;
  let advertiserId = normalizeText(formData.get('advertiserId')) || null;
  const title = normalizeText(formData.get('title')) || null;
  const body = normalizeText(formData.get('body'));
  const thumbnailUrl = normalizeText(formData.get('thumbnailUrl')) || null;
  const landingUrl = normalizeText(formData.get('landingUrl')) || null;
  const displayName = normalizeText(formData.get('displayName')) || null;
  const categoryName = normalizeText(formData.get('categoryName')) || null;
  const cityName = normalizeText(formData.get('cityName')) || null;

  if (!body) {
    redirectAdsManager('contents', { error: '콘텐츠 본문은 필수입니다.' });
  }

  if (proposalId) {
    const proposal = await prisma.adProposal.findUnique({
      where: { id: proposalId },
      select: { advertiserId: true },
    });

    if (!proposal) {
      redirectAdsManager('contents', { error: '연결할 제안을 찾을 수 없습니다.' });
    }

    advertiserId = proposal.advertiserId;
  }

  if (!advertiserId) {
    redirectAdsManager('contents', { error: '광고주를 선택해 주세요.' });
  }

  const content = await prisma.adContent.create({
    data: {
      advertiserId,
      proposalId,
      createdByUserId: currentUser.id,
      status: 'DRAFT',
      title,
      body,
      thumbnailUrl,
      landingUrl,
      displayName,
      categoryName,
      cityName,
    },
    select: { id: true },
  });

  await prisma.adAuditLog.create({
    data: {
      actorId: currentUser.id,
      advertiserId,
      proposalId,
      adContentId: content.id,
      actionType: 'CONTENT_CREATED',
      message: '광고 콘텐츠가 생성되었습니다.',
    },
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.contents);
  redirectAdsManager('contents', { success: '광고 콘텐츠가 생성되었습니다.' });
}

export async function updateAdContentAction(formData: FormData) {
  const currentUser = await requireAdsUser();

  if (!canManageAdContent(currentUser)) {
    redirectAdsManager('contents', { error: '광고 콘텐츠를 수정할 권한이 없습니다.' });
  }

  const id = normalizeText(formData.get('id'));
  const title = normalizeText(formData.get('title')) || null;
  const body = normalizeText(formData.get('body'));
  const thumbnailUrl = normalizeText(formData.get('thumbnailUrl')) || null;
  const landingUrl = normalizeText(formData.get('landingUrl')) || null;
  const displayName = normalizeText(formData.get('displayName')) || null;
  const categoryName = normalizeText(formData.get('categoryName')) || null;
  const cityName = normalizeText(formData.get('cityName')) || null;
  const reviewNotes = normalizeText(formData.get('reviewNotes')) || null;
  const proposalId = normalizeText(formData.get('proposalId')) || null;

  if (!id || !body) {
    redirectAdsManager('contents', { error: '콘텐츠 ID와 본문은 필수입니다.' });
  }

  const existing = await prisma.adContent.findUnique({
    where: { id },
    select: { id: true, advertiserId: true },
  });

  if (!existing) {
    redirectAdsManager('contents', { error: '광고 콘텐츠를 찾을 수 없습니다.' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.adContent.update({
      where: { id },
      data: {
        title,
        body,
        thumbnailUrl,
        landingUrl,
        displayName,
        categoryName,
        cityName,
        reviewNotes,
        proposalId,
      },
    });

    await logAdAudit(tx, {
      actorId: currentUser.id,
      advertiserId: existing.advertiserId,
      adContentId: id,
      actionType: 'CONTENT_UPDATED',
      message: '광고 콘텐츠가 수정되었습니다.',
    });
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.contents);
  redirectAdsManager('contents', { success: '광고 콘텐츠를 수정했습니다.' });
}

export async function updateAdContentStatusAction(formData: FormData) {
  const currentUser = await requireAdsUser();

  if (!canManageAdContent(currentUser)) {
    redirectAdsManager('contents', { error: '광고 콘텐츠 상태를 변경할 권한이 없습니다.' });
  }

  const id = normalizeText(formData.get('id'));
  const status = normalizeText(formData.get('status')) as AdContentStatus;
  const reviewNotes = normalizeText(formData.get('reviewNotes')) || null;

  if (!id || !status) {
    redirectAdsManager('contents', { error: '콘텐츠 ID와 상태는 필수입니다.' });
  }

  const validStatuses: AdContentStatus[] = ['DRAFT', 'REVIEW', 'APPROVED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    redirectAdsManager('contents', { error: '유효하지 않은 콘텐츠 상태입니다.' });
  }

  const existing = await prisma.adContent.findUnique({
    where: { id },
    select: { id: true, advertiserId: true, status: true },
  });

  if (!existing) {
    redirectAdsManager('contents', { error: '광고 콘텐츠를 찾을 수 없습니다.' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.adContent.update({
      where: { id },
      data: {
        status,
        reviewNotes,
        reviewedByUserId: status === 'APPROVED' || status === 'REJECTED' ? currentUser.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        rejectedAt: status === 'REJECTED' ? new Date() : null,
      },
    });

    await logAdAudit(tx, {
      actorId: currentUser.id,
      advertiserId: existing.advertiserId,
      adContentId: id,
      actionType: 'CONTENT_STATUS_CHANGED',
      message: `광고 콘텐츠 상태가 ${status}로 변경되었습니다.`,
      metadata: { from: existing.status, to: status },
    });
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.contents);
  redirectAdsManager('contents', { success: '콘텐츠 상태가 변경되었습니다.' });
}

// ─── AdCampaign ───────────────────────────────────────────────────────────────

export async function createAdCampaignAction(formData: FormData) {
  const currentUser = await requireAdsUser();

  const adContentId = normalizeText(formData.get('adContentId')) || null;
  const legacyPostId = normalizeText(formData.get('postId')) || null;
  const adProductId = normalizeText(formData.get('adProductId'));
  const priority = parseInt(normalizeText(formData.get('priority')) || '0', 10);
  const startAt = parseNullableDateTime(normalizeText(formData.get('startAt')) || null);
  const endAt = parseNullableDateTime(normalizeText(formData.get('endAt')) || null);
  const maxImpressions = normalizeText(formData.get('maxImpressions'));
  const maxImpressionsValue = parseNullableInt(maxImpressions);
  const targetCountryId = normalizeText(formData.get('targetCountryId')) || null;
  const targetCityId = normalizeText(formData.get('targetCityId')) || null;
  const landingUrl = normalizeText(formData.get('landingUrl')) || null;
  const notes = normalizeText(formData.get('notes')) || null;

  if (!adProductId || (!adContentId && !legacyPostId)) {
    redirectAdsManager('campaigns', { error: '광고 콘텐츠 ID(또는 legacy 게시글 ID)와 광고 상품은 필수입니다.' });
  }

  const adProduct = await prisma.adProduct.findUnique({
    where: { id: adProductId },
    select: {
      id: true,
      placementType: true,
      pricingModel: true,
      billingUnit: true,
      currency: true,
      basePrice: true,
    },
  });

  if (!adProduct) {
    redirectAdsManager('campaigns', { error: '광고 상품을 찾을 수 없습니다.' });
  }

  let advertiserId: string | null = null;

  if (adContentId) {
    const adContent = await prisma.adContent.findUnique({
      where: { id: adContentId },
      select: { id: true, status: true, advertiserId: true },
    });

    if (!adContent) {
      redirectAdsManager('campaigns', { error: '광고 콘텐츠를 찾을 수 없습니다.' });
    }

    if (adContent.status !== 'APPROVED') {
      redirectAdsManager('campaigns', { error: '승인된 광고 콘텐츠만 캠페인에 연결할 수 있습니다.' });
    }

    advertiserId = adContent.advertiserId;
  }

  if (legacyPostId) {
    const post = await prisma.post.findUnique({
      where: { id: legacyPostId },
      select: { id: true, category: { select: { type: true } } },
    });

    if (!post) {
      redirectAdsManager('campaigns', { error: 'legacy 게시글을 찾을 수 없습니다.' });
    }

    if (post.category.type !== 'ADVERTISEMENT') {
      redirectAdsManager('campaigns', {
        error: 'legacy 게시글은 광고 카테고리만 연결 가능합니다.',
      });
    }
  }

  const pricingAt = startAt ?? new Date();
  const geoMultiplier = await resolveGeoMultiplier(prisma, {
    targetCityId,
    targetCountryId,
    at: pricingAt,
  });
  const placementMultiplier = await resolvePlacementMultiplier(prisma, {
    placementType: adProduct.placementType,
    at: pricingAt,
  });
  const basePrice = Number(adProduct.basePrice);
  const billingUnit = getBillingUnitForPricingModel(adProduct.pricingModel);
  const estimated = calculateEstimatedAmount({
    pricingModel: adProduct.pricingModel,
    basePrice,
    geoMultiplier: geoMultiplier.multiplier,
    placementMultiplier: placementMultiplier.multiplier,
    startAt,
    endAt,
    impressions: maxImpressionsValue ?? 0,
  });
  const pricingSnapshot = buildPricingSnapshot({
    pricingModel: adProduct.pricingModel,
    billingUnit,
    currency: adProduct.currency,
    basePrice,
    geoMultiplier,
    placementMultiplier,
    startAt,
    endAt,
    maxImpressions: maxImpressionsValue,
    estimatedAmount: estimated.amount,
    billableDays: estimated.billableDays,
  });

  const campaign = await prisma.adCampaign.create({
    data: {
      advertiserId,
      adContentId,
      postId: legacyPostId,
      adProductId,
      status: 'DRAFT',
      priority: Number.isNaN(priority) ? 0 : priority,
      startAt,
      endAt,
      maxImpressions: maxImpressionsValue,
      targetCountryId,
      targetCityId,
      estimatedAmount: estimated.amount,
      billingStatus: 'ESTIMATED',
      pricingSnapshot,
      landingUrl,
      notes,
    },
    select: { id: true },
  });

  await prisma.adAuditLog.create({
    data: {
      actorId: currentUser.id,
      advertiserId,
      adContentId,
      campaignId: campaign.id,
      actionType: 'CAMPAIGN_CREATED',
      message: '광고 캠페인이 생성되었습니다.',
      metadata: {
        legacyPostId,
        pricingModel: adProduct.pricingModel,
        billingUnit,
        currency: adProduct.currency,
        basePrice,
        geoMultiplier: geoMultiplier.multiplier,
        placementMultiplier: placementMultiplier.multiplier,
        billableDays: estimated.billableDays,
        estimatedAmount: estimated.amount,
      },
    },
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.campaigns);
  redirectAdsManager('campaigns');
}

export async function updateAdCampaignStatusAction(formData: FormData) {
  const currentUser = await requireAdsUser();

  const id = normalizeText(formData.get('id'));
  const status = normalizeText(formData.get('status')) as AdCampaignStatus;

  if (!id || !status) {
    redirectAdsManager('campaigns', { error: '캠페인 ID와 상태는 필수입니다.' });
  }

  const validStatuses: AdCampaignStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    redirectAdsManager('campaigns', { error: '유효하지 않은 캠페인 상태입니다.' });
  }

  const existing = await prisma.adCampaign.findUnique({
    where: { id },
    select: { status: true, advertiserId: true, adContentId: true },
  });

  if (!existing) {
    redirectAdsManager('campaigns', { error: '캠페인을 찾을 수 없습니다.' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.adCampaign.update({ where: { id }, data: { status } });

    await logAdAudit(tx, {
      actorId: currentUser.id,
      advertiserId: existing.advertiserId,
      adContentId: existing.adContentId,
      campaignId: id,
      actionType: 'CAMPAIGN_STATUS_CHANGED',
      message: `캠페인 상태가 ${status}로 변경되었습니다.`,
      metadata: { from: existing.status, to: status },
    });
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.campaigns);
  redirectAdsManager('campaigns');
}

export async function updateAdCampaignAction(formData: FormData) {
  const currentUser = await requireAdsUser();

  const id = normalizeText(formData.get('id'));
  const priority = parseInt(normalizeText(formData.get('priority')) || '0', 10);
  const startAt = parseNullableDateTime(normalizeText(formData.get('startAt')) || null);
  const endAt = parseNullableDateTime(normalizeText(formData.get('endAt')) || null);
  const maxImpressions = normalizeText(formData.get('maxImpressions'));
  const maxImpressionsValue = parseNullableInt(maxImpressions);
  const targetCountryId = normalizeText(formData.get('targetCountryId')) || null;
  const targetCityId = normalizeText(formData.get('targetCityId')) || null;
  const landingUrl = normalizeText(formData.get('landingUrl')) || null;
  const notes = normalizeText(formData.get('notes')) || null;

  if (!id) {
    redirectAdsManager('campaigns', { error: '캠페인 ID가 없습니다.' });
  }

  const existing = await prisma.adCampaign.findUnique({
    where: { id },
    select: {
      advertiserId: true,
      adContentId: true,
      billingStatus: true,
      adProduct: {
        select: {
          pricingModel: true,
          placementType: true,
          basePrice: true,
          currency: true,
        },
      },
    },
  });

  if (!existing) {
    redirectAdsManager('campaigns', { error: '캠페인을 찾을 수 없습니다.' });
  }

  const pricingAt = startAt ?? new Date();
  const geoMultiplier = await resolveGeoMultiplier(prisma, {
    targetCityId,
    targetCountryId,
    at: pricingAt,
  });
  const placementMultiplier = await resolvePlacementMultiplier(prisma, {
    placementType: existing.adProduct.placementType,
    at: pricingAt,
  });
  const basePrice = Number(existing.adProduct.basePrice);
  const billingUnit = getBillingUnitForPricingModel(existing.adProduct.pricingModel);
  const estimated = calculateEstimatedAmount({
    pricingModel: existing.adProduct.pricingModel,
    basePrice,
    geoMultiplier: geoMultiplier.multiplier,
    placementMultiplier: placementMultiplier.multiplier,
    startAt,
    endAt,
    impressions: maxImpressionsValue ?? 0,
  });
  const pricingSnapshot = buildPricingSnapshot({
    pricingModel: existing.adProduct.pricingModel,
    billingUnit,
    currency: existing.adProduct.currency,
    basePrice,
    geoMultiplier,
    placementMultiplier,
    startAt,
    endAt,
    maxImpressions: maxImpressionsValue,
    estimatedAmount: estimated.amount,
    billableDays: estimated.billableDays,
  });
  const nextBillingStatus: AdBillingStatus =
    existing.billingStatus === 'DRAFT' ? 'ESTIMATED' : existing.billingStatus;

  await prisma.$transaction(async (tx) => {
    await tx.adCampaign.update({
      where: { id },
      data: {
        priority: Number.isNaN(priority) ? 0 : priority,
        startAt,
        endAt,
        maxImpressions: maxImpressionsValue,
        targetCountryId,
        targetCityId,
        estimatedAmount: estimated.amount,
        billingStatus: nextBillingStatus,
        pricingSnapshot,
        landingUrl,
        notes,
      },
    });

    await logAdAudit(tx, {
      actorId: currentUser.id,
      advertiserId: existing.advertiserId,
      adContentId: existing.adContentId,
      campaignId: id,
      actionType: 'CAMPAIGN_UPDATED',
      message: '캠페인 설정이 수정되었습니다.',
      metadata: {
        pricingModel: existing.adProduct.pricingModel,
        billingUnit,
        currency: existing.adProduct.currency,
        basePrice,
        geoMultiplier: geoMultiplier.multiplier,
        placementMultiplier: placementMultiplier.multiplier,
        billableDays: estimated.billableDays,
        estimatedAmount: estimated.amount,
      },
    });
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.campaigns);
  redirectAdsManager('campaigns');
}

// ─── AdPlacementRule ──────────────────────────────────────────────────────────

export async function upsertAdPlacementRuleAction(formData: FormData) {
  await requireAdsUser();

  const placementType = normalizeText(formData.get('placementType')) as AdPlacementType;
  const insertAfter = parseInt(normalizeText(formData.get('insertAfter')) || '5', 10);
  const repeatInterval = parseInt(normalizeText(formData.get('repeatInterval')) || '10', 10);
  const maxPerPage = parseInt(normalizeText(formData.get('maxPerPage')) || '2', 10);

  if (!placementType) {
    redirectAdsManager('rules', { error: '노출 위치는 필수입니다.' });
  }

  await prisma.adPlacementRule.upsert({
    where: { placementType },
    create: {
      placementType,
      insertAfter: Number.isNaN(insertAfter) ? 5 : insertAfter,
      repeatInterval: Number.isNaN(repeatInterval) ? 10 : repeatInterval,
      maxPerPage: Number.isNaN(maxPerPage) ? 2 : maxPerPage,
      isActive: true,
    },
    update: {
      insertAfter: Number.isNaN(insertAfter) ? 5 : insertAfter,
      repeatInterval: Number.isNaN(repeatInterval) ? 10 : repeatInterval,
      maxPerPage: Number.isNaN(maxPerPage) ? 2 : maxPerPage,
    },
  });

  revalidatePath(ADS_MANAGER_SECTION_PATH.rules);
  redirectAdsManager('rules', { success: '노출 규칙이 저장되었습니다.' });
}

// ─── Pricing Settings ─────────────────────────────────────────────────────────

function parseCheckboxBoolean(value: FormDataEntryValue | null): boolean {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
}

export async function upsertAdGeoPricingAction(formData: FormData) {
  await requireAdsUser();

  const id = normalizeText(formData.get('id'));
  const countryId = normalizeText(formData.get('countryId')) || null;
  const cityId = normalizeText(formData.get('cityId')) || null;
  const multiplierRaw = normalizeText(formData.get('multiplier'));
  const effectiveFrom = parseNullableDateTime(normalizeText(formData.get('effectiveFrom')) || null);
  const effectiveTo = parseNullableDateTime(normalizeText(formData.get('effectiveTo')) || null);
  const isActive = parseCheckboxBoolean(formData.get('isActive'));

  if (!countryId && !cityId) {
    redirectAdsManager('rules', { error: '국가 또는 도시를 선택해 주세요.' });
  }

  const multiplier = Number(multiplierRaw);
  if (!multiplierRaw || Number.isNaN(multiplier) || multiplier <= 0) {
    redirectAdsManager('rules', { error: '유효한 지역 가중치(multiplier)를 입력해 주세요.' });
  }

  if (effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom) {
    redirectAdsManager('rules', { error: '종료 시각은 시작 시각보다 늦어야 합니다.' });
  }

  if (id) {
    await prisma.adGeoPricing.update({
      where: { id },
      data: {
        countryId,
        cityId,
        multiplier,
        effectiveFrom,
        effectiveTo,
        isActive,
      },
    });
  } else {
    await prisma.adGeoPricing.create({
      data: {
        countryId,
        cityId,
        multiplier,
        effectiveFrom,
        effectiveTo,
        isActive,
      },
    });
  }

  revalidatePath(ADS_MANAGER_SECTION_PATH.rules);
  redirectAdsManager('rules', { success: '지역 가중치 설정이 저장되었습니다.' });
}

export async function upsertAdPlacementPricingAction(formData: FormData) {
  await requireAdsUser();

  const id = normalizeText(formData.get('id'));
  const placementType = normalizeText(formData.get('placementType')) as AdPlacementType;
  const multiplierRaw = normalizeText(formData.get('multiplier'));
  const effectiveFrom = parseNullableDateTime(normalizeText(formData.get('effectiveFrom')) || null);
  const effectiveTo = parseNullableDateTime(normalizeText(formData.get('effectiveTo')) || null);
  const isActive = parseCheckboxBoolean(formData.get('isActive'));

  if (!placementType) {
    redirectAdsManager('rules', { error: '노출 위치를 선택해 주세요.' });
  }

  const multiplier = Number(multiplierRaw);
  if (!multiplierRaw || Number.isNaN(multiplier) || multiplier <= 0) {
    redirectAdsManager('rules', { error: '유효한 노출 위치 가중치(multiplier)를 입력해 주세요.' });
  }

  if (effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom) {
    redirectAdsManager('rules', { error: '종료 시각은 시작 시각보다 늦어야 합니다.' });
  }

  if (id) {
    await prisma.adPlacementPricing.update({
      where: { id },
      data: {
        placementType,
        multiplier,
        effectiveFrom,
        effectiveTo,
        isActive,
      },
    });
  } else {
    await prisma.adPlacementPricing.create({
      data: {
        placementType,
        multiplier,
        effectiveFrom,
        effectiveTo,
        isActive,
      },
    });
  }

  revalidatePath(ADS_MANAGER_SECTION_PATH.rules);
  redirectAdsManager('rules', { success: '노출 위치 가중치 설정이 저장되었습니다.' });
}
