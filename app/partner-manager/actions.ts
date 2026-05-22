'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { AdvertiserMemberRole } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  canAccessPartnerManagerSection,
  canManagePartnerManagerScope,
} from '@/lib/permissions';

const PARTNER_MANAGER_PATH = '/partner-manager';

function normalizeText(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function redirectPartnerManager(query?: Record<string, string>): never {
  if (!query || Object.keys(query).length === 0) {
    redirect(PARTNER_MANAGER_PATH);
  }

  redirect(`${PARTNER_MANAGER_PATH}?${new URLSearchParams(query).toString()}`);
}

async function requirePartnerManagerUser() {
  const user = await getCurrentUser();
  if (!user || !canAccessPartnerManagerSection(user)) {
    redirect('/posts');
  }

  return user;
}

async function resolveScope(
  countryId: string | null,
  cityId: string | null,
): Promise<{ countryId: string | null; cityId: string | null }> {
  if (cityId && !countryId) {
    redirectPartnerManager({ error: '도시를 지정하려면 국가를 먼저 선택해 주세요.' });
  }

  const [country, city] = await Promise.all([
    countryId
      ? prisma.country.findFirst({
          where: { id: countryId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    cityId
      ? prisma.city.findFirst({
          where: { id: cityId, isActive: true },
          select: { id: true, countryId: true },
        })
      : Promise.resolve(null),
  ]);

  if (countryId && !country) {
    redirectPartnerManager({ error: '유효하지 않은 국가입니다.' });
  }

  if (cityId && !city) {
    redirectPartnerManager({ error: '유효하지 않은 도시입니다.' });
  }

  if (city && countryId && city.countryId !== countryId) {
    redirectPartnerManager({ error: '선택한 국가와 도시가 일치하지 않습니다.' });
  }

  return {
    countryId: city?.countryId ?? countryId,
    cityId,
  };
}

export async function createAdvertiserAction(formData: FormData) {
  const currentUser = await requirePartnerManagerUser();

  const name = normalizeText(formData.get('name'));
  const slug = normalizeText(formData.get('slug')).toLowerCase();
  const rawCountryId = normalizeText(formData.get('countryId')) || null;
  const rawCityId = normalizeText(formData.get('cityId')) || null;
  const contactEmail = normalizeText(formData.get('contactEmail')) || null;
  const contactPhone = normalizeText(formData.get('contactPhone')) || null;
  const websiteUrl = normalizeText(formData.get('websiteUrl')) || null;
  const notes = normalizeText(formData.get('notes')) || null;

  if (!name || !slug) {
    redirectPartnerManager({ error: '광고주 이름과 슬러그는 필수입니다.' });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    redirectPartnerManager({ error: '슬러그는 소문자 영문/숫자/하이픈만 사용할 수 있습니다.' });
  }

  const { countryId, cityId } = await resolveScope(rawCountryId, rawCityId);
  if (!canManagePartnerManagerScope(currentUser, countryId, cityId)) {
    redirectPartnerManager({ error: '할당된 지역 범위의 광고주만 생성할 수 있습니다.' });
  }

  const existing = await prisma.advertiser.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) {
    redirectPartnerManager({ error: '이미 사용 중인 광고주 슬러그입니다.' });
  }

  await prisma.advertiser.create({
    data: {
      name,
      slug,
      countryId,
      cityId,
      contactEmail,
      contactPhone,
      websiteUrl,
      notes,
    },
  });

  revalidatePath(PARTNER_MANAGER_PATH);
  redirectPartnerManager({ success: '광고주가 생성되었습니다.' });
}

export async function updateAdvertiserAction(formData: FormData) {
  const currentUser = await requirePartnerManagerUser();

  const advertiserId = normalizeText(formData.get('advertiserId'));
  const name = normalizeText(formData.get('name'));
  const slug = normalizeText(formData.get('slug')).toLowerCase();
  const rawCountryId = normalizeText(formData.get('countryId')) || null;
  const rawCityId = normalizeText(formData.get('cityId')) || null;
  const contactEmail = normalizeText(formData.get('contactEmail')) || null;
  const contactPhone = normalizeText(formData.get('contactPhone')) || null;
  const websiteUrl = normalizeText(formData.get('websiteUrl')) || null;
  const notes = normalizeText(formData.get('notes')) || null;
  const isActive = normalizeText(formData.get('isActive')) !== 'false';

  if (!advertiserId || !name || !slug) {
    redirectPartnerManager({ error: '광고주 ID, 이름, 슬러그는 필수입니다.' });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    redirectPartnerManager({ error: '슬러그는 소문자 영문/숫자/하이픈만 사용할 수 있습니다.' });
  }

  const advertiser = await prisma.advertiser.findUnique({
    where: { id: advertiserId },
    select: { id: true, slug: true, countryId: true, cityId: true },
  });
  if (!advertiser) {
    redirectPartnerManager({ error: '광고주를 찾을 수 없습니다.' });
  }

  if (!canManagePartnerManagerScope(currentUser, advertiser.countryId, advertiser.cityId)) {
    redirectPartnerManager({ error: '할당된 지역의 광고주만 수정할 수 있습니다.' });
  }

  const { countryId, cityId } = await resolveScope(rawCountryId, rawCityId);
  if (!canManagePartnerManagerScope(currentUser, countryId, cityId)) {
    redirectPartnerManager({ error: '할당된 지역 범위로만 광고주를 변경할 수 있습니다.' });
  }

  if (advertiser.slug !== slug) {
    const existing = await prisma.advertiser.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      redirectPartnerManager({ error: '이미 사용 중인 광고주 슬러그입니다.' });
    }
  }

  await prisma.advertiser.update({
    where: { id: advertiserId },
    data: {
      name,
      slug,
      countryId,
      cityId,
      contactEmail,
      contactPhone,
      websiteUrl,
      notes,
      isActive,
    },
  });

  revalidatePath(PARTNER_MANAGER_PATH);
  redirectPartnerManager({ success: '광고주 정보가 수정되었습니다.' });
}

export async function upsertAdvertiserMemberAction(formData: FormData) {
  const currentUser = await requirePartnerManagerUser();

  const advertiserId = normalizeText(formData.get('advertiserId'));
  const userId = normalizeText(formData.get('userId'));
  const role = normalizeText(formData.get('role')) as AdvertiserMemberRole;

  if (!advertiserId || !userId || !role) {
    redirectPartnerManager({ error: '광고주, 사용자, 역할은 필수입니다.' });
  }

  if (role !== 'OWNER' && role !== 'MEMBER') {
    redirectPartnerManager({ error: '유효하지 않은 광고주 멤버 역할입니다.' });
  }

  const advertiser = await prisma.advertiser.findUnique({
    where: { id: advertiserId },
    select: { id: true, countryId: true, cityId: true },
  });
  if (!advertiser) {
    redirectPartnerManager({ error: '광고주를 찾을 수 없습니다.' });
  }

  if (!canManagePartnerManagerScope(currentUser, advertiser.countryId, advertiser.cityId)) {
    redirectPartnerManager({ error: '할당된 지역의 광고주만 멤버를 관리할 수 있습니다.' });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!targetUser) {
    redirectPartnerManager({ error: '사용자를 찾을 수 없습니다.' });
  }

  await prisma.advertiserMember.upsert({
    where: {
      advertiserId_userId: {
        advertiserId,
        userId,
      },
    },
    create: {
      advertiserId,
      userId,
      role,
      isActive: true,
    },
    update: {
      role,
      isActive: true,
    },
  });

  revalidatePath(PARTNER_MANAGER_PATH);
  redirectPartnerManager({ success: '광고주 멤버가 저장되었습니다.' });
}

export async function deactivateAdvertiserMemberAction(formData: FormData) {
  const currentUser = await requirePartnerManagerUser();
  const membershipId = normalizeText(formData.get('membershipId'));

  if (!membershipId) {
    redirectPartnerManager({ error: '멤버십 ID가 없습니다.' });
  }

  const membership = await prisma.advertiserMember.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      advertiserId: true,
      isActive: true,
      advertiser: {
        select: {
          countryId: true,
          cityId: true,
        },
      },
    },
  });
  if (!membership) {
    redirectPartnerManager({ error: '광고주 멤버십을 찾을 수 없습니다.' });
  }

  if (
    !canManagePartnerManagerScope(
      currentUser,
      membership.advertiser.countryId,
      membership.advertiser.cityId,
    )
  ) {
    redirectPartnerManager({ error: '할당된 지역의 광고주 멤버만 변경할 수 있습니다.' });
  }

  if (!membership.isActive) {
    redirectPartnerManager({ error: '이미 비활성화된 멤버십입니다.' });
  }

  await prisma.advertiserMember.update({
    where: { id: membershipId },
    data: { isActive: false },
  });

  revalidatePath(PARTNER_MANAGER_PATH);
  redirectPartnerManager({ success: '광고주 멤버십이 비활성화되었습니다.' });
}
