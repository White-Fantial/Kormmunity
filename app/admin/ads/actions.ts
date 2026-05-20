'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { AdCampaignStatus, AdPlacementType } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessAdsManager } from '@/lib/permissions';

const ADS_CAMPAIGNS_PATH = '/ads-manager/campaigns';
const ADS_PRODUCTS_PATH = '/ads-manager/products';
const ADS_RULES_PATH = '/ads-manager/rules';

function normalizeText(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function requireAdsManagerUser() {
  return getCurrentUser().then((user) => {
    if (!user || !canAccessAdsManager(user)) {
      redirect('/posts');
    }

    return user;
  });
}

function revalidateAdsManagerPages() {
  revalidatePath(ADS_CAMPAIGNS_PATH);
  revalidatePath(ADS_PRODUCTS_PATH);
  revalidatePath(ADS_RULES_PATH);
}

// ─── AdProduct ────────────────────────────────────────────────────────────────

export async function createAdProductAction(formData: FormData) {
  await requireAdsManagerUser();

  const code = normalizeText(formData.get('code'));
  const name = normalizeText(formData.get('name'));
  const placementType = normalizeText(formData.get('placementType')) as AdPlacementType;
  const size = normalizeText(formData.get('size')) || 'M';
  const layout = normalizeText(formData.get('layout')) || 'THUMBNAIL';
  const pricingModel = normalizeText(formData.get('pricingModel')) || 'FIXED';
  const basePrice = parseFloat(normalizeText(formData.get('basePrice')) || '0');
  const description = normalizeText(formData.get('description')) || null;
  const sortOrder = parseInt(normalizeText(formData.get('sortOrder')) || '0', 10);

  if (!code || !name || !placementType) {
    redirect(`${ADS_PRODUCTS_PATH}?error=${encodeURIComponent('코드, 이름, 노출 위치는 필수입니다.')}`);
  }

  await prisma.adProduct.create({
    data: {
      code,
      name,
      placementType: placementType as AdPlacementType,
      size: size as 'S' | 'M' | 'L',
      layout: layout as 'TEXT' | 'THUMBNAIL' | 'IMAGE' | 'FEATURED',
      pricingModel: pricingModel as 'FIXED' | 'CPM',
      basePrice,
      description,
      sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
    },
  });

  revalidateAdsManagerPages();
  redirect(ADS_PRODUCTS_PATH);
}

export async function updateAdProductAction(formData: FormData) {
  await requireAdsManagerUser();

  const id = normalizeText(formData.get('id'));
  const name = normalizeText(formData.get('name'));
  const placementType = normalizeText(formData.get('placementType')) as AdPlacementType;
  const size = normalizeText(formData.get('size')) || 'M';
  const layout = normalizeText(formData.get('layout')) || 'THUMBNAIL';
  const pricingModel = normalizeText(formData.get('pricingModel')) || 'FIXED';
  const basePrice = parseFloat(normalizeText(formData.get('basePrice')) || '0');
  const description = normalizeText(formData.get('description')) || null;
  const sortOrder = parseInt(normalizeText(formData.get('sortOrder')) || '0', 10);

  if (!id || !name || !placementType) {
    redirect(`${ADS_PRODUCTS_PATH}?error=${encodeURIComponent('상품 ID, 이름, 노출 위치는 필수입니다.')}`);
  }

  await prisma.adProduct.update({
    where: { id },
    data: {
      name,
      placementType: placementType as AdPlacementType,
      size: size as 'S' | 'M' | 'L',
      layout: layout as 'TEXT' | 'THUMBNAIL' | 'IMAGE' | 'FEATURED',
      pricingModel: pricingModel as 'FIXED' | 'CPM',
      basePrice,
      description,
      sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
    },
  });

  revalidateAdsManagerPages();
  redirect(ADS_PRODUCTS_PATH);
}

export async function toggleAdProductActiveAction(formData: FormData) {
  await requireAdsManagerUser();

  const id = normalizeText(formData.get('id'));
  if (!id) {
    redirect(`${ADS_PRODUCTS_PATH}?error=${encodeURIComponent('상품 ID가 없습니다.')}`);
  }

  const product = await prisma.adProduct.findUnique({ where: { id }, select: { isActive: true } });
  if (!product) {
    redirect(`${ADS_PRODUCTS_PATH}?error=${encodeURIComponent('광고 상품을 찾을 수 없습니다.')}`);
  }

  await prisma.adProduct.update({ where: { id }, data: { isActive: !product.isActive } });

  revalidateAdsManagerPages();
  redirect(ADS_PRODUCTS_PATH);
}

// ─── AdCampaign ───────────────────────────────────────────────────────────────

export async function createAdCampaignAction(formData: FormData) {
  await requireAdsManagerUser();

  const postId = normalizeText(formData.get('postId'));
  const adProductId = normalizeText(formData.get('adProductId'));
  const priority = parseInt(normalizeText(formData.get('priority')) || '0', 10);
  const startAt = normalizeText(formData.get('startAt')) || null;
  const endAt = normalizeText(formData.get('endAt')) || null;
  const maxImpressions = normalizeText(formData.get('maxImpressions'));
  const targetCountryId = normalizeText(formData.get('targetCountryId')) || null;
  const targetCityId = normalizeText(formData.get('targetCityId')) || null;
  const landingUrl = normalizeText(formData.get('landingUrl')) || null;
  const notes = normalizeText(formData.get('notes')) || null;

  if (!postId || !adProductId) {
    redirect(`${ADS_CAMPAIGNS_PATH}?error=${encodeURIComponent('게시글 ID와 광고 상품은 필수입니다.')}`);
  }

  // Verify post is ADVERTISEMENT category
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, category: { select: { type: true } } },
  });

  if (!post) {
    redirect(`${ADS_CAMPAIGNS_PATH}?error=${encodeURIComponent('게시글을 찾을 수 없습니다.')}`);
  }

  if (post.category.type !== 'ADVERTISEMENT') {
    redirect(`${ADS_CAMPAIGNS_PATH}?error=${encodeURIComponent('광고 카테고리 게시글만 캠페인으로 등록할 수 있습니다.')}`);
  }

  await prisma.adCampaign.create({
    data: {
      postId,
      adProductId,
      status: 'DRAFT',
      priority: isNaN(priority) ? 0 : priority,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      maxImpressions: maxImpressions ? parseInt(maxImpressions, 10) || null : null,
      targetCountryId,
      targetCityId,
      landingUrl,
      notes,
    },
  });

  revalidateAdsManagerPages();
  redirect(ADS_CAMPAIGNS_PATH);
}

export async function updateAdCampaignStatusAction(formData: FormData) {
  await requireAdsManagerUser();

  const id = normalizeText(formData.get('id'));
  const status = normalizeText(formData.get('status')) as AdCampaignStatus;

  if (!id || !status) {
    redirect(`${ADS_CAMPAIGNS_PATH}?error=${encodeURIComponent('캠페인 ID와 상태는 필수입니다.')}`);
  }

  const validStatuses: AdCampaignStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    redirect(`${ADS_CAMPAIGNS_PATH}?error=${encodeURIComponent('유효하지 않은 캠페인 상태입니다.')}`);
  }

  await prisma.adCampaign.update({ where: { id }, data: { status } });

  revalidateAdsManagerPages();
  redirect(ADS_CAMPAIGNS_PATH);
}

export async function updateAdCampaignAction(formData: FormData) {
  await requireAdsManagerUser();

  const id = normalizeText(formData.get('id'));
  const priority = parseInt(normalizeText(formData.get('priority')) || '0', 10);
  const startAt = normalizeText(formData.get('startAt')) || null;
  const endAt = normalizeText(formData.get('endAt')) || null;
  const maxImpressions = normalizeText(formData.get('maxImpressions'));
  const targetCountryId = normalizeText(formData.get('targetCountryId')) || null;
  const targetCityId = normalizeText(formData.get('targetCityId')) || null;
  const landingUrl = normalizeText(formData.get('landingUrl')) || null;
  const notes = normalizeText(formData.get('notes')) || null;

  if (!id) {
    redirect(`${ADS_CAMPAIGNS_PATH}?error=${encodeURIComponent('캠페인 ID가 없습니다.')}`);
  }

  await prisma.adCampaign.update({
    where: { id },
    data: {
      priority: isNaN(priority) ? 0 : priority,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      maxImpressions: maxImpressions ? parseInt(maxImpressions, 10) || null : null,
      targetCountryId,
      targetCityId,
      landingUrl,
      notes,
    },
  });

  revalidateAdsManagerPages();
  redirect(ADS_CAMPAIGNS_PATH);
}

// ─── AdPlacementRule ──────────────────────────────────────────────────────────

export async function upsertAdPlacementRuleAction(formData: FormData) {
  await requireAdsManagerUser();

  const placementType = normalizeText(formData.get('placementType')) as AdPlacementType;
  const insertAfter = parseInt(normalizeText(formData.get('insertAfter')) || '5', 10);
  const repeatInterval = parseInt(normalizeText(formData.get('repeatInterval')) || '10', 10);
  const maxPerPage = parseInt(normalizeText(formData.get('maxPerPage')) || '2', 10);

  if (!placementType) {
    redirect(`${ADS_RULES_PATH}?error=${encodeURIComponent('노출 위치는 필수입니다.')}`);
  }

  await prisma.adPlacementRule.upsert({
    where: { placementType },
    create: {
      placementType,
      insertAfter: isNaN(insertAfter) ? 5 : insertAfter,
      repeatInterval: isNaN(repeatInterval) ? 10 : repeatInterval,
      maxPerPage: isNaN(maxPerPage) ? 2 : maxPerPage,
      isActive: true,
    },
    update: {
      insertAfter: isNaN(insertAfter) ? 5 : insertAfter,
      repeatInterval: isNaN(repeatInterval) ? 10 : repeatInterval,
      maxPerPage: isNaN(maxPerPage) ? 2 : maxPerPage,
    },
  });

  revalidateAdsManagerPages();
  redirect(`${ADS_RULES_PATH}?success=${encodeURIComponent('노출 규칙이 저장되었습니다.')}`);
}
