'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser, getSessionCookieName, invalidateSessionCache } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { normalizeInternalPath } from '@/lib/posts/profile-city';

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function selectCountryAction(formData: FormData) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;

  // Country cannot be changed once set
  if (user.countryId) {
    redirect('/posts');
  }

  const countryId = normalizeText(formData.get('countryId'));
  const returnToRaw = normalizeText(formData.get('returnTo'));
  const returnTo = normalizeInternalPath(returnToRaw);

  if (!countryId) {
    redirect('/select-country?error=국가를 선택해 주세요.');
  }

  const country = await prisma.country.findFirst({
    where: { id: countryId, isActive: true },
    select: { id: true },
  });

  if (!country) {
    redirect('/select-country?error=유효한 국가를 선택해 주세요.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { countryId: country.id },
  });

  if (sessionToken) invalidateSessionCache(sessionToken);
  revalidatePath('/select-country');
  redirect(returnTo ?? '/posts');
}
