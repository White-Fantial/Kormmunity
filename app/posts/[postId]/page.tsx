import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import {
  deletePostAction,
  markPostAsSoldAction,
} from '@/app/posts/actions';
import {
  createCommentAction,
  deleteCommentAction,
} from '@/app/posts/[postId]/comments/actions';
import {
  holdPostAction,
  restorePostAction,
} from '@/app/coordinator/actions';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canDeleteComment, canHoldPost, canRestorePost } from '@/lib/permissions';
import { SALE_CATEGORY_SLUG } from '@/lib/posts/constants';

export const dynamic = 'force-dynamic';

type PostDetailPageProps = {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function PostDetailPage({
  params,
  searchParams,
}: PostDetailPageProps) {
  const { postId } = await params;
  const query = await searchParams;
  const currentUser = await getCurrentUser();

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          openChatUrl: true,
        },
      },
      category: { select: { name: true, slug: true } },
      city: { select: { name: true } },
      images: {
        select: { id: true, url: true },
        orderBy: { sortOrder: 'asc' },
      },
      comments: {
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          body: true,
          authorId: true,
          createdAt: true,
          author: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!post || post.status === 'DELETED') {
    notFound();
  }

  const isCoordinator = currentUser ? canHoldPost(currentUser) : false;

  // Non-coordinators cannot view HELD posts
  if (post.status === 'HELD' && !isCoordinator) {
    notFound();
  }

  const contactUrl = post.contactUrl ?? post.author.openChatUrl;

  const isOwner = currentUser?.id === post.authorId;
  const canMarkSold =
    isOwner &&
    post.category.slug === SALE_CATEGORY_SLUG &&
    post.saleStatus !== 'SOLD';

  return (
    <article className="space-y-4 rounded-lg border bg-white p-4">
      {query.error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}

      {post.status === 'HELD' ? (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
          이 게시글은 현재 보류 상태입니다.{post.heldReason ? ` 사유: ${post.heldReason}` : ''}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-zinc-100 px-2 py-1">{post.category.name}</span>
        <span className="rounded-full bg-zinc-100 px-2 py-1">{post.city.name}</span>
        {post.saleStatus === 'SOLD' ? (
          <span className="rounded-full bg-zinc-900 px-2 py-1 text-white">판매완료</span>
        ) : null}
      </div>

      {post.title ? <h1 className="text-xl font-semibold">{post.title}</h1> : null}
      <p className="whitespace-pre-wrap text-base leading-7">{post.body}</p>

      {post.images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {post.images.map((image, index) => (
            <div key={image.id} className="relative h-36 overflow-hidden rounded-md border">
              <Image
                src={image.url}
                alt={`${post.title ?? '게시글'} 이미지 ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      {post.price ? (
        <p className="text-sm font-medium">가격: NZD {post.price.toString()}</p>
      ) : null}

      <p className="text-sm text-zinc-500">
        작성자: {post.author.displayName} · {new Date(post.createdAt).toLocaleString('ko-KR')}
      </p>

      {contactUrl ? (
        <a
          href={contactUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-md border px-3 py-2 text-sm"
        >
          카카오톡으로 연락하기
        </a>
      ) : (
        <p className="text-sm text-zinc-500">작성자가 연락 링크를 등록하지 않았어요.</p>
      )}

      {isOwner ? (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Link href={`/posts/${post.id}/edit`} className="rounded-md border px-3 py-2 text-sm">
            수정
          </Link>
          {canMarkSold ? (
            <form action={markPostAsSoldAction}>
              <input type="hidden" name="postId" value={post.id} />
              <button type="submit" className="rounded-md border px-3 py-2 text-sm">
                판매 완료로 변경
              </button>
            </form>
          ) : null}
          <form action={deletePostAction}>
            <input type="hidden" name="postId" value={post.id} />
            <button type="submit" className="rounded-md border px-3 py-2 text-sm text-red-600">
              삭제하기
            </button>
          </form>
        </div>
      ) : null}

      {isCoordinator ? (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <span className="w-full text-xs text-zinc-400">운영 관리</span>
          {post.status === 'PUBLISHED' && currentUser && canHoldPost(currentUser) ? (
            <details>
              <summary className="cursor-pointer rounded-md border px-3 py-2 text-sm text-yellow-700">
                보류 처리
              </summary>
              <form action={holdPostAction} className="mt-2 space-y-2">
                <input type="hidden" name="postId" value={post.id} />
                <input
                  type="text"
                  name="reason"
                  placeholder="보류 사유 (선택)"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-md bg-yellow-600 px-3 py-1.5 text-sm text-white">
                  보류 확정
                </button>
              </form>
            </details>
          ) : null}
          {post.status === 'HELD' && currentUser && canRestorePost(currentUser) ? (
            <form action={restorePostAction}>
              <input type="hidden" name="postId" value={post.id} />
              <button type="submit" className="rounded-md border border-green-600 px-3 py-2 text-sm text-green-700">
                재게시
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-3 border-t pt-4">
        <h2 className="text-base font-semibold">댓글 {post.comments.length}</h2>

        {currentUser ? (
          <form action={createCommentAction} className="space-y-2">
            <input type="hidden" name="postId" value={post.id} />
            <label htmlFor="comment-body" className="sr-only">
              댓글 입력
            </label>
            <textarea
              id="comment-body"
              name="body"
              required
              rows={3}
              maxLength={500}
              placeholder="댓글을 남겨보세요."
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md border px-3 py-2 text-sm">
              댓글 작성
            </button>
          </form>
        ) : (
          <p className="text-sm text-zinc-500">
            댓글을 작성하려면{' '}
            <Link href="/login" className="underline">
              로그인
            </Link>{' '}
            이 필요해요.
          </p>
        )}

        {post.comments.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 댓글이 없어요.</p>
        ) : (
          <ul className="space-y-3">
            {post.comments.map((comment) => {
              const canDelete = canDeleteComment(currentUser, comment);

              return (
                <li key={comment.id} className="rounded-md border p-3">
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {comment.author.displayName} ·{' '}
                      {new Date(comment.createdAt).toLocaleString('ko-KR')}
                    </span>
                    {canDelete ? (
                      <form action={deleteCommentAction}>
                        <input type="hidden" name="postId" value={post.id} />
                        <input type="hidden" name="commentId" value={comment.id} />
                        <button type="submit" className="text-red-600">
                          삭제
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}
