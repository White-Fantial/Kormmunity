'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { retryKakaoMessageDelivery } from '@/lib/kakao/message';
import {
  canHoldPost,
  canRestorePost,
  canDeleteComment,
  canModerateUser,
} from '@/lib/permissions';
import {
  COMMUNITY_SCORE_BASE_DELTAS,
  applyCommunityScoreChange,
} from '@/lib/community-score';
import { createNotification } from '@/lib/notifications';

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
    select: { id: true, status: true, authorId: true },
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
        isPinned: false,
        pinnedAt: null,
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

  void applyCommunityScoreChange({
    targetType: 'POST',
    targetId: postId,
    actorId: user.id,
    baseDelta: COMMUNITY_SCORE_BASE_DELTAS.COORDINATOR_HOLDS,
    reason: 'COORDINATOR_HOLDS',
  }).catch((err) => {
    console.error('[holdPostAction] community score update failed', err);
  });

  void createNotification({
    recipientId: post.authorId,
    type: 'POST_HELD',
    relatedPostId: postId,
  }).catch((err) => {
    console.error('[holdPostAction] notification creation failed', err);
  });

  revalidatePath('/coordinator');
  revalidatePath('/admin/posts');
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
        // Intentionally keep restored posts unpinned after any HELD/DELETED transition.
        isPinned: false,
        pinnedAt: null,
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

  void applyCommunityScoreChange({
    targetType: 'POST',
    targetId: postId,
    actorId: user.id,
    baseDelta: COMMUNITY_SCORE_BASE_DELTAS.COORDINATOR_RESTORES,
    reason: 'COORDINATOR_RESTORES',
  }).catch((err) => {
    console.error('[restorePostAction] community score update failed', err);
  });

  revalidatePath('/coordinator');
  revalidatePath('/admin/posts');
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

  void applyCommunityScoreChange({
    targetType: 'COMMENT',
    targetId: commentId,
    actorId: user.id,
    baseDelta: COMMUNITY_SCORE_BASE_DELTAS.COORDINATOR_HOLDS,
    reason: 'COORDINATOR_HOLDS',
  }).catch((err) => {
    console.error('[holdCommentAction] community score update failed', err);
  });

  void createNotification({
    recipientId: comment.authorId,
    type: 'COMMENT_HELD',
    relatedPostId: postId,
    relatedCommentId: commentId,
  }).catch((err) => {
    console.error('[holdCommentAction] notification creation failed', err);
  });

  revalidatePath('/coordinator');
  revalidatePath(`/posts/${postId}`);
}

export async function restoreCommentAction(formData: FormData) {
  const user = await requireUser();

  const postId = normalizeText(formData.get('postId'));
  const commentId = normalizeText(formData.get('commentId'));

  if (!postId || !commentId) {
    redirect('/coordinator/reports?error=댓글 정보가 없습니다.');
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, postId: true, authorId: true, status: true },
  });

  if (!comment || comment.postId !== postId || !canDeleteComment(user, comment)) {
    redirect('/coordinator/reports?error=권한이 없습니다.');
  }

  if (comment.status !== 'HELD') {
    redirect('/coordinator/reports?error=보류 상태인 댓글만 복구할 수 있습니다.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({
      where: { id: commentId },
      data: { status: 'PUBLISHED' },
    });

    await tx.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'COMMENT',
        targetId: commentId,
        actionType: 'RESTORE',
      },
    });
  });

  void applyCommunityScoreChange({
    targetType: 'COMMENT',
    targetId: commentId,
    actorId: user.id,
    baseDelta: COMMUNITY_SCORE_BASE_DELTAS.COORDINATOR_RESTORES,
    reason: 'COORDINATOR_RESTORES',
  }).catch((err) => {
    console.error('[restoreCommentAction] community score update failed', err);
  });

  revalidatePath('/coordinator/reports');
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

  // Server-side validation mirrors the client `required` attribute to prevent
  // bypassed requests (e.g. direct form submission without browser enforcement).
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

export async function retryKakaoMessageDeliveryAction(formData: FormData) {
  const user = await requireUser();

  if (!canHoldPost(user)) {
    redirect('/coordinator/kakao-messages?error=권한이 없습니다.');
  }

  const deliveryId = normalizeText(formData.get('deliveryId'));

  if (!deliveryId) {
    redirect('/coordinator/kakao-messages?error=카카오 전송 로그 ID가 없습니다.');
  }

  const result = await retryKakaoMessageDelivery(deliveryId, user.id);

  revalidatePath('/coordinator/kakao-messages');
  if (!result.ok) {
    redirect(`/coordinator/kakao-messages?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/coordinator/kakao-messages?success=${encodeURIComponent(result.message)}`);
}
