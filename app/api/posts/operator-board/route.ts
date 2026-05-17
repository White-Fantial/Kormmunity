import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessOperatorBoard } from '@/lib/permissions';
import { shouldShowOperatorBadge } from '@/lib/account-type';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';
import {
  buildPinnedPostCursorWhere,
  PINNED_POST_ORDER_DESC,
} from '@/lib/posts/pinned-order';

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canAccessOperatorBoard(currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const cursorToken = searchParams.get('cursor') ?? '';
  const paginationCursor = cursorToken ? decodeCursor(cursorToken) : null;

  const hiddenCategories = await prisma.category.findMany({
    where: {
      isActive: true,
      visibilityMode: { in: ['OPERATOR_BOARD', 'OPERATOR_NOTICE'] },
    },
    select: { id: true },
  });
  const hiddenCategoryIds = hiddenCategories.map((c) => c.id);

  if (hiddenCategoryIds.length === 0) {
    return NextResponse.json({ posts: [], nextCursor: null, hasNextPage: false });
  }

  const andConditions: object[] = [];
  if (paginationCursor) {
    const paginationWhere = buildPinnedPostCursorWhere(paginationCursor, 'next');
    if (paginationWhere) {
      andConditions.push(paginationWhere);
    }
  }

  const posts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      categoryId: { in: hiddenCategoryIds },
      AND: andConditions.length > 0 ? andConditions : undefined,
    },
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
      tags: {
        select: {
          postTagOption: { select: { id: true, label: true } },
        },
      },
      postLikes: {
        where: { userId: currentUser.id },
        select: { id: true },
        take: 1,
      },
      savedBy: {
        where: { userId: currentUser.id },
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
          comments: { where: { status: 'PUBLISHED' } },
          postLikes: true,
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
      isLikedByCurrentUser: post.postLikes.length > 0,
      isSavedByCurrentUser: post.savedBy.length > 0,
      tags: post.tags.map((tag) => tag.postTagOption),
      category: post.category,
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
