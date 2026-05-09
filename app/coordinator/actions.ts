'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  canHoldPost,
  canRestorePost,
  canDeleteComment,
  canModerateUser,
} from '@/lib/permissions';

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

async function logModerationAction(
  actorId: string,
  targetType: string,
  targetId: string,
  actionType: string,
  reason?: string,
) {
  await prisma.moderationAction.create({
    data: {
      actorId,
      targetType,
      targetId,
      actionType,
      reason: reason || null,
    },
  });
}

export async function holdPostAction(formData: FormData) {
  const user = await requireUser();

  if (!canHoldPost(user)) {
    redirect('/coordinator?error=권한이 없습니다.');
  }

  const postId = normalizeText(formData.get('postId'));
  const reason = normalizeText(formData.get('reason'));

  if (!postId) {
    redirect('/coordinator?error=게시글 ID가 없습니다.');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (!post || post.status === 'DELETED') {
    redirect('/coordinator?error=게시글을 찾을 수 없습니다.');
  }

  if (post.status === 'HELD') {
    redirect('/coordinator?error=이미 보류된 게시글입니다.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        status: 'HELD',
        heldAt: new Date(),
        heldReason: reason || null,
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'POST',
        targetId: postId,
        actionType: 'HOLD',
        reason: reason || null,
      },
    });
  });

  revalidatePath('/coordinator');
  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  redirect('/coordinator');
}

export async function restorePostAction(formData: FormData) {
  const user = await requireUser();

  if (!canRestorePost(user)) {
    redirect('/coordinator?error=권한이 없습니다.');
  }

  const postId = normalizeText(formData.get('postId'));
  const reason = normalizeText(formData.get('reason'));

  if (!postId) {
    redirect('/coordinator?error=게시글 ID가 없습니다.');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (!post) {
    redirect('/coordinator?error=게시글을 찾을 수 없습니다.');
  }

  if (post.status !== 'HELD') {
    redirect('/coordinator?error=보류 상태인 게시글만 복구할 수 있습니다.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        heldAt: null,
        heldReason: null,
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'POST',
        targetId: postId,
        actionType: 'RESTORE',
        reason: reason || null,
      },
    });
  });

  revalidatePath('/coordinator');
  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  redirect('/coordinator');
}

export async function holdCommentAction(formData: FormData) {
  const user = await requireUser();

  const postId = normalizeText(formData.get('postId'));
  const commentId = normalizeText(formData.get('commentId'));
  const reason = normalizeText(formData.get('reason'));

  if (!postId || !commentId) {
    redirect('/coordinator?error=댓글 정보가 없습니다.');
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, postId: true, authorId: true, status: true },
  });

  if (!comment || comment.postId !== postId || !canDeleteComment(user, comment)) {
    redirect('/coordinator?error=권한이 없습니다.');
  }

  if (comment.status === 'HELD') {
    redirect('/coordinator?error=이미 보류된 댓글입니다.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({
      where: { id: commentId },
      data: { status: 'HELD' },
    });

    await tx.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'COMMENT',
        targetId: commentId,
        actionType: 'HOLD',
        reason: reason || null,
      },
    });
  });

  revalidatePath('/coordinator');
  revalidatePath(`/posts/${postId}`);
}

export async function requestUserReviewAction(formData: FormData) {
  const user = await requireUser();

  if (!canModerateUser(user)) {
    redirect('/coordinator?error=권한이 없습니다.');
  }

  const targetUserId = normalizeText(formData.get('targetUserId'));
  const reason = normalizeText(formData.get('reason'));

  if (!targetUserId) {
    redirect('/coordinator?error=사용자 ID가 없습니다.');
  }

  if (!reason) {
    redirect('/coordinator?error=검토 사유를 입력해 주세요.');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, status: true, role: true },
  });

  if (!targetUser) {
    redirect('/coordinator?error=사용자를 찾을 수 없습니다.');
  }

  if (targetUser.role === 'ADMIN') {
    redirect('/coordinator?error=관리자에 대한 검토 요청은 불가합니다.');
  }

  await logModerationAction(user.id, 'USER', targetUserId, 'REVIEW_REQUEST', reason);

  revalidatePath('/coordinator');
  redirect('/coordinator');
}
