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
  const submittedCityValue = formData.get('cityId');
  const cityId = normalizeText(submittedCityValue) || null;
  const hasCityField = formData.has('cityId');
  const returnTo = normalizeReturnTo(formData.get('returnTo'));

  if (cityId) {
    const city = await prisma.city.findFirst({
      where: { id: cityId, isActive: true },
      select: { id: true },
    });

    if (!city) {
      redirect('/my/profile?error=유효한 지역을 선택해 주세요.');
    }
  }

  if (returnTo && hasCityField && !cityId) {
    redirect(getProfileCityRequiredHref(returnTo));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { openChatUrl, cityId },
  });

  revalidatePath('/my/profile');
  redirect(returnTo ?? '/my/profile?success=1');
}
