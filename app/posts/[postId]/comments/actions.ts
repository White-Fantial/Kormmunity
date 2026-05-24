'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { trackServerEvent } from '@/lib/analytics/server';
import { assertNoSpamText, enforceRateLimit } from '@/lib/abuse/guard';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { notifyCommentForPost } from '@/lib/kakao/message';
import { canCreateComment, canDeleteComment, canReportComment, isAdmin } from '@/lib/permissions';
import {
  adjustNeighbourWarmth,
} from '@/lib/neighbour-warmth';
import {
  applyCommunityScoreChange,
} from '@/lib/community-score';
import { createNotification } from '@/lib/notifications';
import { getWarmthConfig } from '@/lib/reputation-settings';
import { canActorUseAuthorForScope } from '@/lib/posts/author-account-options';

const MAX_COMMENT_BODY_LENGTH = 500;
const COMMENT_STATUS = {
  PUBLISHED: 'PUBLISHED',
  DELETED: 'DELETED',
} as const;
const CREATE_COMMENT_RATE_LIMIT = {
  limit: 8,
  windowMs: 60_000,
};

export type CreateInteractiveCommentState = {
  status: 'idle' | 'success' | 'error';
  message: string | null;
  createdCommentId: string | null;
};

const INITIAL_CREATE_INTERACTIVE_COMMENT_STATE: CreateInteractiveCommentState = {
  status: 'idle',
  message: null,
  createdCommentId: null,
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * 게시글 상세 페이지로 에러 메시지를 포함해 리다이렉트합니다.
 * redirect()가 예외를 던지므로 never를 반환해 이후 코드에서 타입이 안전하게 좁혀지도록 합니다.
 */
function redirectWithPostError(postId: string, message: string): never {
  redirect(`/posts/${postId}?error=${encodeURIComponent(message)}`);
}

async function createComment(
  user: Awaited<ReturnType<typeof requireUser>>,
  postId: string,
  body: string,
  authorUserIdOverride: string,
) {
  if (!postId) {
    return { ok: false as const, message: '잘못된 게시글입니다.' };
  }

  if (!canCreateComment(user)) {
    return { ok: false as const, message: '댓글을 작성할 권한이 없습니다.' };
  }

  if (!body) {
    return { ok: false as const, message: '댓글 내용을 입력해 주세요.' };
  }

  if (body.length > MAX_COMMENT_BODY_LENGTH) {
    return {
      ok: false as const,
      message: `댓글은 ${MAX_COMMENT_BODY_LENGTH}자 이하로 작성해 주세요.`,
    };
  }

  try {
    if (!isAdmin(user)) {
      enforceRateLimit({
        key: `create-comment:${user.id}`,
        limit: CREATE_COMMENT_RATE_LIMIT.limit,
        windowMs: CREATE_COMMENT_RATE_LIMIT.windowMs,
        message: '댓글 작성이 너무 빨라요. 잠시 후 다시 시도해 주세요.',
      });

      assertNoSpamText(body);
    }
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error
          ? error.message
          : '댓글을 등록할 수 없어요. 잠시 후 다시 시도해 주세요.',
    };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      countryId: true,
      cityId: true,
      status: true,
      title: true,
      body: true,
      authorId: true,
    },
  });

  if (!post || post.status !== 'PUBLISHED') {
    return { ok: false as const, message: '댓글을 작성할 수 없는 게시글입니다.' };
  }

  let resolvedAuthor = {
    id: user.id,
    displayName: user.displayName,
  };

  if (authorUserIdOverride) {
    if (!isAdmin(user)) {
      return { ok: false as const, message: '작성 계정을 선택할 권한이 없습니다.' };
    }

    const targetAuthor = await prisma.user
      .findUnique({
        where: { id: authorUserIdOverride },
        select: {
          id: true,
          displayName: true,
          staffAssignments: {
            where: { isActive: true },
            select: { id: true, role: true, countryId: true, cityId: true },
          },
          accountType: true,
          isManagedAccount: true,
          isActive: true,
          status: true,
          countryId: true,
          cityId: true,
          city: {
            select: {
              countryId: true,
            },
          },
        },
      });

    if (
      !targetAuthor ||
      !canActorUseAuthorForScope(user, targetAuthor, {
        countryId: post.countryId,
        cityId: post.cityId,
      })
    ) {
      return {
        ok: false as const,
        message: '선택한 작성 계정으로 이 게시글에 댓글을 작성할 수 없습니다.',
      };
    }

    resolvedAuthor = targetAuthor;
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: resolvedAuthor.id,
      createdByUserId: user.id,
      body,
      status: COMMENT_STATUS.PUBLISHED,
    },
    select: { id: true },
  });

  if (post.authorId !== resolvedAuthor.id) {
    void notifyCommentForPost({
      postId,
      postTitle: post.title,
      postBody: post.body,
      commenterDisplayName: resolvedAuthor.displayName,
      commentBody: body,
    }).catch((error) => {
      console.error('[createCommentAction] failed to send comment notification', error);
    });

    void createNotification({
      recipientId: post.authorId,
      type: 'COMMENT_CREATED',
      relatedPostId: postId,
      relatedCommentId: comment.id,
      actorId: resolvedAuthor.id,
    }).catch((error) => {
      console.error('[createCommentAction] notification creation failed', error);
    });
  }

  trackServerEvent('comment_created', {
    userId: user.id,
    postId,
  });

  revalidatePath(`/posts/${postId}`);

  return {
    ok: true as const,
    postId,
    commentId: comment.id,
  };
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const body = normalizeText(formData.get('body'));
  const authorUserIdOverride = normalizeText(formData.get('authorUserIdOverride'));

  if (!postId) {
    redirect('/posts');
  }

  const result = await createComment(user, postId, body, authorUserIdOverride);

  if (!result.ok) {
    redirectWithPostError(postId, result.message);
  }
}

export async function createInteractiveCommentAction(
  previousState: CreateInteractiveCommentState = INITIAL_CREATE_INTERACTIVE_COMMENT_STATE,
  formData: FormData,
): Promise<CreateInteractiveCommentState> {
  void previousState;
  return submitInteractiveCommentAction(formData);
}

export async function submitInteractiveCommentAction(
  formData: FormData,
): Promise<CreateInteractiveCommentState> {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const body = normalizeText(formData.get('body'));
  const authorUserIdOverride = normalizeText(formData.get('authorUserIdOverride'));
  const result = await createComment(user, postId, body, authorUserIdOverride);

  if (!result.ok) {
    return {
      status: 'error',
      message: result.message,
      createdCommentId: null,
    };
  }

  return {
    status: 'success',
    message: '댓글이 등록되었어요.',
    createdCommentId: result.commentId,
  };
}

export async function deleteCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const commentId = normalizeText(formData.get('commentId'));

  if (!postId || !commentId) {
    redirect('/posts');
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, postId: true, authorId: true },
  });

  if (!comment || comment.postId !== postId || !canDeleteComment(user, comment)) {
    redirectWithPostError(postId, '댓글을 삭제할 권한이 없습니다.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({
      where: { id: commentId },
      data: { status: COMMENT_STATUS.DELETED },
    });

    await tx.post.updateMany({
      where: { id: postId, bestCommentId: commentId },
      data: { bestCommentId: null },
    });
  });

  revalidatePath(`/posts/${postId}`);
}

export async function toggleCommentLikeAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const commentId = normalizeText(formData.get('commentId'));

  if (!postId || !commentId) {
    redirect('/posts');
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      postId: true,
      status: true,
      authorId: true,
      author: { select: { neighbourWarmth: true } },
    },
  });

  if (!comment || comment.postId !== postId || comment.status !== COMMENT_STATUS.PUBLISHED) {
    redirectWithPostError(postId, '댓글을 찾을 수 없어요.');
  }

  let isNewLike = false;
  const { baseDelta: commentLikeWarmthDelta, curve: warmthCurve } = await getWarmthConfig(
    'COMMENT_LIKE_RECEIVED',
  );

  await prisma.$transaction(async (tx) => {
    const existingLike = await tx.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (existingLike) {
      await tx.commentLike.delete({ where: { id: existingLike.id } });
      return;
    }

    isNewLike = true;
    await tx.commentLike.create({
      data: {
        commentId,
        userId: user.id,
      },
    });

    if (comment.authorId === user.id) {
      return;
    }

    await tx.user.update({
      where: { id: comment.authorId },
      data: {
        neighbourWarmth: adjustNeighbourWarmth(
          comment.author.neighbourWarmth,
          commentLikeWarmthDelta,
          warmthCurve,
        ),
      },
    });
  });

  if (isNewLike && comment.authorId !== user.id) {
    void applyCommunityScoreChange({
      targetType: 'COMMENT',
      targetId: commentId,
      actorId: user.id,
      reason: 'COMMENT_LIKE_RECEIVED',
    }).catch((err) => {
      console.error('[toggleCommentLikeAction] community score update failed', err);
    });

    void createNotification({
      recipientId: comment.authorId,
      type: 'COMMENT_LIKE',
      relatedPostId: postId,
      relatedCommentId: commentId,
      actorId: user.id,
    }).catch((err) => {
      console.error('[toggleCommentLikeAction] notification creation failed', err);
    });
  }

  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  revalidatePath(`/users/${comment.authorId}`);
  revalidatePath('/my/profile');
}

export async function setBestCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const commentId = normalizeText(formData.get('commentId'));

  if (!postId || !commentId) {
    redirect('/posts');
  }

  const [post, comment] = await Promise.all([
    prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, status: true, bestCommentId: true },
    }),
    prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        postId: true,
        status: true,
        authorId: true,
        author: { select: { neighbourWarmth: true } },
      },
    }),
  ]);

  if (!post || post.status === 'DELETED') {
    redirectWithPostError(postId, '게시글을 찾을 수 없어요.');
  }

  if (post.authorId !== user.id) {
    redirectWithPostError(postId, '작성자만 베스트 댓글을 선택할 수 있어요.');
  }

  if (!comment || comment.status !== COMMENT_STATUS.PUBLISHED || comment.postId !== post.id) {
    redirectWithPostError(postId, '같은 게시글의 댓글만 베스트 댓글로 선택할 수 있어요.');
  }

  const shouldIncreaseWarmth = post.bestCommentId !== comment.id && comment.authorId !== user.id;
  const isNewBestComment = post.bestCommentId !== comment.id && comment.authorId !== user.id;
  const { baseDelta: bestCommentWarmthDelta, curve: bestCommentWarmthCurve } = await getWarmthConfig(
    'BEST_COMMENT_SELECTED',
  );

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: { bestCommentId: comment.id },
    });

    if (!shouldIncreaseWarmth) {
      return;
    }

    await tx.user.update({
      where: { id: comment.authorId },
      data: {
        neighbourWarmth: adjustNeighbourWarmth(
          comment.author.neighbourWarmth,
          bestCommentWarmthDelta,
          bestCommentWarmthCurve,
        ),
      },
    });
  });

  if (isNewBestComment) {
    void applyCommunityScoreChange({
      targetType: 'COMMENT',
      targetId: commentId,
      actorId: user.id,
      reason: 'BEST_COMMENT_SELECTED',
    }).catch((err) => {
      console.error('[setBestCommentAction] community score update failed', err);
    });

    void createNotification({
      recipientId: comment.authorId,
      type: 'BEST_COMMENT_SELECTED',
      relatedPostId: postId,
      relatedCommentId: commentId,
      actorId: user.id,
    }).catch((err) => {
      console.error('[setBestCommentAction] notification creation failed', err);
    });
  }

  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  revalidatePath(`/users/${comment.authorId}`);
  revalidatePath('/my/profile');
}

export async function removeBestCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));

  if (!postId) {
    redirect('/posts');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    redirectWithPostError(postId, '게시글을 찾을 수 없어요.');
  }

  if (post.authorId !== user.id) {
    redirectWithPostError(postId, '작성자만 베스트 댓글을 해제할 수 있어요.');
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { bestCommentId: null },
  });

  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
}

export async function reportCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const commentId = normalizeText(formData.get('commentId'));
  const optionId = normalizeText(formData.get('optionId'));
  const additionalReason = normalizeText(formData.get('additionalReason'));

  if (!postId || !commentId) {
    redirect('/posts');
  }

  if (!optionId) {
    redirectWithPostError(postId, '신고 사유를 선택해 주세요.');
  }

  if (additionalReason && additionalReason.length > 500) {
    redirectWithPostError(postId, '추가 사유는 500자 이내로 입력해 주세요.');
  }

  const [comment, option] = await Promise.all([
    prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, postId: true, authorId: true, status: true },
    }),
    prisma.reportOption.findFirst({
      where: { id: optionId, isActive: true },
      select: { id: true },
    }),
  ]);

  if (!comment || comment.postId !== postId || !canReportComment(user, comment)) {
    redirectWithPostError(postId, '신고할 수 없는 댓글입니다.');
  }

  if (!option) {
    redirectWithPostError(postId, '유효한 신고 사유를 선택해 주세요.');
  }

  const existingCommentReport = await prisma.commentReport.findUnique({
    where: { commentId_reporterId: { commentId, reporterId: user.id } },
    select: { id: true },
  });

  await prisma.commentReport.upsert({
    where: {
      commentId_reporterId: {
        commentId,
        reporterId: user.id,
      },
    },
    update: {
      optionId: option.id,
      additionalReason: additionalReason || null,
    },
    create: {
      commentId,
      reporterId: user.id,
      optionId: option.id,
      additionalReason: additionalReason || null,
    },
  });

  if (!existingCommentReport) {
    void applyCommunityScoreChange({
      targetType: 'COMMENT',
      targetId: commentId,
      actorId: user.id,
      reason: 'COMMENT_REPORT_SUBMITTED',
    }).catch((err) => {
      console.error('[reportCommentAction] community score update failed', err);
    });
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath('/moderator');
  revalidatePath('/moderator/reports');
  redirect(`/posts/${postId}?success=${encodeURIComponent('댓글 신고가 접수되었어요.')}`);
}
