'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { normalizeInternalPath } from '@/lib/posts/profile-city';

const MAX_QUERY_LENGTH = 100;

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return '/posts';
  }

  return normalizeInternalPath(value) ?? '/posts';
}

function buildRedirectUrl(path: string, key: string, value: string) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

function validateQuery(query: string) {
  if (!query) {
    return '저장할 검색어를 입력해 주세요.';
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return `검색어는 ${MAX_QUERY_LENGTH}자 이하로 입력해 주세요.`;
  }

  if (/[\r\n\t]/.test(query)) {
    return '검색어에 줄바꿈 문자나 탭은 사용할 수 없어요.';
  }

  return null;
}

export async function saveSearchAlertAction(formData: FormData) {
  const user = await requireUser();
  const query = normalizeText(formData.get('query'));
  const returnTo = normalizeReturnTo(formData.get('returnTo'));
  const queryValidationMessage = validateQuery(query);

  if (queryValidationMessage) {
    redirect(buildRedirectUrl(returnTo, 'error', queryValidationMessage));
  }

  await prisma.searchAlert.upsert({
    where: {
      userId_query: {
        userId: user.id,
        query,
      },
    },
    create: {
      userId: user.id,
      query,
    },
    update: {},
  });

  revalidatePath('/posts');
  redirect(buildRedirectUrl(returnTo, 'success', '1'));
}

export async function deleteSearchAlertAction(formData: FormData) {
  const user = await requireUser();
  const alertId = normalizeText(formData.get('alertId'));
  const returnTo = normalizeReturnTo(formData.get('returnTo'));

  if (!alertId) {
    redirect(returnTo);
  }

  await prisma.searchAlert.deleteMany({
    where: { id: alertId, userId: user.id },
  });

  revalidatePath('/posts');
  revalidatePath('/my/profile');
  redirect(returnTo);
}
