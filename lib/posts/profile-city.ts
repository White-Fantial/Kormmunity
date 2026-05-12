import { prisma } from '@/lib/db/prisma';

export const PROFILE_CITY_REQUIRED_MESSAGE = '글을 쓰기 전에 지역을 먼저 설정해 주세요.';

export function getProfileCityRequiredHref(returnTo: string, message = PROFILE_CITY_REQUIRED_MESSAGE) {
  const safeReturnTo = normalizeInternalPath(returnTo);

  if (!safeReturnTo) {
    return `/my/profile?error=${encodeURIComponent(message)}`;
  }

  return `/my/profile?returnTo=${encodeURIComponent(safeReturnTo)}&error=${encodeURIComponent(message)}`;
}

/**
 * A valid profile city means:
 * - user has a selected country and city
 * - city exists and is active
 * - city belongs to the user's selected country
 */
export async function hasValidProfileCity(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      countryId: true,
      cityId: true,
      city: {
        select: {
          id: true,
          countryId: true,
          isActive: true,
        },
      },
    },
  });

  if (!user || !user.countryId || !user.cityId || !user.city) {
    return false;
  }

  if (!user.city.isActive) {
    return false;
  }

  return user.city.countryId === user.countryId;
}

export function normalizeInternalPath(value: string) {
  const candidate = value.trim();

  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return null;
  }

  if (/[\r\n\t]/.test(candidate)) {
    return null;
  }

  try {
    const url = new URL(candidate, 'https://kakao.local');

    if (url.origin !== 'https://kakao.local') {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
