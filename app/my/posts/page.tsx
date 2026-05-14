import Link from 'next/link';
import type { Metadata } from 'next';

import { PostCard } from '@/components/posts/post-card';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';
import { measureServerTiming } from '@/lib/performance/server';



export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '내 글',
  description: '내가 작성한 게시글을 관리할 수 있어요.',
};

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

type MyPostsPageProps = {
  searchParams: Promise<{ error?: string; cursor?: string; direction?: string }>;
};

export default async function MyPostsPage({ searchParams }: MyPostsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const cursorToken = (params.cursor ?? '').trim();
  const cursor = cursorToken ? decodeCursor(cursorToken) : null;
  const direction = params.direction === 'prev' ? 'prev' : 'next';

  const posts = await measureServerTiming('my-posts:list', () =>
    prisma.post.findMany({
      where: {
        authorId: user.id,
        status: {
          not: 'DELETED',
        },
        ...(cursor
          ? direction === 'prev'
            ? {
                OR: [
                  { createdAt: { gt: cursor.createdAt } },
                  { AND: [{ createdAt: cursor.createdAt }, { id: { gt: cursor.id } }] },
                ],
              }
            : {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
                ],
              }
          : {}),
      },
      orderBy:
        direction === 'prev'
          ? [{ createdAt: 'asc' }, { id: 'asc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }],
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
  const slicedPosts = hasExtra ? posts.slice(0, PAGE_SIZE) : posts;
  const visiblePosts = direction === 'prev' ? [...slicedPosts].reverse() : slicedPosts;
  const hasPrevPage = direction === 'prev' ? hasExtra : Boolean(cursor);
  const hasNextPage = direction === 'prev' ? Boolean(cursor) : hasExtra;
  const firstPost = visiblePosts[0];
  const lastPost = visiblePosts[visiblePosts.length - 1];
  const prevCursor = firstPost
    ? encodeCursor({ id: firstPost.id, createdAt: firstPost.createdAt })
    : null;
  const nextCursor = lastPost
    ? encodeCursor({ id: lastPost.id, createdAt: lastPost.createdAt })
    : null;
  const createPageHref = (nextCursorToken: string, nextDirection: 'next' | 'prev') => {
    const query = new URLSearchParams();
    query.set('cursor', nextCursorToken);
    if (nextDirection === 'prev') {
      query.set('direction', 'prev');
    }

    return `/my/posts?${query.toString()}`;
  };

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
          <ul className="space-y-3">
           {visiblePosts.map((post) => {
             return (
               <li key={post.id}>
                  <PostCard
                    variant="compact"
                    displayVariant="my-posts"
                    post={{
                      id: post.id,
                      title: post.title,
                      bodyPreview: post.body.slice(0, BODY_PREVIEW_LENGTH),
                     href: `/posts/${post.id}`,
                     createdAt: post.createdAt,
                     thumbnailUrl: post.images[0]?.url ?? null,
                     category: post.category,
                     city: post.city,
                      tags: post.tags.map((tag) => tag.postTagOption),
                      commentCount: post._count.comments,
                      likeCount: post._count.postLikes,
                    }}
                    moreMenu={{ editHref: `/posts/${post.id}/edit`, postId: post.id }}
                  />
               </li>
             );
           })}
        </ul>
      )}

      {hasPrevPage || hasNextPage ? (
        <div className="flex justify-between gap-2 pt-1">
          {hasPrevPage && prevCursor ? (
            <Link
              href={createPageHref(prevCursor, 'prev')}
              className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
            >
              이전
            </Link>
          ) : (
            <span />
          )}
          {hasNextPage && nextCursor ? (
            <Link
              href={createPageHref(nextCursor, 'next')}
              className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
            >
              다음
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
