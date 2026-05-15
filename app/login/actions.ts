'use server';

import { UserRole, UserStatus } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';

import { getSessionCookieName, invalidateSessionCache } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionMaxAgeSeconds() {
  const parsed = Number(process.env.SESSION_MAX_AGE_SECONDS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }

  return DEFAULT_SESSION_MAX_AGE_SECONDS;
}

/**
 * TODO(Phase 1): Replace this placeholder with real Kakao OAuth callback handling.
 * Keep this boundary stable so the rest of the app can switch auth providers safely.
 */
export async function loginWithKakaoPlaceholder(formData: FormData) {
  const kakaoId = String(formData.get('kakaoId') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();
  const role = String(formData.get('role') || '').trim() as UserRole;

  if (!kakaoId || !displayName) {
    redirect('/login?error=missing');
  }

  const normalizedRole =
    role === 'MODERATOR' || role === 'COORDINATOR' || role === 'ADMIN' ? role : UserRole.USER;

  const user = await prisma.user.upsert({
    where: { kakaoId },
    update: {
      displayName,
      role: normalizedRole,
      status: UserStatus.ACTIVE,
    },
    create: {
      kakaoId,
      displayName,
      role: normalizedRole,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, countryId: true },
  });

  const token = randomUUID();
  const sessionMaxAgeSeconds = getSessionMaxAgeSeconds();
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);

  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMaxAgeSeconds,
  });

  redirect(user.countryId ? '/posts' : '/select-country');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (token) {
    invalidateSessionCache(token);
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  cookieStore.delete(getSessionCookieName());
  redirect('/posts');
}
