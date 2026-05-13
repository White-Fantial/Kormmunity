'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { trackServerEvent } from '@/lib/analytics/server';
import { assertNoSpamText, enforceRateLimit } from '@/lib/abuse/guard';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { notifyCommentForPost } from '@/lib/kakao/message';
import { canCreateComment, canDeleteComment } from '@/lib/permissions';
import {
  NEIGHBOUR_WARMTH_BASE_GAINS,
  adjustNeighbourWarmth,
} from '@/lib/neighbour-warmth';

const MAX_COMMENT_BODY_LENGTH = 500;
const COMMENT_STATUS = {
  PUBLISHED: 'PUBLISHED',
  DELETED: 'DELETED',
} as const;
const CREATE_COMMENT_RATE_LIMIT = {
  limit: 8,
  windowMs: 60_000,
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function redirectWithPostError(postId: string, message: string) {
  redirect(`/posts/${postId}?error=${encodeURIComponent(message)}`);
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const body = normalizeText(formData.get('body'));

  if (!postId) {
    redirect('/posts');
  }

  if (!canCreateComment(user)) {
    redirectWithPostError(postId, '댓글을 작성할 권한이 없습니다.');
  }

  if (!body) {
    redirectWithPostError(postId, '댓글 내용을 입력해 주세요.');
  }

  if (body.length > MAX_COMMENT_BODY_LENGTH) {
    redirectWithPostError(
      postId,
      `댓글은 ${MAX_COMMENT_BODY_LENGTH}자 이하로 작성해 주세요.`,
    );
  }

  try {
    enforceRateLimit({
      key: `create-comment:${user.id}`,
      limit: CREATE_COMMENT_RATE_LIMIT.limit,
      windowMs: CREATE_COMMENT_RATE_LIMIT.windowMs,
      message: '댓글 작성이 너무 빨라요. 잠시 후 다시 시도해 주세요.',
    });

    assertNoSpamText(body, '광고/도배로 보이는 댓글은 등록할 수 없어요.');
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '댓글을 등록할 수 없어요. 잠시 후 다시 시도해 주세요.';
    redirectWithPostError(postId, message);
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      title: true,
      body: true,
      authorId: true,
    },
  });

  if (!post || post.status !== 'PUBLISHED') {
    redirectWithPostError(postId, '댓글을 작성할 수 없는 게시글입니다.');
  }

  await prisma.comment.create({
    data: {
      postId,
      authorId: user.id,
      body,
      status: COMMENT_STATUS.PUBLISHED,
    },
  });

  if (post!.authorId !== user.id) {
    void notifyCommentForPost({
      postId,
      postTitle: post!.title,
      postBody: post!.body,
      commenterDisplayName: user.displayName,
      commentBody: body,
    }).catch((error) => {
      console.error('[createCommentAction] failed to send comment notification', error);
    });
  }

  trackServerEvent('comment_created', {
    userId: user.id,
    postId,
  });

  revalidatePath(`/posts/${postId}`);
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
          NEIGHBOUR_WARMTH_BASE_GAINS.COMMENT_LIKE_RECEIVED,
        ),
      },
    });
  });

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
          NEIGHBOUR_WARMTH_BASE_GAINS.BEST_COMMENT_SELECTED,
        ),
      },
    });
  });

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
