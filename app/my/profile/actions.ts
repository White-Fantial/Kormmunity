'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser, getSessionCookieName, invalidateSessionCache } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  extractKakaoOpenLink,
  INVALID_KAKAO_OPEN_LINK_MESSAGE_KO,
  isValidKakaoOpenLink,
} from '@/lib/kakao-open-link';
import {
  getProfileCityRequiredHref,
  normalizeInternalPath,
} from '@/lib/posts/profile-city';
import { LOCATION_COOLDOWN_DAYS } from '@/lib/location-cooldown';

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return null;
  }

  return normalizeInternalPath(value);
}

function formatKoreanDate(date: Date) {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;
  const normalizedOpenChatUrl = extractKakaoOpenLink(normalizeText(formData.get('openChatUrl')));
  if (normalizedOpenChatUrl && !isValidKakaoOpenLink(normalizedOpenChatUrl)) {
    redirect(`/my/profile?error=${encodeURIComponent(INVALID_KAKAO_OPEN_LINK_MESSAGE_KO)}`);
  }
  const openChatUrl = normalizedOpenChatUrl || null;
  const countryId = normalizeText(formData.get('countryId')) || null;
  const submittedCityValue = formData.get('cityId');
  const cityId = normalizeText(submittedCityValue) || null;
  const hasCityField = formData.has('cityId');
  const returnTo = normalizeReturnTo(formData.get('returnTo'));
  const notifyOnKakaoForSearchAlert = formData.get('notifyOnKakaoForSearchAlert') === 'on';
  const notifyOnKakaoForComment = formData.get('notifyOnKakaoForComment') === 'on';

  const targetCountryId = countryId ?? user.countryId;

  if (!targetCountryId) {
    redirect('/my/profile?error=국가를 먼저 선택해 주세요.');
  }

  const country = await prisma.country.findFirst({
    where: { id: targetCountryId, isActive: true },
    select: { id: true },
  });

  if (!country) {
    redirect('/my/profile?error=유효한 국가를 선택해 주세요.');
  }

  const isCountryChanged = targetCountryId !== user.countryId;
  const isCityChanged = cityId !== user.cityId;
  const isLocationChanged = isCountryChanged || isCityChanged;
  const isAdmin = user.role === 'ADMIN';

  if (cityId) {
    const city = await prisma.city.findFirst({
      where: { id: cityId, isActive: true },
      select: { id: true, countryId: true },
    });

    if (!city) {
      redirect('/my/profile?error=선택한 지역을 찾을 수 없어요.');
    }

    if (city.countryId !== targetCountryId) {
      redirect('/my/profile?error=선택한 지역은 현재 국가에 속하지 않아요.');
    }
  }

  // Cooldown check for non-admin users
  if (isLocationChanged && !isAdmin) {
    const cooldownSince = new Date(Date.now() - LOCATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const recentChange = await prisma.locationChangeLog.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: cooldownSince },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (recentChange) {
      const nextAllowedAt = new Date(
        recentChange.createdAt.getTime() + LOCATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
      );
      redirect(
        `/my/profile?error=${encodeURIComponent(`국가/도시는 7일마다 한 번만 변경할 수 있어요. 다음 변경 가능일: ${formatKoreanDate(nextAllowedAt)}`)}`,
      );
    }
  }

  if (isCountryChanged) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          openChatUrl,
          countryId: targetCountryId,
          cityId: null,
          notifyOnKakaoForSearchAlert,
          notifyOnKakaoForComment,
        },
      });
      await tx.locationChangeLog.create({
        data: {
          userId: user.id,
          actorId: user.id,
          changeType: isAdmin ? 'ADMIN_OVERRIDE' : 'COUNTRY_CHANGED_CITY_RESET',
          beforeCountryId: user.countryId ?? null,
          afterCountryId: targetCountryId,
          beforeCityId: user.cityId ?? null,
          afterCityId: null,
        },
      });
    });

    if (sessionToken) invalidateSessionCache(sessionToken);
    revalidatePath('/my/profile');
    revalidatePath('/posts');
    revalidatePath('/posts/new');
    redirect(
      '/my/profile?notice=' +
        encodeURIComponent(
          isAdmin
            ? '국가가 변경되어 기본 지역을 다시 선택해 주세요.'
            : `국가가 변경되어 기본 지역이 초기화되었어요. 다음 변경 가능일: ${formatKoreanDate(new Date(Date.now() + LOCATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000))}`,
        ),
    );
  }

  if (returnTo && hasCityField && !cityId) {
    redirect(getProfileCityRequiredHref(returnTo));
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        openChatUrl,
        countryId: targetCountryId,
        cityId,
        notifyOnKakaoForSearchAlert,
        notifyOnKakaoForComment,
      },
    });

    if (isCityChanged) {
      await tx.locationChangeLog.create({
        data: {
          userId: user.id,
          actorId: user.id,
          changeType: isAdmin ? 'ADMIN_OVERRIDE' : 'CITY_CHANGED',
          beforeCountryId: user.countryId ?? null,
          afterCountryId: targetCountryId,
          beforeCityId: user.cityId ?? null,
          afterCityId: cityId,
        },
      });
    }
  });

  if (sessionToken) invalidateSessionCache(sessionToken);
  revalidatePath('/my/profile');

  if (isCityChanged && !isAdmin) {
    const nextAllowedAt = new Date(Date.now() + LOCATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    redirect(
      (returnTo ?? '/my/profile') +
        (returnTo ? '' : `?notice=${encodeURIComponent(`지역이 변경되었어요. 다음 변경 가능일: ${formatKoreanDate(nextAllowedAt)}`)}`),
    );
  }

  redirect(returnTo ?? '/my/profile?success=1');
}
