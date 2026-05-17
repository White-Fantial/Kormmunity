import type { Metadata } from 'next';

import { InfinitePostList } from '@/components/posts/infinite-post-list';
import type { InfinitePostItem } from '@/components/posts/infinite-post-list';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { encodeCursor } from '@/lib/posts/cursor';
import { measureServerTiming } from '@/lib/performance/server';



export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '내 글',
  description: '내가 작성한 게시글을 관리할 수 있어요.',
};

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

type MyPostsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function MyPostsPage({ searchParams }: MyPostsPageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const posts = await measureServerTiming('my-posts:list', () =>
    prisma.post.findMany({
      where: {
        authorId: user.id,
        status: {
          not: 'DELETED',
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      include: {
        city: { select: { name: true } },
        category: {
          select: {
            name: true,
            type: true,
            color: true,
          },
        },
        tags: {
          select: {
            postTagOption: {
              select: { id: true, label: true },
            },
          },
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
  const visiblePosts = hasExtra ? posts.slice(0, PAGE_SIZE) : posts;
  const lastPost = visiblePosts[visiblePosts.length - 1];
  const nextCursor =
    hasExtra && lastPost
      ? encodeCursor({ id: lastPost.id, createdAt: lastPost.createdAt })
      : null;

  const initialPosts: InfinitePostItem[] = visiblePosts.map((post) => ({
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
    commentCount: post._count.comments,
    likeCount: post._count.postLikes,
    viewCount: post.viewCount,
    editHref: `/posts/${post.id}/edit`,
  }));

  return (
    <section className="space-y-4">
      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      {visiblePosts.length === 0 ? (
        <EmptyStateMessage
          title="작성한 글이 아직 없어요."
          description="첫 글을 올리면 이곳에서 쉽게 관리할 수 있어요."
        />
      ) : (
        <InfinitePostList
          initialPosts={initialPosts}
          initialNextCursor={nextCursor}
          fetchApiUrl="/api/posts/my"
          cardConfig={{ mode: 'my-posts' }}
        />
      )}
    </section>
  );
}
