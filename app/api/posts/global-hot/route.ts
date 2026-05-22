import { NextRequest, NextResponse } from 'next/server';
import type { CategoryType } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import { shouldShowOperatorBadge } from '@/lib/account-type';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';
import { buildPinnedPostCursorWhere, PINNED_POST_ORDER_DESC } from '@/lib/posts/pinned-order';
import { fetchActiveAdSlots, getInlinePlacementRule, insertAdsIntoFeed } from '@/lib/ads/feed-inserter';
import { getGlobalHotSettings } from '@/lib/reputation-settings';

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

export async function GET(request: NextRequest) {
  const [currentUser, globalHot] = await Promise.all([
    getCurrentUser(),
    getGlobalHotSettings(),
  ]);
  const isAdmin = currentUser ? canMakeFinalUserDecision(currentUser) : false;

  if (!globalHot.enabled && !isAdmin) {
    return NextResponse.json(
      { error: '글로벌핫이 현재 비활성화되어 있어요.' },
      { status: 403 },
    );
  }

  const { searchParams } = request.nextUrl;
  const cursorToken = searchParams.get('cursor') ?? '';
  const paginationCursor = cursorToken ? decodeCursor(cursorToken) : null;

  const andConditions: object[] = [];
  if (paginationCursor) {
    const paginationWhere = buildPinnedPostCursorWhere(paginationCursor, 'next');
    if (paginationWhere) {
      andConditions.push(paginationWhere);
    }
  }

  const postWhere = {
    status: 'PUBLISHED' as const,
    communityScore: { gte: globalHot.minScore },
    AND: andConditions.length > 0 ? andConditions : undefined,
  };

  const canViewReportStats = isAdmin;
  const posts = await prisma.post.findMany({
    where: postWhere,
    orderBy: PINNED_POST_ORDER_DESC,
    take: PAGE_SIZE + 1,
    select: {
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
    },
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

  const serializedPosts = visiblePosts.map((post) => ({
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
  }));

  const isFirstPage = !paginationCursor;
  const [adSlots, inlinePlacementRule] = await Promise.all([
    fetchActiveAdSlots({ countryId: currentUser?.countryId ?? null, cityId: currentUser?.cityId ?? null }),
    getInlinePlacementRule(),
  ]);

  const feedItems = insertAdsIntoFeed(serializedPosts, adSlots, inlinePlacementRule, isFirstPage);

  return NextResponse.json({
    posts: feedItems,
    nextCursor,
    hasNextPage: hasExtra,
  });
}
