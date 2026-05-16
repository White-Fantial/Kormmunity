import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PostCard } from '@/components/posts/post-card';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { getCurrentUser } from '@/lib/auth/session';
import { shouldShowOperatorBadge } from '@/lib/account-type';
import { prisma } from '@/lib/db/prisma';
import { canAccessOperatorBoard } from '@/lib/permissions';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';
import {
  buildPinnedPostCursorWhere,
  PINNED_POST_ORDER_ASC,
  PINNED_POST_ORDER_DESC,
} from '@/lib/posts/pinned-order';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '운영진 게시판',
  description: '코디네이터 전용 공지 게시판',
};

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

type BoardPageProps = {
  searchParams: Promise<{
    cursor?: string | string[];
    direction?: string | string[];
  }>;
};

function toSingle(value: string | string[] | undefined): string {
  if (!value) return '';
  return (Array.isArray(value) ? value[0] : value).trim();
}

export default async function CoordinatorBoardPage({ searchParams }: BoardPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canAccessOperatorBoard(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const cursorToken = toSingle(params.cursor);
  const paginationCursor = cursorToken ? decodeCursor(cursorToken) : null;
  const paginationDirection = toSingle(params.direction) === 'prev' ? 'prev' : 'next';

  // HIDDEN 카테고리 = 코디네이터 전용 카테고리 (일반 피드에 노출되지 않음)
  const [hiddenCategories, userCity] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, visibilityMode: 'HIDDEN' },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    currentUser.cityId
      ? prisma.city.findUnique({
          where: { id: currentUser.cityId },
          select: { name: true },
        })
      : null,
  ]);

  const userCityId = currentUser.cityId ?? null;
  const cityName = userCity?.name ?? null;

  const andConditions: object[] = [];

  // 도시 자동 고정: 본인 도시 게시글 + 전체 공개(cityId=null) 게시글
  if (userCityId) {
    andConditions.push({
      OR: [{ cityId: userCityId }, { cityId: null }],
    });
  }

  if (paginationCursor) {
    const paginationWhere = buildPinnedPostCursorWhere(paginationCursor, paginationDirection);
    if (paginationWhere) {
      andConditions.push(paginationWhere);
    }
  }

  const hiddenCategoryIds = hiddenCategories.map((c) => c.id);

  let normalizedPosts: Array<{
    id: string;
    title: string | null;
    bodyPreview: string;
    createdAt: Date;
    isPinned: boolean;
    pinnedAt: Date | null;
    tags: { id: string; label: string }[];
    price: string | null;
    thumbnailUrl: string | null;
    commentCount: number;
    likeCount: number;
    isLikedByCurrentUser: boolean;
    isSavedByCurrentUser: boolean;
    category: { name: string; type: string; color: string | null };
    city: { name: string } | null;
    author: { displayName: string; profileImageUrl: string | null; isOperator: boolean };
  }> = [];
  let hasNextPage = false;
  let hasPrevPage = false;

  if (hiddenCategoryIds.length > 0) {
    const postWhere = {
      status: 'PUBLISHED' as const,
      categoryId: { in: hiddenCategoryIds },
      AND: andConditions.length > 0 ? andConditions : undefined,
    };

    const posts = await prisma.post.findMany({
      where: postWhere,
      orderBy:
        paginationDirection === 'prev' ? PINNED_POST_ORDER_ASC : PINNED_POST_ORDER_DESC,
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        isPinned: true,
        pinnedAt: true,
        tags: {
          select: {
            postTagOption: { select: { id: true, label: true } },
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
    const slicedPosts = hasExtra ? posts.slice(0, PAGE_SIZE) : posts;
    const pagePosts =
      paginationDirection === 'prev' ? [...slicedPosts].reverse() : slicedPosts;

    hasPrevPage =
      paginationDirection === 'prev' ? hasExtra : Boolean(paginationCursor);
    hasNextPage =
      paginationDirection === 'prev' ? Boolean(paginationCursor) : hasExtra;

    normalizedPosts = pagePosts.map((post) => ({
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
      isLikedByCurrentUser: post.postLikes.length > 0,
      isSavedByCurrentUser: post.savedBy.length > 0,
      category: post.category,
      city: post.city,
      author: {
        displayName: post.author.displayName,
        profileImageUrl: post.author.profileImageUrl,
        isOperator: shouldShowOperatorBadge(post.author),
      },
    }));
  }

  const firstPost = normalizedPosts[0];
  const lastPost = normalizedPosts[normalizedPosts.length - 1];
  const prevCursor = firstPost
    ? encodeCursor({
        id: firstPost.id,
        createdAt: firstPost.createdAt,
        isPinned: firstPost.isPinned,
        pinnedAt: firstPost.pinnedAt,
      })
    : null;
  const nextCursor = lastPost
    ? encodeCursor({
        id: lastPost.id,
        createdAt: lastPost.createdAt,
        isPinned: lastPost.isPinned,
        pinnedAt: lastPost.pinnedAt,
      })
    : null;

  const createListHref = (cursor: string, direction: 'next' | 'prev') => {
    const query = new URLSearchParams();
    query.set('cursor', cursor);
    if (direction === 'prev') query.set('direction', direction);
    return `/coordinator/board?${query.toString()}`;
  };

  const createDetailHref = (postId: string) => {
    const query = new URLSearchParams();
    if (cursorToken) query.set('cursor', cursorToken);
    if (paginationDirection === 'prev') query.set('direction', 'prev');
    const queryString = query.toString();
    return `/posts/${postId}${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">운영진 게시판</h1>
        <p className="text-sm text-[#888]">
          {cityName
            ? `${cityName} 공지 및 전체 공지`
            : '전체 공지 (내 프로필에 도시를 설정하면 해당 도시 공지도 표시됩니다)'}
        </p>
      </div>

      {hiddenCategoryIds.length === 0 ? (
        <EmptyStateMessage
          title="운영진 카테고리가 없습니다."
          description="관리자 페이지에서 HIDDEN 카테고리를 생성해 주세요."
        />
      ) : normalizedPosts.length === 0 ? (
        <div className="space-y-3">
          <EmptyStateMessage
            title="게시글이 없어요."
            description="운영진 게시판에 올라온 글이 없습니다."
          />
          {hasPrevPage && prevCursor ? (
            <div className="flex justify-center">
              <Link
                href={createListHref(prevCursor, 'prev')}
                className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm hover:bg-[#f9f9f9]"
              >
                이전 페이지로 이동
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {normalizedPosts.map((post) => (
              <PostCard
                key={post.id}
                variant="featured"
                displayVariant="feed"
                post={{
                  ...post,
                  href: createDetailHref(post.id),
                  isRecommended: post.likeCount >= 10,
                }}
                showLikeAction
                showSaveAction
                returnTo="/coordinator/board"
              />
            ))}
          </div>
          {hasPrevPage || hasNextPage ? (
            <nav
              className="flex items-center justify-center gap-2"
              aria-label="게시글 목록 페이지 이동"
            >
              {hasPrevPage && prevCursor ? (
                <Link
                  href={createListHref(prevCursor, 'prev')}
                  className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm hover:bg-[#f9f9f9]"
                >
                  이전
                </Link>
              ) : null}
              <span className="text-sm text-[#666]">커서 페이지네이션</span>
              {hasNextPage && nextCursor ? (
                <Link
                  href={createListHref(nextCursor, 'next')}
                  className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm hover:bg-[#f9f9f9]"
                >
                  다음
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
