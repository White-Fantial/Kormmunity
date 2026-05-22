import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { CategoryType } from '@prisma/client';

import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { InfinitePostList } from '@/components/posts/infinite-post-list';
import type { FeedItem, InfinitePostItem } from '@/components/posts/infinite-post-list';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';
import { buildPinnedPostCursorWhere, PINNED_POST_ORDER_ASC, PINNED_POST_ORDER_DESC } from '@/lib/posts/pinned-order';
import { shouldShowOperatorBadge } from '@/lib/account-type';
import { fetchActiveAdSlots, getInlinePlacementRule, insertAdsIntoFeed } from '@/lib/ads/feed-inserter';
import { getGlobalHotSettings } from '@/lib/reputation-settings';

export const metadata: Metadata = {
  title: '글로벌핫',
  description: '전 세계 인기 게시글을 확인해 보세요.',
};

type GlobalHotPageProps = {
  searchParams: Promise<{
    cursor?: string | string[];
    direction?: string | string[];
  }>;
};

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

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
      accountType: 'REAL_USER' | 'PERSONA' | 'OPERATOR' | 'SYSTEM';
    };
  },
): { displayName: string; profileImageUrl: string | null; isOperator: boolean } {
  return {
    displayName: post.author.displayName,
    profileImageUrl: post.author.profileImageUrl,
    isOperator: shouldShowOperatorBadge(post.author),
  };
}

export default async function GlobalHotPage({ searchParams }: GlobalHotPageProps) {
  const [params, currentUser, globalHot] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getGlobalHotSettings(),
  ]);
  const isAdmin = currentUser ? canMakeFinalUserDecision(currentUser) : false;

  if (!globalHot.enabled && !isAdmin) {
    redirect('/posts?error=글로벌핫이 현재 비활성화되어 있어요.');
  }

  const cursorToken = toSingle(params.cursor);
  const paginationCursor = cursorToken ? decodeCursor(cursorToken) : null;
  const paginationDirection = toSingle(params.direction) === 'prev' ? 'prev' : 'next';

  const andConditions: object[] = [];
  if (paginationCursor) {
    const paginationWhere = buildPinnedPostCursorWhere(paginationCursor, paginationDirection);
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
      price: true,
      category: { select: { name: true, type: true, color: true } },
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
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
      _count: {
        select: {
          comments: { where: { status: 'PUBLISHED' } },
          postLikes: true,
          ...(canViewReportStats ? { reports: true } : {}),
        },
      },
    },
  });

  const hasExtra = posts.length > PAGE_SIZE;
  const slicedPosts = hasExtra ? posts.slice(0, PAGE_SIZE) : posts;
  const pagePosts = paginationDirection === 'prev' ? [...slicedPosts].reverse() : slicedPosts;

  const normalizedPosts = pagePosts.map((post) => ({
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
    reportCount: canViewReportStats ? (post._count as { reports?: number }).reports ?? 0 : undefined,
    isLikedByCurrentUser: post.postLikes.length > 0,
    isSavedByCurrentUser: post.savedBy.length > 0,
    category: post.category as { name: string; type: CategoryType; color: string | null },
    city: post.city,
    author: resolvePostAuthor(post),
  }));

  const lastPost = normalizedPosts[normalizedPosts.length - 1];
  const nextCursor = hasExtra && lastPost
    ? encodeCursor({
        id: lastPost.id,
        createdAt: lastPost.createdAt,
        isPinned: lastPost.isPinned,
        pinnedAt: lastPost.pinnedAt,
      })
    : null;

  const isFirstPage = !paginationCursor;
  const [adSlots, inlinePlacementRule] = await Promise.all([
    fetchActiveAdSlots({ countryId: currentUser?.countryId ?? null, cityId: currentUser?.cityId ?? null }),
    getInlinePlacementRule(),
  ]);

  const serializedPosts: InfinitePostItem[] = normalizedPosts.map((post) => ({
    ...post,
    href: `/posts/${post.id}`,
    createdAt: post.createdAt.toISOString(),
    pinnedAt: post.pinnedAt?.toISOString() ?? null,
  }));
  const feedItems: FeedItem[] = insertAdsIntoFeed(
    serializedPosts,
    adSlots,
    inlinePlacementRule,
    isFirstPage,
  );

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-[#666]">핫한 글들이 표시돼요.</p>
      </div>

      {!globalHot.enabled && isAdmin ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          현재 글로벌핫은 비활성화 상태예요. 관리자 미리보기로 노출 중입니다.
        </p>
      ) : null}

      {normalizedPosts.length === 0 ? (
        <EmptyStateMessage
          title="아직 글로벌핫 글이 없어요."
          description={`커뮤니티 점수 ${globalHot.minScore}점 이상 글이 등록되면 여기에 표시돼요.`}
        />
      ) : (
        <InfinitePostList
          initialPosts={feedItems}
          initialNextCursor={nextCursor}
          fetchApiUrl="/api/posts/global-hot"
          cardConfig={{
            mode: 'feed',
            showLikeAction: Boolean(currentUser),
            showSaveAction: Boolean(currentUser),
            returnTo: '/posts/global-hot',
          }}
        />
      )}
    </section>
  );
}
