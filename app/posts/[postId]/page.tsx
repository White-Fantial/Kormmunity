import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  reportPostAction,
} from '@/app/posts/actions';
import { savePostAction, unsavePostAction } from '@/app/posts/saved-actions';
import {
  createCommentAction,
  deleteCommentAction,
} from '@/app/posts/[postId]/comments/actions';
import {
  holdPostAction,
  restorePostAction,
} from '@/app/coordinator/actions';
import { DeletePostButton } from '@/components/posts/delete-post-button';
import { PostImageGallery } from '@/components/posts/post-image-gallery';
import { PostTagBadge, withPostTagPrefix } from '@/components/posts/post-tag-badge';
import { PostShareButton } from '@/components/posts/post-share-button';
import { PostMarkdown } from '@/components/posts/post-markdown';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  canDeleteComment,
  canHoldPost,
  canReportPost,
  canRestorePost,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const TITLE_PREVIEW_LENGTH = 40;
const DESCRIPTION_PREVIEW_LENGTH = 80;
const COMMUNITY_NAME = '한인 커뮤니티';
const TWITTER_CARD_SUMMARY = 'summary';
const TWITTER_CARD_LARGE_IMAGE = 'summary_large_image';

type PostDetailPageProps = {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export async function generateMetadata({
  params,
}: Pick<PostDetailPageProps, 'params'>): Promise<Metadata> {
  const { postId } = await params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      title: true,
      body: true,
      status: true,
      images: {
        select: { url: true },
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
      category: { select: { name: true } },
      tags: {
        select: {
          postTagOption: {
            select: { label: true },
          },
        },
        take: 1,
      },
      city: { select: { name: true } },
    },
  });

  if (!post || post.status === 'DELETED') {
    return {
      title: '게시글을 찾을 수 없어요',
      robots: { index: false, follow: false },
    };
  }

  const title = withPostTagPrefix(
    post.title ?? post.body.slice(0, TITLE_PREVIEW_LENGTH),
    post.tags[0]?.postTagOption.label,
  );
  const socialTitle = `${title} | ${COMMUNITY_NAME}`;
  const description = `${post.category.name} · ${post.city?.name ?? '전 지역'} · ${post.body.slice(0, DESCRIPTION_PREVIEW_LENGTH)}`;
  const primaryImageUrl = post.images?.[0]?.url;
  const twitterCard = primaryImageUrl ? TWITTER_CARD_LARGE_IMAGE : TWITTER_CARD_SUMMARY;

  return {
    title,
    description,
    openGraph: {
      title: socialTitle,
      description,
      type: 'article',
      images: primaryImageUrl ? [primaryImageUrl] : undefined,
    },
    twitter: {
      card: twitterCard,
      title: socialTitle,
      description,
      images: primaryImageUrl ? [primaryImageUrl] : undefined,
    },
  };
}

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
          profileImageUrl: true,
          openChatUrl: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          color: true,
        },
      },
      tags: {
        select: {
          postTagOption: {
            select: { id: true, label: true, isActive: true },
          },
        },
      },
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
              profileImageUrl: true,
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
  const canSubmitReport = currentUser ? canReportPost(currentUser, post) : false;
  let reportOptions: { id: string; label: string }[] = [];
  let myReport: { optionId: string; additionalReason: string | null } | null = null;
  let isSaved = false;

  if (currentUser) {
    const savedPostPromise = prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId: currentUser.id,
          postId: post.id,
        },
      },
      select: { id: true },
    });

    if (canSubmitReport) {
      const [savedPost, options, report] = await Promise.all([
        savedPostPromise,
        prisma.reportOption.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, label: true },
        }),
        prisma.postReport.findUnique({
          where: {
            postId_reporterId: {
              postId: post.id,
              reporterId: currentUser.id,
            },
          },
          select: { optionId: true, additionalReason: true },
        }),
      ]);

      isSaved = Boolean(savedPost);
      reportOptions = options;
      myReport = report;
    } else {
      isSaved = Boolean(await savedPostPromise);
    }
  }

  const isOwner = currentUser?.id === post.authorId;
  const outlineActionButtonClass =
    'inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]';
  const primaryActionButtonClass =
    'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]';
  const dangerActionButtonClass =
    'inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50';

  return (
    <article className="space-y-4 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}
      {query.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>
      ) : null}

      {post.status === 'HELD' ? (
        <div className="rounded-lg border border-yellow-200 bg-[#fffde7] px-3 py-2 text-sm text-[#7a6000]">
          <span>이 게시글은 현재 보류 상태입니다.</span>
          {post.heldReason ? <span> 사유: {post.heldReason}</span> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[#fffde7] px-2 py-1 font-medium text-[#7a6000]">{post.category.name}</span>
        <span className="rounded-full bg-[#f5f5f5] px-2 py-1 text-[#555]">{post.city?.name ?? '전 지역'}</span>
        {post.tags.map((tag) => (
          <PostTagBadge
            key={tag.postTagOption.id}
            label={tag.postTagOption.label}
            categoryColor={post.category.color}
          />
        ))}
      </div>

      {post.title ? (
        <h1 className="text-xl font-bold">{withPostTagPrefix(post.title, post.tags[0]?.postTagOption.label)}</h1>
      ) : null}
      <PostMarkdown body={post.body} />

      {post.images.length > 0 ? (
        <PostImageGallery images={post.images} postTitle={post.title} />
      ) : null}

      {post.price ? (
        <p className="text-base font-bold text-[#3c1e1e]">가격: NZD {post.price.toString()}</p>
      ) : null}

      <div className="flex items-center gap-2 text-sm text-[#888]">
        <UserAvatar
          displayName={post.author.displayName}
          profileImageUrl={post.author.profileImageUrl}
          className="h-7 w-7"
          sizes="28px"
        />
        <span>
          작성자: {post.author.displayName} · {new Date(post.createdAt).toLocaleString('ko-KR')}
        </span>
      </div>

      <div className={currentUser ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2'}>
        {currentUser ? (
          <form action={isSaved ? unsavePostAction : savePostAction}>
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="returnTo" value={`/posts/${post.id}`} />
            <FormSubmitButton
              idleLabel={isSaved ? '저장 취소' : '저장'}
              pendingLabel="처리 중..."
              className={outlineActionButtonClass}
            />
          </form>
        ) : null}
        <PostShareButton
          title={post.title}
          body={post.body}
          className={outlineActionButtonClass}
        />
      </div>

      {contactUrl ? (
        <a
          href={contactUrl}
          target="_blank"
          rel="noreferrer"
          className={primaryActionButtonClass}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
            <path fill="currentColor" d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.62 5.085 4.073 6.525L5.1 21l4.89-2.925c.65.09 1.32.135 2.01.135 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
          </svg>
          카카오톡으로 연락하기
        </a>
      ) : (
        <p className="text-sm text-[#888]">작성자가 연락 링크를 등록하지 않았어요.</p>
      )}
      {isOwner ? (
        <div className="grid grid-cols-2 gap-2 border-t border-[#e8e8e8] pt-4">
          <Link href={`/posts/${post.id}/edit`} className={outlineActionButtonClass}>
            수정
          </Link>
          <DeletePostButton
            postId={post.id}
            className={dangerActionButtonClass}
          />
        </div>
      ) : null}

      {canSubmitReport && reportOptions.length > 0 ? (
        <section className="border-t border-[#e8e8e8] pt-4">
          <details className="group space-y-2">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
              <span>신고하기</span>
              <span aria-hidden="true" className="text-xs text-red-400 transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <div className="space-y-2 pt-2">
              {myReport ? (
                <p className="text-xs text-[#888]">
                  이미 신고한 글입니다. 다시 제출하면 신고 내용이 업데이트됩니다.
                </p>
              ) : null}
              <form action={reportPostAction} className="space-y-2">
                <input type="hidden" name="postId" value={post.id} />
                <label htmlFor="report-option" className="text-xs text-[#555]">
                  신고 사유
                </label>
                <select
                  id="report-option"
                  name="optionId"
                  defaultValue={myReport?.optionId ?? ''}
                  required
                  className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
                >
                  <option value="" disabled>
                    신고 사유를 선택해 주세요
                  </option>
                  {reportOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="report-additional-reason" className="text-xs text-[#555]">
                  추가 사유 (선택)
                </label>
                <textarea
                  id="report-additional-reason"
                  name="additionalReason"
                  rows={3}
                  maxLength={500}
                  defaultValue={myReport?.additionalReason ?? ''}
                  placeholder="옵션 외 추가로 설명할 내용이 있다면 입력해 주세요."
                  className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
                />
                <FormSubmitButton
                  idleLabel={myReport ? '신고 내용 수정' : '신고 접수'}
                  pendingLabel="접수 중..."
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                />
              </form>
            </div>
          </details>
        </section>
      ) : null}

      {isCoordinator ? (
        <div className="flex flex-wrap gap-2 border-t border-[#e8e8e8] pt-4">
          <span className="w-full text-xs text-[#aaa]">운영 관리</span>
          {post.status === 'PUBLISHED' && currentUser && canHoldPost(currentUser) ? (
            <details>
              <summary className="cursor-pointer rounded-xl border border-yellow-300 bg-[#fffde7] px-3 py-2 text-sm font-medium text-[#7a6000]">
                보류 처리
              </summary>
              <form action={holdPostAction} className="mt-2 space-y-2">
                <input type="hidden" name="postId" value={post.id} />
                <input
                  type="text"
                  name="reason"
                  placeholder="보류 사유 (선택)"
                  className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
                />
                <FormSubmitButton
                  idleLabel="보류 확정"
                  pendingLabel="처리 중..."
                  className="rounded-xl bg-[#fee500] px-3 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                />
              </form>
            </details>
          ) : null}
          {post.status === 'HELD' && currentUser && canRestorePost(currentUser) ? (
            <form action={restorePostAction}>
              <input type="hidden" name="postId" value={post.id} />
              <FormSubmitButton
                idleLabel="재게시"
                pendingLabel="처리 중..."
                className="rounded-xl border border-green-300 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
              />
            </form>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-3 border-t border-[#e8e8e8] pt-4">
        <h2 className="text-base font-bold">댓글 {post.comments.length}</h2>

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
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
            />
            <FormSubmitButton
              idleLabel="댓글 작성"
              pendingLabel="등록 중..."
              className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
            />
          </form>
        ) : (
          <p className="text-sm text-[#888]">
            댓글을 작성하려면{' '}
            <Link href="/login" className="font-semibold text-[#3c1e1e] underline">
              로그인
            </Link>{' '}
            이 필요해요.
          </p>
        )}

        {post.comments.length === 0 ? (
          <p className="text-sm text-[#888]">아직 댓글이 없어요.</p>
        ) : (
          <ul className="space-y-3">
            {post.comments.map((comment) => {
              const canDelete = canDeleteComment(currentUser, comment);

              return (
                <li key={comment.id} className="rounded-xl border border-[#e8e8e8] p-3">
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#888]">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        displayName={comment.author.displayName}
                        profileImageUrl={comment.author.profileImageUrl}
                        className="h-6 w-6"
                        sizes="24px"
                      />
                      <span>
                        {comment.author.displayName} ·{' '}
                        {new Date(comment.createdAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    {canDelete ? (
                      <form action={deleteCommentAction}>
                        <input type="hidden" name="postId" value={post.id} />
                        <input type="hidden" name="commentId" value={comment.id} />
                        <FormSubmitButton
                          idleLabel="삭제"
                          pendingLabel="삭제 중..."
                          className="text-red-500"
                        />
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
