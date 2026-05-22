import Link from 'next/link';
import type { Metadata } from 'next';
import type { CategoryType } from '@prisma/client';
import { PublicHomeHero } from '@/components/home/PublicHomeHero';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { CategoryFilterFieldset } from '@/components/posts/category-filter-fieldset';
import { InfinitePostList } from '@/components/posts/infinite-post-list';
import type { InfinitePostItem, FeedItem } from '@/components/posts/infinite-post-list';
import { saveSearchAlertAction } from '@/app/posts/search-alert-actions';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';
import { buildPinnedPostCursorWhere, PINNED_POST_ORDER_ASC, PINNED_POST_ORDER_DESC } from '@/lib/posts/pinned-order';
import { getActiveCategories, getActiveCities, getActiveCitiesByCountry } from '@/lib/posts/reference-data';
import { getCategoryDisplayName } from '@/lib/posts/category-display';
import { measureServerTiming } from '@/lib/performance/server';
import { shouldShowOperatorBadge } from '@/lib/account-type';
import {
  fetchActiveAdSlots,
  getInlinePlacementRule,
  insertAdsIntoFeed,
} from '@/lib/ads/feed-inserter';

export const metadata: Metadata = {
  title: '홈',
  description: '한인 커뮤니티의 최신 게시글을 확인해 보세요.',
};

type PostsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    city?: string | string[];
    type?: string | string[];
    tag?: string | string[];
    q?: string | string[];
    cursor?: string | string[];
    direction?: string | string[];
    success?: string;
    error?: string;
  }>;
};

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

function toArray(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toSingle(value: string | string[] | undefined) {
  if (!value) {
    return '';
  }

  return (Array.isArray(value) ? value[0] : value).trim();
}

function resolvePostAuthor(
  post: {
    author: {
      displayName: string;
      profileImageUrl: string | null;
      neighbourWarmth: number;
      accountType: 'REAL_USER' | 'PERSONA' | 'OPERATOR' | 'SYSTEM';
    };
  },
): { displayName: string; profileImageUrl: string | null; neighbourWarmth: number; isOperator: boolean } {
  return {
    displayName: post.author.displayName,
    profileImageUrl: post.author.profileImageUrl,
    neighbourWarmth: post.author.neighbourWarmth,
    isOperator: shouldShowOperatorBadge(post.author),
  };
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const keyword = toSingle(params.q);
  const cursorToken = toSingle(params.cursor);
  const paginationCursor = cursorToken ? decodeCursor(cursorToken) : null;
  const paginationDirection = toSingle(params.direction) === 'prev' ? 'prev' : 'next';

  const userCountryId = currentUser?.countryId ?? null;

  const [categories, cities] = await Promise.all([
    getActiveCategories(),
    userCountryId ? getActiveCitiesByCountry(userCountryId) : getActiveCities(),
  ]);

  const alwaysIncludedCategories = categories.filter(
    (category) => category.visibilityMode === 'ALWAYS_INCLUDED',
  );
  const filterCategories = categories.filter(
    (category) => category.visibilityMode === 'NORMAL',
  );
  const filterCategoryIds = new Set(filterCategories.map((category) => category.id));
  const cityIds = new Set(cities.map((city) => city.id));
  const profileCityId = currentUser?.cityId ?? null;
  const activeProfileCityId =
    profileCityId && cityIds.has(profileCityId) ? profileCityId : null;
  const hasActiveProfileCity = activeProfileCityId !== null;
  const selectedFilterCategoryIdsFromParams = Array.from(
    new Set(toArray(params.category).filter((id) => filterCategoryIds.has(id))),
  );
  const selectedFilterCategoryIds =
    selectedFilterCategoryIdsFromParams.length > 0
      ? selectedFilterCategoryIdsFromParams
      : filterCategories.map((category) => category.id);

  const selectedCategoryIds = Array.from(
    new Set([
      ...selectedFilterCategoryIds,
      ...alwaysIncludedCategories.map((category) => category.id),
    ]),
  );
  const selectedCityIdsFromParams = Array.from(
    new Set(toArray(params.city).filter((id) => cityIds.has(id))),
  );
  let selectedCityIdsBase: string[];
  if (selectedCityIdsFromParams.length > 0) {
    selectedCityIdsBase = selectedCityIdsFromParams;
  } else if (hasActiveProfileCity) {
    selectedCityIdsBase = [activeProfileCityId];
  } else {
    selectedCityIdsBase = cities.map((city) => city.id);
  }
  const shouldIncludeProfileCity = hasActiveProfileCity
    ? !selectedCityIdsBase.includes(activeProfileCityId)
    : false;
  const selectedCityIds =
    shouldIncludeProfileCity
      ? [...selectedCityIdsBase, activeProfileCityId]
      : selectedCityIdsBase;

  const shouldFilterByCountry = Boolean(userCountryId);
  const shouldFilterByCategory =
    selectedFilterCategoryIds.length !== filterCategories.length;
  const shouldFilterByCity = hasActiveProfileCity && selectedCityIds.length !== cities.length;
  const hasKeyword = Boolean(keyword);

  const returnToParams = new URLSearchParams();
  for (const categoryId of selectedFilterCategoryIdsFromParams) {
    returnToParams.append('category', categoryId);
  }
  for (const cityId of selectedCityIdsFromParams) {
    returnToParams.append('city', cityId);
  }
  if (keyword) {
    returnToParams.set('q', keyword);
  }
  const returnTo = `/posts${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`;
  const canViewReportStats = currentUser ? canMakeFinalUserDecision(currentUser) : false;
  const paginationBaseParams = new URLSearchParams(returnToParams);

  const createDetailHref = (postId: string) => {
    const query = new URLSearchParams(paginationBaseParams);
    if (cursorToken) {
      query.set('cursor', cursorToken);
    }
    if (paginationDirection === 'prev') {
      query.set('direction', 'prev');
    }

    const queryString = query.toString();
    return `/posts/${postId}${queryString ? `?${queryString}` : ''}`;
  };

  const andConditions: object[] = [];

  if (shouldFilterByCountry) {
    andConditions.push({ OR: [{ countryId: userCountryId }, { countryId: null }] });
  }
  if (shouldFilterByCity) {
    andConditions.push({ OR: [{ cityId: { in: selectedCityIds } }, { cityId: null }] });
  }
  if (hasKeyword) {
    andConditions.push({
      OR: [
        { title: { contains: keyword, mode: 'insensitive' as const } },
        { body: { contains: keyword, mode: 'insensitive' as const } },
        { author: { displayName: { contains: keyword, mode: 'insensitive' as const } } },
      ],
    });
  }
  if (paginationCursor) {
    const paginationWhere = buildPinnedPostCursorWhere(paginationCursor, paginationDirection);
    if (paginationWhere) {
      andConditions.push(paginationWhere);
    }
  }

  const postWhere = {
    status: 'PUBLISHED' as const,
    categoryId: { in: selectedCategoryIds },
    AND: andConditions.length > 0 ? andConditions : undefined,
  };

  let normalizedPosts: Array<{
    id: string;
    title: string | null;
    bodyPreview: string;
    createdAt: Date;
    isPinned: boolean;
    pinnedAt: Date | null;
    price: string | null;
    thumbnailUrl: string | null;
    commentCount: number;
    likeCount: number;
    viewCount: number;
    isLikedByCurrentUser: boolean;
    isSavedByCurrentUser: boolean;
    reportCount?: number;
    tags: { id: string; label: string }[];
    category: { name: string; type: CategoryType; color: string | null };
    city: { name: string } | null;
    author: { displayName: string; profileImageUrl: string | null; neighbourWarmth: number; isOperator?: boolean };
  }> = [];

  if (canViewReportStats) {
    const posts = await measureServerTiming('posts:list:with-reports', () =>
      prisma.post.findMany({
        where: postWhere,
        orderBy: paginationDirection === 'prev' ? PINNED_POST_ORDER_ASC : PINNED_POST_ORDER_DESC,
        take: PAGE_SIZE + 1,
        select: {
          id: true,
          title: true,
          body: true,
          createdAt: true,
          viewCount: true,
          isPinned: true,
          pinnedAt: true,
          tags: {
            select: {
              postTagOption: {
                select: { id: true, label: true },
              },
            },
          },
          price: true,
          category: { select: { name: true, type: true, color: true } },
          city: { select: { name: true } },
          author: {
            select: {
              displayName: true,
              profileImageUrl: true,
              neighbourWarmth: true,
              accountType: true,
            },
          },
          postLikes: {
            where: { userId: currentUser?.id ?? '__anonymous__' },
            select: { id: true },
            take: 1,
          },
          savedBy: {
            where: { userId: currentUser?.id ?? '__anonymous__' },
            select: { id: true },
            take: 1,
          },
          images: {
            select: { url: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          _count: {
            select: {
              comments: {
                where: { status: 'PUBLISHED' },
              },
              postLikes: true,
              reports: true,
            },
          },
        },
      }),
    );
    const hasExtra = posts.length > PAGE_SIZE;
    const slicedPosts = hasExtra ? posts.slice(0, PAGE_SIZE) : posts;
    const pagePosts = paginationDirection === 'prev' ? [...slicedPosts].reverse() : slicedPosts;


    normalizedPosts = pagePosts.map((post) => {
      return {
        id: post.id,
        title: post.title,
        bodyPreview: post.body.slice(0, BODY_PREVIEW_LENGTH),
        createdAt: post.createdAt,
        isPinned: post.isPinned,
        pinnedAt: post.pinnedAt,
        tags: post.tags.map((tag) => tag.postTagOption),
        price: post.price ? post.price.toString() : null,
        thumbnailUrl: post.images[0]?.url ?? null,
        commentCount: post._count.comments,
        likeCount: post._count.postLikes,
        viewCount: post.viewCount,
        isLikedByCurrentUser: post.postLikes.length > 0,
        isSavedByCurrentUser: post.savedBy.length > 0,
        reportCount: post._count.reports,
        category: post.category,
        city: post.city,
        author: resolvePostAuthor(post),
      };
    });
  } else {
    const posts = await measureServerTiming('posts:list', () =>
      prisma.post.findMany({
        where: postWhere,
        orderBy: paginationDirection === 'prev' ? PINNED_POST_ORDER_ASC : PINNED_POST_ORDER_DESC,
        take: PAGE_SIZE + 1,
        select: {
          id: true,
          title: true,
          body: true,
          createdAt: true,
          viewCount: true,
          isPinned: true,
          pinnedAt: true,
          tags: {
            select: {
              postTagOption: {
                select: { id: true, label: true },
              },
            },
          },
          price: true,
          category: { select: { name: true, type: true, color: true } },
          city: { select: { name: true } },
          author: {
            select: {
              displayName: true,
              profileImageUrl: true,
              neighbourWarmth: true,
              accountType: true,
            },
          },
          postLikes: {
            where: { userId: currentUser?.id ?? '__anonymous__' },
            select: { id: true },
            take: 1,
          },
          savedBy: {
            where: { userId: currentUser?.id ?? '__anonymous__' },
            select: { id: true },
            take: 1,
          },
          images: {
            select: { url: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          _count: {
            select: {
              comments: {
                where: { status: 'PUBLISHED' },
              },
              postLikes: true,
            },
          },
        },
      }),
    );
    const hasExtra = posts.length > PAGE_SIZE;
    const slicedPosts = hasExtra ? posts.slice(0, PAGE_SIZE) : posts;
    const pagePosts = paginationDirection === 'prev' ? [...slicedPosts].reverse() : slicedPosts;


    normalizedPosts = pagePosts.map((post) => {
      return {
        id: post.id,
        title: post.title,
        bodyPreview: post.body.slice(0, BODY_PREVIEW_LENGTH),
        createdAt: post.createdAt,
        isPinned: post.isPinned,
        pinnedAt: post.pinnedAt,
        tags: post.tags.map((tag) => tag.postTagOption),
        price: post.price ? post.price.toString() : null,
        thumbnailUrl: post.images[0]?.url ?? null,
        commentCount: post._count.comments,
        likeCount: post._count.postLikes,
        viewCount: post.viewCount,
        isLikedByCurrentUser: post.postLikes.length > 0,
        isSavedByCurrentUser: post.savedBy.length > 0,
        category: post.category,
        city: post.city,
        author: resolvePostAuthor(post),
      };
    });
  }

  const hasFilters = shouldFilterByCountry || shouldFilterByCategory || shouldFilterByCity || hasKeyword;
  const lastPost = normalizedPosts[normalizedPosts.length - 1];
  const nextCursor = lastPost
    ? encodeCursor({
        id: lastPost.id,
        createdAt: lastPost.createdAt,
        isPinned: lastPost.isPinned,
        pinnedAt: lastPost.pinnedAt,
      })
    : null;

  const isFirstPage = !paginationCursor;
  const [adSlots, inlinePlacementRule] = await Promise.all([
    fetchActiveAdSlots({ countryId: userCountryId, cityId: currentUser?.cityId ?? null }),
    getInlinePlacementRule(),
  ]);

  const serializedPosts: InfinitePostItem[] = normalizedPosts.map((post) => ({
    ...post,
    href: createDetailHref(post.id),
    createdAt: post.createdAt.toISOString(),
    pinnedAt: post.pinnedAt?.toISOString() ?? null,
  } satisfies InfinitePostItem));

  const feedItems: FeedItem[] = insertAdsIntoFeed(
    serializedPosts,
    adSlots,
    inlinePlacementRule,
    isFirstPage,
  );

  const emptyState = hasFilters
    ? {
        title: '선택한 조건에 맞는 글이 없어요.',
        description: '필터 조건을 조금 완화하거나 검색어를 바꿔 다시 확인해 보세요.',
      }
    : {
        title: '아직 올라온 글이 없어요.',
        description: '첫 글을 남겨서 동네 소식을 나눠보세요.',
      };
  return (
    <section className="space-y-4">
      {!currentUser && <PublicHomeHero />}

      {params.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          검색 조건이 저장되었어요.
        </p>
      ) : null}
      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      {currentUser && !hasActiveProfileCity ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          도시 기반 필터와 글쓰기를 위해 <Link href="/my/profile" className="underline">기본 지역</Link>을 선택해 주세요.
        </p>
      ) : null}
      <div className="-mx-1 rounded-2xl px-1 py-1">
        <form key={returnToParams.toString()}>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="제목, 내용, 닉네임으로 검색"
              aria-label="게시글 검색어"
              className="min-w-0 flex-1 rounded-xl border border-[#e8e8e8] bg-white px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
            />
            <button
              type="submit"
              className="w-20 shrink-0 rounded-xl bg-[#fee500] px-3 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
            >
              검색
            </button>
          </div>
          <details className="group rounded-xl border border-[#e8e8e8] bg-white p-3 shadow-sm">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
              <span>필터</span>
              <span className="group-open:hidden text-[#888]">펼치기</span>
              <span className="hidden group-open:inline text-[#888]">접기</span>
            </summary>

            <div className="mt-3 hidden grid-cols-1 gap-4 group-open:grid sm:grid-cols-2">
              <CategoryFilterFieldset
                categories={filterCategories.map((category) => ({
                  id: category.id,
                  name: getCategoryDisplayName(category),
                }))}
                selectedIds={selectedFilterCategoryIds}
              />

              <fieldset className="space-y-2 text-sm">
                <legend className="font-medium">지역 선택</legend>
                <div className="flex flex-wrap gap-2">
                  {cities.map((city) => {
                    const isProfileCity = city.id === profileCityId;

                    return (
                      <label
                        key={city.id}
                        className="flex cursor-pointer items-center gap-2 rounded-full border border-[#e8e8e8] px-3 py-1.5 hover:border-[#fee500] hover:bg-[#fffde7]"
                      >
                        <input
                          type="checkbox"
                          name="city"
                          value={city.id}
                          defaultChecked={selectedCityIds.includes(city.id)}
                          disabled={isProfileCity || !hasActiveProfileCity}
                          aria-label={
                            isProfileCity
                              ? `${city.name} (프로필 기본 지역으로 항상 선택됨)`
                              : city.name
                          }
                          className="accent-[#fee500]"
                        />
                        <span>{city.name}</span>
                        {isProfileCity ? (
                          <span className="text-xs text-[#888]">(기본 지역)</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                >
                  필터 적용
                </button>
                <Link href="/posts?resetFilters=1" className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm hover:bg-[#f9f9f9]">
                  초기화
                </Link>
              </div>
            </div>
          </details>
        </form>
      </div>

      {currentUser && hasKeyword ? (
        <section className="space-y-3 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">검색 조건 저장</h2>
          <form action={saveSearchAlertAction} className="space-y-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="query" value={keyword} />
            <p className="text-xs text-[#777]">
              현재 검색어를 저장하고 조건에 맞는 글이 올라오면 알림을 받을 수 있어요. 카카오톡 알림은 프로필 페이지에서 설정할 수 있어요.
            </p>
            <button
              type="submit"
              className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
            >
              현재 검색 조건 저장
            </button>
          </form>
        </section>
      ) : null}

      {normalizedPosts.length === 0 ? (
        <EmptyStateMessage title={emptyState.title} description={emptyState.description} />
      ) : (
        <InfinitePostList
          initialPosts={feedItems}
          initialNextCursor={nextCursor}
          fetchApiUrl={`/api/posts/feed${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`}
          cardConfig={{
            mode: 'feed',
            showLikeAction: Boolean(currentUser),
            showSaveAction: Boolean(currentUser),
            returnTo,
          }}
        />
      )}
    </section>
  );
}
