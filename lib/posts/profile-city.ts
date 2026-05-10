export const PROFILE_CITY_REQUIRED_MESSAGE = '글을 쓰기 전에 지역을 먼저 설정해 주세요.';

export function getProfileCityRequiredHref(returnTo: string) {
  return `/my/profile?returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(PROFILE_CITY_REQUIRED_MESSAGE)}`;
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
