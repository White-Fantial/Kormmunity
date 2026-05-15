import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const POSTS_FILTER_COOKIE = 'posts_filter_context';
const FILTER_PARAM_KEYS = ['category', 'city', 'type', 'tag', 'q'] as const;
const NAVIGATION_PARAM_KEYS = ['cursor', 'direction'] as const;

function readFilterParams(searchParams: URLSearchParams) {
  const filterParams = new URLSearchParams();

  for (const key of FILTER_PARAM_KEYS) {
    const values = searchParams.getAll(key);
    for (const value of values) {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        filterParams.append(key, trimmedValue);
      }
    }
  }

  return filterParams;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== '/posts') {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const hasResetSignal = url.searchParams.get('resetFilters') === '1';

  if (hasResetSignal) {
    for (const key of FILTER_PARAM_KEYS) {
      url.searchParams.delete(key);
    }
    for (const key of NAVIGATION_PARAM_KEYS) {
      url.searchParams.delete(key);
    }
    url.searchParams.delete('resetFilters');

    const response = NextResponse.redirect(url);
    response.cookies.set(POSTS_FILTER_COOKIE, '', {
      path: '/posts',
      maxAge: 0,
      sameSite: 'lax',
    });
    return response;
  }

  const currentFilterParams = readFilterParams(url.searchParams);
  const hasFilterParams = currentFilterParams.toString().length > 0;

  if (hasFilterParams) {
    const response = NextResponse.next();
    response.cookies.set(POSTS_FILTER_COOKIE, encodeURIComponent(currentFilterParams.toString()), {
      path: '/posts',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
    return response;
  }

  const hasNavigationParams = NAVIGATION_PARAM_KEYS.some((key) => url.searchParams.has(key));
  if (hasNavigationParams) {
    return NextResponse.next();
  }

  const savedFilterCookie = request.cookies.get(POSTS_FILTER_COOKIE)?.value;
  if (!savedFilterCookie) {
    return NextResponse.next();
  }

  const decodedFilterQuery = decodeURIComponent(savedFilterCookie);
  const restoredFilterParams = new URLSearchParams(decodedFilterQuery);

  let hasRestoredFilters = false;
  for (const key of FILTER_PARAM_KEYS) {
    for (const value of restoredFilterParams.getAll(key)) {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        continue;
      }
      url.searchParams.append(key, trimmedValue);
      hasRestoredFilters = true;
    }
  }

  if (!hasRestoredFilters) {
    return NextResponse.next();
  }

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/posts'],
};
