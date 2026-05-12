'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  getProfileCityRequiredHref,
  normalizeInternalPath,
} from '@/lib/posts/profile-city';

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return null;
  }

  return normalizeInternalPath(value);
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const openChatUrl = normalizeText(formData.get('openChatUrl')) || null;
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

  if (isCountryChanged) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        openChatUrl,
        countryId: targetCountryId,
        cityId: null,
        countrySuggestionDismissedCountryId: null,
        countrySuggestionDismissedUntil: null,
        notifyOnKakaoForSearchAlert,
        notifyOnKakaoForComment,
      },
    });

    revalidatePath('/my/profile');
    revalidatePath('/posts');
    revalidatePath('/posts/new');
    redirect('/my/profile?notice=국가가 변경되어 기본 지역을 다시 선택해 주세요.');
  }

  if (returnTo && hasCityField && !cityId) {
    redirect(getProfileCityRequiredHref(returnTo));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      openChatUrl,
      countryId: targetCountryId,
      cityId,
      notifyOnKakaoForSearchAlert,
      notifyOnKakaoForComment,
    },
  });

  revalidatePath('/my/profile');
  redirect(returnTo ?? '/my/profile?success=1');
}
