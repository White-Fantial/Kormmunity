import { UserRole, UserStatus } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

import { getSessionCookieName } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { exchangeCodeForToken, getKakaoUserInfo } from '@/lib/kakao/oauth';

const STATE_COOKIE = 'kakao_oauth_state';
const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionMaxAgeSeconds() {
  const parsed = Number(process.env.SESSION_MAX_AGE_SECONDS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return DEFAULT_SESSION_MAX_AGE_SECONDS;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;

  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || state !== storedState) {
    redirect('/login?error=oauth');
  }

  let kakaoId: string;
  let displayName: string;
  let profileImageUrl: string | null;

  try {
    const accessToken = await exchangeCodeForToken(code);
    const userInfo = await getKakaoUserInfo(accessToken);
    kakaoId = userInfo.kakaoId;
    displayName = userInfo.displayName;
    profileImageUrl = userInfo.profileImageUrl;
  } catch {
    redirect('/login?error=oauth');
  }

  const user = await prisma.user.upsert({
    where: { kakaoId },
    update: {
      displayName,
      profileImageUrl,
      status: UserStatus.ACTIVE,
    },
    create: {
      kakaoId,
      displayName,
      profileImageUrl,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
    select: { id: true },
  });

  const token = randomUUID();
  const sessionMaxAgeSeconds = getSessionMaxAgeSeconds();
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);

  await prisma.session.create({
    data: { token, userId: user.id, expiresAt },
  });

  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMaxAgeSeconds,
  });

  redirect('/posts');
}
