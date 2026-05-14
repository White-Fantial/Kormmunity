import Link from 'next/link';
import type { Metadata } from 'next';

import { PostCard } from '@/components/posts/post-card';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';
import { measureServerTiming } from '@/lib/performance/server';



export const dynamic = 'force-dynamic';
const BODY_PREVIEW_LENGTH = 40;
const PAGE_SIZE = 20;
export const metadata: Metadata = {
  title: '저장한 글',
  description: '저장해 둔 게시글을 모아볼 수 있어요.',
};

type MySavedPostsPageProps = {
  searchParams: Promise<{ error?: string; cursor?: string; direction?: string }>;
};

export default async function MySavedPostsPage({ searchParams }: MySavedPostsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const cursorToken = (params.cursor ?? '').trim();
  const cursor = cursorToken ? decodeCursor(cursorToken) : null;
  const direction = params.direction === 'prev' ? 'prev' : 'next';

  const savedPosts = await measureServerTiming('my-saved:list', () =>
    prisma.savedPost.findMany({
      where: {
        userId: user.id,
        post: {
          status: {
            not: 'DELETED',
          },
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
              category: { select: { name: true, color: true } },
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
  const slicedSavedPosts = hasExtra ? savedPosts.slice(0, PAGE_SIZE) : savedPosts;
  const visibleSavedPosts = direction === 'prev' ? [...slicedSavedPosts].reverse() : slicedSavedPosts;
  const hasPrevPage = direction === 'prev' ? hasExtra : Boolean(cursor);
  const hasNextPage = direction === 'prev' ? Boolean(cursor) : hasExtra;
  const firstSavedPost = visibleSavedPosts[0];
  const lastSavedPost = visibleSavedPosts[visibleSavedPosts.length - 1];
  const prevCursor = firstSavedPost
    ? encodeCursor({ id: firstSavedPost.id, createdAt: firstSavedPost.createdAt })
    : null;
  const nextCursor = lastSavedPost
    ? encodeCursor({ id: lastSavedPost.id, createdAt: lastSavedPost.createdAt })
    : null;
  const createPageHref = (nextCursorToken: string, nextDirection: 'next' | 'prev') => {
    const query = new URLSearchParams();
    query.set('cursor', nextCursorToken);
    if (nextDirection === 'prev') {
      query.set('direction', 'prev');
    }

    return `/my/saved?${query.toString()}`;
  };

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
        <ul className="space-y-3">
           {visibleSavedPosts.map(({ postId, post }) => {
            return (
              <li key={postId}>
                <PostCard
                  variant="compact"
                  displayVariant="saved"
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
                    author: {
                      displayName: post.author.displayName,
                      profileImageUrl: null,
                    },
                    commentCount: post._count.comments,
                    likeCount: post._count.postLikes,
                  }}
                  showActiveBookmark
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
