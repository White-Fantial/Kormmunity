'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import type { SessionUser } from '@/lib/auth/types';
import type { UserRole, UserStatus } from '@prisma/client';

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireAdmin(user: SessionUser | null) {
  if (!user || !canMakeFinalUserDecision(user)) {
    redirect('/posts?error=권한이 없습니다.');
  }
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

export async function changeUserRoleAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const targetUserId = normalizeText(formData.get('targetUserId'));
  const newRole = normalizeText(formData.get('role')) as UserRole;
  const reason = normalizeText(formData.get('reason'));

  if (!targetUserId || !newRole) {
    redirect('/admin/users?error=잘못된 요청입니다.');
  }

  const validRoles: UserRole[] = ['USER', 'COORDINATOR', 'ADMIN'];
  if (!validRoles.includes(newRole)) {
    redirect('/admin/users?error=유효하지 않은 역할입니다.');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    redirect('/admin/users?error=사용자를 찾을 수 없습니다.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    await tx.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'USER',
        targetId: targetUserId,
        actionType: `ROLE_CHANGE_TO_${newRole}`,
        reason: reason || null,
      },
    });
  });

  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export async function changeUserStatusAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const targetUserId = normalizeText(formData.get('targetUserId'));
  const newStatus = normalizeText(formData.get('status')) as UserStatus;
  const reason = normalizeText(formData.get('reason'));

  if (!targetUserId || !newStatus) {
    redirect('/admin/users?error=잘못된 요청입니다.');
  }

  const validStatuses: UserStatus[] = ['ACTIVE', 'LIMITED', 'SUSPENDED', 'DELETED'];
  if (!validStatuses.includes(newStatus)) {
    redirect('/admin/users?error=유효하지 않은 상태입니다.');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, status: true },
  });

  if (!targetUser) {
    redirect('/admin/users?error=사용자를 찾을 수 없습니다.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { status: newStatus },
    });

    await tx.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'USER',
        targetId: targetUserId,
        actionType: `STATUS_CHANGE_TO_${newStatus}`,
        reason: reason || null,
      },
    });
  });

  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export async function adminDeletePostAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const postId = normalizeText(formData.get('postId'));
  const reason = normalizeText(formData.get('reason'));

  if (!postId) {
    redirect('/admin/posts?error=게시글 ID가 없습니다.');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (!post) {
    redirect('/admin/posts?error=게시글을 찾을 수 없습니다.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedReason: reason || 'ADMIN_DELETED',
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'POST',
        targetId: postId,
        actionType: 'ADMIN_DELETE',
        reason: reason || null,
      },
    });
  });

  revalidatePath('/admin/posts');
  revalidatePath('/posts');
  redirect('/admin/posts');
}

export async function adminRestorePostAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const postId = normalizeText(formData.get('postId'));
  const reason = normalizeText(formData.get('reason'));

  if (!postId) {
    redirect('/admin/posts?error=게시글 ID가 없습니다.');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (!post || post.status === 'DELETED') {
    redirect('/admin/posts?error=게시글을 찾을 수 없거나 이미 삭제된 상태입니다.');
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
        actionType: 'ADMIN_RESTORE',
        reason: reason || null,
      },
    });
  });

  revalidatePath('/admin/posts');
  revalidatePath('/posts');
  redirect('/admin/posts');
}

export async function createCategoryAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const name = normalizeText(formData.get('name'));
  const slug = normalizeText(formData.get('slug'));

  if (!name || !slug) {
    redirect('/admin/categories?error=이름과 슬러그를 입력해 주세요.');
  }

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    redirect('/admin/categories?error=이미 존재하는 슬러그입니다.');
  }

  await prisma.category.create({
    data: { name, slug },
  });

  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}

export async function toggleCategoryActiveAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const categoryId = normalizeText(formData.get('categoryId'));
  const isActive = formData.get('isActive') === 'true';

  if (!categoryId) {
    redirect('/admin/categories?error=카테고리 ID가 없습니다.');
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { isActive: !isActive },
  });

  await logModerationAction(
    user.id,
    'CATEGORY',
    categoryId,
    isActive ? 'DEACTIVATE' : 'ACTIVATE',
  );

  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}

export async function createCityAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const name = normalizeText(formData.get('name'));
  const slug = normalizeText(formData.get('slug'));

  if (!name || !slug) {
    redirect('/admin/cities?error=이름과 슬러그를 입력해 주세요.');
  }

  const existing = await prisma.city.findUnique({ where: { slug } });
  if (existing) {
    redirect('/admin/cities?error=이미 존재하는 슬러그입니다.');
  }

  await prisma.city.create({
    data: { name, slug },
  });

  revalidatePath('/admin/cities');
  redirect('/admin/cities');
}

export async function toggleCityActiveAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const cityId = normalizeText(formData.get('cityId'));
  const isActive = formData.get('isActive') === 'true';

  if (!cityId) {
    redirect('/admin/cities?error=도시 ID가 없습니다.');
  }

  await prisma.city.update({
    where: { id: cityId },
    data: { isActive: !isActive },
  });

  await logModerationAction(
    user.id,
    'CITY',
    cityId,
    isActive ? 'DEACTIVATE' : 'ACTIVATE',
  );

  revalidatePath('/admin/cities');
  redirect('/admin/cities');
}
