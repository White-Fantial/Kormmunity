'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { AdCampaignStatus, AdPlacementType } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessAdsManagerSection } from '@/lib/permissions';

const ADS_MANAGER_SECTION_PATH = {
  campaigns: '/ads-manager/campaigns',
  products: '/ads-manager/products',
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

function requireAdminUser() {
  return getCurrentUser().then((user) => {
    if (!user || !canAccessAdsManagerSection(user)) {
      redirect('/posts');
    }

    return user;
  });
}

// ─── AdProduct ────────────────────────────────────────────────────────────────

export async function createAdProductAction(formData: FormData) {
  await requireAdminUser();

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
    redirectAdsManager('products', { error: '코드, 이름, 노출 위치는 필수입니다.' });
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

  revalidatePath(ADS_MANAGER_SECTION_PATH.products);
  redirectAdsManager('products');
}

export async function updateAdProductAction(formData: FormData) {
  await requireAdminUser();

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
    redirectAdsManager('products', { error: '상품 ID, 이름, 노출 위치는 필수입니다.' });
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

  revalidatePath(ADS_MANAGER_SECTION_PATH.products);
  redirectAdsManager('products');
}

export async function toggleAdProductActiveAction(formData: FormData) {
  await requireAdminUser();

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

// ─── AdCampaign ───────────────────────────────────────────────────────────────

export async function createAdCampaignAction(formData: FormData) {
  await requireAdminUser();

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
    redirectAdsManager('campaigns', { error: '게시글 ID와 광고 상품은 필수입니다.' });
  }

  // Verify post is ADVERTISEMENT category
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, category: { select: { type: true } } },
  });

  if (!post) {
    redirectAdsManager('campaigns', { error: '게시글을 찾을 수 없습니다.' });
  }

  if (post.category.type !== 'ADVERTISEMENT') {
    redirectAdsManager('campaigns', {
      error: '광고 카테고리 게시글만 캠페인으로 등록할 수 있습니다.',
    });
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

  revalidatePath(ADS_MANAGER_SECTION_PATH.campaigns);
  redirectAdsManager('campaigns');
}

export async function updateAdCampaignStatusAction(formData: FormData) {
  await requireAdminUser();

  const id = normalizeText(formData.get('id'));
  const status = normalizeText(formData.get('status')) as AdCampaignStatus;

  if (!id || !status) {
    redirectAdsManager('campaigns', { error: '캠페인 ID와 상태는 필수입니다.' });
  }

  const validStatuses: AdCampaignStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    redirectAdsManager('campaigns', { error: '유효하지 않은 캠페인 상태입니다.' });
  }

  await prisma.adCampaign.update({ where: { id }, data: { status } });

  revalidatePath(ADS_MANAGER_SECTION_PATH.campaigns);
  redirectAdsManager('campaigns');
}

export async function updateAdCampaignAction(formData: FormData) {
  await requireAdminUser();

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
    redirectAdsManager('campaigns', { error: '캠페인 ID가 없습니다.' });
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

  revalidatePath(ADS_MANAGER_SECTION_PATH.campaigns);
  redirectAdsManager('campaigns');
}

// ─── AdPlacementRule ──────────────────────────────────────────────────────────

export async function upsertAdPlacementRuleAction(formData: FormData) {
  await requireAdminUser();

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

  revalidatePath(ADS_MANAGER_SECTION_PATH.rules);
  redirectAdsManager('rules', { success: '노출 규칙이 저장되었습니다.' });
}
