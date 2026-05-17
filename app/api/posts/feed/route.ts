import { NextRequest, NextResponse } from 'next/server';
import type { CategoryType } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import { shouldShowOperatorBadge } from '@/lib/account-type';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';
import {
  buildPinnedPostCursorWhere,
  PINNED_POST_ORDER_DESC,
} from '@/lib/posts/pinned-order';
import {
  getActiveCategories,
  getActiveCities,
  getActiveCitiesByCountry,
} from '@/lib/posts/reference-data';

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

function toArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  const { searchParams } = request.nextUrl;

  const cursorToken = searchParams.get('cursor') ?? '';
  const paginationCursor = cursorToken ? decodeCursor(cursorToken) : null;

  const keyword = searchParams.get('q') ?? '';

  const userCountryId = currentUser?.countryId ?? null;

  const [categories, cities] = await Promise.all([
    getActiveCategories(),
    userCountryId ? getActiveCitiesByCountry(userCountryId) : getActiveCities(),
  ]);

  const alwaysIncludedCategories = categories.filter(
    (c) => c.visibilityMode === 'ALWAYS_INCLUDED',
  );
  const filterCategories = categories.filter((c) => c.visibilityMode === 'NORMAL');
  const filterCategoryIds = new Set(filterCategories.map((c) => c.id));
  const cityIds = new Set(cities.map((c) => c.id));

  const profileCityId = currentUser?.cityId ?? null;
  const activeProfileCityId =
    profileCityId && cityIds.has(profileCityId) ? profileCityId : null;
  const hasActiveProfileCity = activeProfileCityId !== null;

  const selectedFilterCategoryIdsFromParams = Array.from(
    new Set(toArray(searchParams.getAll('category')).filter((id) => filterCategoryIds.has(id))),
  );
  const selectedFilterCategoryIds =
    selectedFilterCategoryIdsFromParams.length > 0
      ? selectedFilterCategoryIdsFromParams
      : filterCategories.map((c) => c.id);

  const selectedCategoryIds = Array.from(
    new Set([
      ...selectedFilterCategoryIds,
      ...alwaysIncludedCategories.map((c) => c.id),
    ]),
  );

  const selectedCityIdsFromParams = Array.from(
    new Set(toArray(searchParams.getAll('city')).filter((id) => cityIds.has(id))),
  );

  let selectedCityIdsBase: string[];
  if (selectedCityIdsFromParams.length > 0) {
    selectedCityIdsBase = selectedCityIdsFromParams;
  } else if (hasActiveProfileCity) {
    selectedCityIdsBase = [activeProfileCityId];
  } else {
    selectedCityIdsBase = cities.map((c) => c.id);
  }

  const shouldIncludeProfileCity = hasActiveProfileCity
    ? !selectedCityIdsBase.includes(activeProfileCityId)
    : false;
  const selectedCityIds = shouldIncludeProfileCity
    ? [...selectedCityIdsBase, activeProfileCityId]
    : selectedCityIdsBase;

  const shouldFilterByCountry = Boolean(userCountryId);
  const shouldFilterByCity =
    hasActiveProfileCity && selectedCityIds.length !== cities.length;
  const hasKeyword = Boolean(keyword);

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
    const paginationWhere = buildPinnedPostCursorWhere(paginationCursor, 'next');
    if (paginationWhere) {
      andConditions.push(paginationWhere);
    }
  }

  const postWhere = {
    status: 'PUBLISHED' as const,
    categoryId: { in: selectedCategoryIds },
    AND: andConditions.length > 0 ? andConditions : undefined,
  };

  const canViewReportStats = currentUser ? canMakeFinalUserDecision(currentUser) : false;

  const selectBase = {
    id: true,
    title: true,
    body: true,
    createdAt: true,
    viewCount: true,
    isPinned: true,
    pinnedAt: true,
    price: true,
    category: { select: { name: true, type: true as unknown as true, color: true } },
    city: { select: { name: true } },
    author: {
      select: {
        displayName: true,
        profileImageUrl: true,
        neighbourWarmth: true,
        accountType: true,
      },
    },
    tags: {
      select: {
        postTagOption: { select: { id: true, label: true } },
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
      orderBy: { sortOrder: 'asc' as const },
      take: 1,
    },
    _count: {
      select: {
        comments: { where: { status: 'PUBLISHED' as const } },
        postLikes: true,
        ...(canViewReportStats ? { reports: true } : {}),
      },
    },
  };

  const posts = await prisma.post.findMany({
    where: postWhere,
    orderBy: PINNED_POST_ORDER_DESC,
    take: PAGE_SIZE + 1,
    select: selectBase,
  });

  const hasExtra = posts.length > PAGE_SIZE;
  const visiblePosts = hasExtra ? posts.slice(0, PAGE_SIZE) : posts;
  const lastPost = visiblePosts[visiblePosts.length - 1];
  const nextCursor =
    hasExtra && lastPost
      ? encodeCursor({
          id: lastPost.id,
          createdAt: lastPost.createdAt,
          isPinned: lastPost.isPinned,
          pinnedAt: lastPost.pinnedAt,
        })
      : null;

  return NextResponse.json({
    posts: visiblePosts.map((post) => ({
      id: post.id,
      title: post.title,
      bodyPreview: post.body.slice(0, BODY_PREVIEW_LENGTH),
      href: `/posts/${post.id}`,
      createdAt: post.createdAt.toISOString(),
      isPinned: post.isPinned,
      pinnedAt: post.pinnedAt?.toISOString() ?? null,
      price: post.price ? post.price.toString() : null,
      thumbnailUrl: post.images[0]?.url ?? null,
      commentCount: post._count.comments,
      likeCount: post._count.postLikes,
      viewCount: post.viewCount,
      reportCount: canViewReportStats
        ? (post._count as { reports?: number }).reports ?? 0
        : undefined,
      isLikedByCurrentUser: post.postLikes.length > 0,
      isSavedByCurrentUser: post.savedBy.length > 0,
      tags: post.tags.map((tag) => tag.postTagOption),
      category: post.category as { name: string; type: CategoryType; color: string | null },
      city: post.city,
      author: {
        displayName: post.author.displayName,
        profileImageUrl: post.author.profileImageUrl,
        isOperator: shouldShowOperatorBadge(post.author),
      },
    })),
    nextCursor,
    hasNextPage: hasExtra,
  });
}
