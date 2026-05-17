import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { InfinitePostList } from '@/components/posts/infinite-post-list';
import type { InfinitePostItem } from '@/components/posts/infinite-post-list';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { getCurrentUser } from '@/lib/auth/session';
import { shouldShowOperatorBadge } from '@/lib/account-type';
import { prisma } from '@/lib/db/prisma';
import { canAccessOperatorBoard } from '@/lib/permissions';
import { encodeCursor } from '@/lib/posts/cursor';
import {
  PINNED_POST_ORDER_DESC,
} from '@/lib/posts/pinned-order';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '운영진 게시판',
  description: '전 세계 운영진이 함께 보는 공지 게시판',
};

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

export default async function CoordinatorBoardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canAccessOperatorBoard(currentUser)) {
    redirect('/posts');
  }

  // 운영진 카테고리 = 운영진 전용 카테고리 (일반 피드에 노출되지 않음)
  const hiddenCategories = await prisma.category.findMany({
    where: {
      isActive: true,
      visibilityMode: { in: ['OPERATOR_BOARD', 'OPERATOR_NOTICE'] },
    },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  });

  const hiddenCategoryIds = hiddenCategories.map((c) => c.id);

  let initialPosts: InfinitePostItem[] = [];
  let nextCursor: string | null = null;

  if (hiddenCategoryIds.length > 0) {
    const posts = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        categoryId: { in: hiddenCategoryIds },
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
    const visiblePosts = hasExtra ? posts.slice(0, PAGE_SIZE) : posts;
    const lastPost = visiblePosts[visiblePosts.length - 1];
    nextCursor =
      hasExtra && lastPost
        ? encodeCursor({
            id: lastPost.id,
            createdAt: lastPost.createdAt,
            isPinned: lastPost.isPinned,
            pinnedAt: lastPost.pinnedAt,
          })
        : null;

    initialPosts = visiblePosts.map((post) => ({
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
    }));
  }

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">운영진 게시판</h1>
        <p className="text-sm text-[#888]">
          전 세계 운영진 글을 함께 보고 논의하는 공간이에요.
        </p>
      </div>

      {hiddenCategoryIds.length === 0 ? (
        <EmptyStateMessage
          title="운영진 카테고리가 없습니다."
          description="관리자 페이지에서 OPERATOR_BOARD 또는 OPERATOR_NOTICE 카테고리를 생성해 주세요."
        />
      ) : initialPosts.length === 0 ? (
        <EmptyStateMessage
          title="게시글이 없어요."
          description="운영진 게시판에 올라온 글이 없습니다."
        />
      ) : (
        <InfinitePostList
          initialPosts={initialPosts}
          initialNextCursor={nextCursor}
          fetchApiUrl="/api/posts/operator-board"
          cardConfig={{
            mode: 'operator-board',
            showLikeAction: true,
            showSaveAction: true,
            returnTo: '/coordinator/board',
          }}
        />
      )}
    </section>
  );
}
