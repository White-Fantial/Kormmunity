import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache, revalidateTag } from 'next/cache';

import { prisma } from '@/lib/db/prisma';
import type { SessionUser } from '@/lib/auth/types';
import {
  isMissingStaffAssignmentTableError,
  toLegacyStaffAssignments,
} from '@/lib/auth/staff-assignments';

const SESSION_COOKIE = 'session_token';
const SESSION_CACHE_TTL_SECONDS = 30;

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionCacheTag(token: string) {
  return `session:${token}`;
}

/**
 * Evicts a session token from the server-side cache.
 * The second argument (`{ expire: 0 }`) satisfies the Next.js 16 type signature
 * while requesting immediate expiry of the cache entry.
 */
export function invalidateSessionCache(token: string) {
  revalidateTag(getSessionCacheTag(token), { expire: 0 });
}

async function fetchSessionUserByToken(token: string): Promise<SessionUser | null> {
  return unstable_cache(
    async () => {
      try {
        const session = await prisma.session.findUnique({
          where: { token },
          select: {
            expiresAt: true,
            user: {
              select: {
                id: true,
                kakaoId: true,
                displayName: true,
                accountType: true,
                isManagedAccount: true,
                isActive: true,
                status: true,
                countryId: true,
                cityId: true,
                staffAssignments: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    role: true,
                    countryId: true,
                    cityId: true,
                  },
                },
              },
            },
          },
        });

        if (!session || session.expiresAt <= new Date()) {
          return null;
        }

        return session.user;
      } catch (error) {
        if (!isMissingStaffAssignmentTableError(error)) {
          throw error;
        }

        const session = await prisma.session.findUnique({
          where: { token },
          select: {
            expiresAt: true,
            user: {
              select: {
                id: true,
                kakaoId: true,
                displayName: true,
                accountType: true,
                isManagedAccount: true,
                isActive: true,
                status: true,
                countryId: true,
                cityId: true,
                role: true,
              },
            },
          },
        });

        if (!session || session.expiresAt <= new Date()) {
          return null;
        }

        const { role, ...user } = session.user;
        return {
          ...user,
          staffAssignments: toLegacyStaffAssignments(role, user.countryId, user.cityId),
        };
      }
    },
    ['session', token],
    { revalidate: SESSION_CACHE_TTL_SECONDS, tags: [getSessionCacheTag(token)] },
  )();
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return fetchSessionUserByToken(token);
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}
