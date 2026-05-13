import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

import { unsavePostAction } from '@/app/posts/saved-actions';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { PostTagBadge } from '@/components/posts/post-tag-badge';
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
            const titleText = post.title?.trim() ?? '';
            const bodyPreview = post.body.slice(0, BODY_PREVIEW_LENGTH);
            const postHeading = titleText || bodyPreview;
            const thumbnailAlt = titleText
              ? `게시글 썸네일: ${titleText}`
              : '게시글 썸네일: 제목 없는 게시글';

            return (
              <li key={postId} className="space-y-3 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  {post.images[0]?.url ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#e8e8e8]">
                      <Image
                        src={post.images[0].url}
                        alt={thumbnailAlt}
                        fill
                        sizes="(max-width: 640px) 80px, 80px"
                        quality={60}
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-[#fffde7] px-2 py-1 font-medium text-[#7a6000]">{post.category.name}</span>
                      {post.tags.map((tag) => (
                        <PostTagBadge
                          key={tag.postTagOption.id}
                          label={tag.postTagOption.label}
                          categoryColor={post.category.color}
                        />
                      ))}
                      <span className="rounded-full bg-[#f5f5f5] px-2 py-1 text-[#555]">{post.city?.name ?? '전 지역'}</span>
                    </div>
                    <h2 className="text-base font-semibold">{postHeading}</h2>
                    <p className="line-clamp-2 text-sm text-[#555]">{post.body}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[#888]">
                      <span className="text-[#666]">{post.author.displayName}</span>
                      <span aria-hidden="true">·</span>
                      <span>댓글 {post._count.comments}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={post.createdAt.toISOString()}>
                        {post.createdAt.toLocaleString('ko-KR')}
                      </time>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/posts/${post.id}`} className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]">
                    보기
                  </Link>
                  <form action={unsavePostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="returnTo" value="/my/saved" />
                    <FormSubmitButton
                      idleLabel="저장 취소"
                      pendingLabel="처리 중..."
                      className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    />
                  </form>
                </div>
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
