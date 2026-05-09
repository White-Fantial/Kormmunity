'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canCreateComment, canDeleteComment } from '@/lib/permissions';

const MAX_COMMENT_BODY_LENGTH = 500;
const COMMENT_STATUS = {
  PUBLISHED: 'PUBLISHED',
  DELETED: 'DELETED',
} as const;

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

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
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

  revalidatePath('/posts');
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

  await prisma.comment.update({
    where: { id: commentId },
    data: { status: COMMENT_STATUS.DELETED },
  });

  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
}
