import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

import { DeletePostButton } from '@/components/posts/delete-post-button';
import { PostTagBadge } from '@/components/posts/post-tag-badge';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';
import { measureServerTiming } from '@/lib/performance/server';


export const runtime = "nodejs";
export const preferredRegion = "syd1";

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
            const titleText = post.title?.trim() ?? '';
             const bodyPreview = post.body.slice(0, BODY_PREVIEW_LENGTH);
            const postHeading = titleText || bodyPreview;
            const thumbnailAlt = titleText
              ? `게시글 썸네일: ${titleText}`
              : '게시글 썸네일: 제목 없는 게시글';

            return (
              <li key={post.id} className="space-y-3 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
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
                  <Link href={`/posts/${post.id}/edit`} className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]">
                    수정
                  </Link>
                  <DeletePostButton
                    postId={post.id}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  />
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
