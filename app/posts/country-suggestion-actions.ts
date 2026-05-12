'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const DEFAULT_SNOOZE_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function getCountrySwitchSuggestionSnoozeDays() {
  const parsed = Number(process.env.COUNTRY_SWITCH_SUGGESTION_SNOOZE_DAYS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }

  return DEFAULT_SNOOZE_DAYS;
}

export async function switchCountryBySuggestionAction(formData: FormData) {
  const user = await requireUser();
  const suggestedCountryId = normalizeText(formData.get('suggestedCountryId'));

  if (!suggestedCountryId || suggestedCountryId === user.countryId) {
    redirect('/posts');
  }

  const country = await prisma.country.findFirst({
    where: { id: suggestedCountryId, isActive: true },
    select: { id: true },
  });

  if (!country) {
    redirect('/posts');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      countryId: country.id,
      cityId: null,
      countrySuggestionDismissedCountryId: null,
      countrySuggestionDismissedUntil: null,
    },
  });

  revalidatePath('/posts');
  revalidatePath('/my/profile');
  revalidatePath('/posts/new');
  redirect('/my/profile?notice=국가가 변경되어 기본 지역을 다시 선택해 주세요.');
}

export async function dismissCountrySuggestionAction(formData: FormData) {
  const user = await requireUser();
  const suggestedCountryId = normalizeText(formData.get('suggestedCountryId'));

  if (!suggestedCountryId) {
    redirect('/posts');
  }

  const country = await prisma.country.findFirst({
    where: { id: suggestedCountryId, isActive: true },
    select: { id: true },
  });

  if (!country) {
    redirect('/posts');
  }

  const snoozeDays = getCountrySwitchSuggestionSnoozeDays();
  // Persist a per-country snooze window in whole days.
  const dismissedUntil = new Date(Date.now() + snoozeDays * MILLISECONDS_PER_DAY);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      countrySuggestionDismissedCountryId: country.id,
      countrySuggestionDismissedUntil: dismissedUntil,
    },
  });

  revalidatePath('/posts');
  redirect('/posts');
}
