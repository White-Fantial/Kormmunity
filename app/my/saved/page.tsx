import type { Metadata } from 'next';

import { InfinitePostList } from '@/components/posts/infinite-post-list';
import type { InfinitePostItem } from '@/components/posts/infinite-post-list';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { encodeCursor } from '@/lib/posts/cursor';
import { measureServerTiming } from '@/lib/performance/server';



export const dynamic = 'force-dynamic';
const BODY_PREVIEW_LENGTH = 40;
const PAGE_SIZE = 20;
export const metadata: Metadata = {
  title: '저장한 글',
  description: '저장해 둔 게시글을 모아볼 수 있어요.',
};

type MySavedPostsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function MySavedPostsPage({ searchParams }: MySavedPostsPageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const savedPosts = await measureServerTiming('my-saved:list', () =>
    prisma.savedPost.findMany({
      where: {
        userId: user.id,
        post: {
          status: {
            not: 'DELETED',
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        createdAt: true,
        postId: true,
        post: {
          select: {
            id: true,
            title: true,
            body: true,
            createdAt: true,
            viewCount: true,
            price: true,
            tags: {
              select: {
                postTagOption: {
                  select: { id: true, label: true },
                },
              },
            },
            author: {
              select: {
                displayName: true,
              },
            },
            category: { select: { name: true, type: true, color: true } },
            city: { select: { name: true } },
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
        },
      },
    }),
  );

  const hasExtra = savedPosts.length > PAGE_SIZE;
  const visibleSavedPosts = hasExtra ? savedPosts.slice(0, PAGE_SIZE) : savedPosts;
  const lastSavedPost = visibleSavedPosts[visibleSavedPosts.length - 1];
  const nextCursor =
    hasExtra && lastSavedPost
      ? encodeCursor({ id: lastSavedPost.id, createdAt: lastSavedPost.createdAt })
      : null;

  const initialPosts: InfinitePostItem[] = visibleSavedPosts.map(({ post }) => ({
    id: post.id,
    title: post.title,
    bodyPreview: post.body.slice(0, BODY_PREVIEW_LENGTH),
    href: `/posts/${post.id}`,
    createdAt: post.createdAt.toISOString(),
    price: post.price ? post.price.toString() : null,
    thumbnailUrl: post.images[0]?.url ?? null,
    category: post.category,
    city: post.city,
    tags: post.tags.map((tag) => tag.postTagOption),
    author: {
      displayName: post.author.displayName,
      profileImageUrl: null,
    },
    commentCount: post._count.comments,
    likeCount: post._count.postLikes,
    viewCount: post.viewCount,
  }));

  return (
    <section className="space-y-4">
      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      {visibleSavedPosts.length === 0 ? (
        <EmptyStateMessage
          title="저장한 글이 아직 없어요."
          description="관심 있는 글에서 저장 버튼을 누르면 이곳에서 모아볼 수 있어요."
        />
      ) : (
        <InfinitePostList
          initialPosts={initialPosts}
          initialNextCursor={nextCursor}
          fetchApiUrl="/api/posts/saved"
          cardConfig={{ mode: 'saved' }}
        />
      )}
    </section>
  );
}
