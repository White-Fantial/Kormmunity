'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  CategoryType,
  CategoryVisibilityMode,
  Prisma,
  PermissionSubjectType,
} from '@prisma/client';

import { requireUser, invalidateSessionCache } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision, USER_ROLES } from '@/lib/permissions';
import type { SessionUser } from '@/lib/auth/types';
import type { UserRole, UserStatus } from '@prisma/client';
import {
  COMMUNITY_SCORE_BASE_DELTAS,
  applyCommunityScoreChange,
} from '@/lib/community-score';

const VALID_CATEGORY_TYPES = Object.values(CategoryType) as CategoryType[];
const VALID_CATEGORY_VISIBILITY_MODES = Object.values(
  CategoryVisibilityMode,
) as CategoryVisibilityMode[];
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function normalizeHexColor(value: string) {
  if (!value) return null;
  const normalized = value.startsWith('#') ? value : `#${value}`;
  return HEX_COLOR_PATTERN.test(normalized) ? normalized : null;
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeQuickCommentTemplates(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return [];
  return value
    .split(/\r?\n/)
    .map((template) => template.trim())
    .filter((template) => template.length > 0);
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

async function revalidateUserSessions(userId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { token: true },
  });
  for (const session of sessions) {
    invalidateSessionCache(session.token);
  }
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

  if (!USER_ROLES.includes(newRole)) {
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
  await revalidateUserSessions(targetUserId);
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
  await revalidateUserSessions(targetUserId);
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
        isPinned: false,
        pinnedAt: null,
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

  void applyCommunityScoreChange({
    targetType: 'POST',
    targetId: postId,
    actorId: user.id,
    baseDelta: COMMUNITY_SCORE_BASE_DELTAS.ADMIN_DELETES,
    reason: 'ADMIN_DELETES',
  }).catch((err) => {
    console.error('[adminDeletePostAction] community score update failed', err);
  });

  revalidatePath('/admin/posts');
  revalidatePath('/coordinator');
  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
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

  if (!post) {
    redirect('/admin/posts?error=게시글을 찾을 수 없습니다.');
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
        actionType: 'ADMIN_RESTORE',
        reason: reason || null,
      },
    });
  });

  void applyCommunityScoreChange({
    targetType: 'POST',
    targetId: postId,
    actorId: user.id,
    baseDelta: COMMUNITY_SCORE_BASE_DELTAS.ADMIN_RESTORES,
    reason: 'ADMIN_RESTORES',
  }).catch((err) => {
    console.error('[adminRestorePostAction] community score update failed', err);
  });

  revalidatePath('/admin/posts');
  revalidatePath('/coordinator');
  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  redirect('/admin/posts');
}

export async function pinPostAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const postId = normalizeText(formData.get('postId'));

  if (!postId) {
    redirect('/admin/posts?error=게시글 ID가 없습니다.');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, isPinned: true },
  });

  if (!post) {
    redirect('/admin/posts?error=게시글을 찾을 수 없습니다.');
  }

  if (post.status !== 'PUBLISHED') {
    redirect('/admin/posts?error=게시된 글만 고정할 수 있습니다.');
  }

  if (post.isPinned) {
    redirect(`/admin/posts?success=${encodeURIComponent('이미 상단 고정된 게시글입니다.')}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        isPinned: true,
        pinnedAt: new Date(),
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'POST',
        targetId: postId,
        actionType: 'PIN_POST',
      },
    });
  });

  revalidatePath('/admin/posts');
  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  redirect(`/admin/posts?success=${encodeURIComponent('게시글을 상단에 고정했어요.')}`);
}

export async function unpinPostAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const postId = normalizeText(formData.get('postId'));

  if (!postId) {
    redirect('/admin/posts?error=게시글 ID가 없습니다.');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, isPinned: true },
  });

  if (!post) {
    redirect('/admin/posts?error=게시글을 찾을 수 없습니다.');
  }

  if (!post.isPinned) {
    redirect(`/admin/posts?success=${encodeURIComponent('이미 고정 해제된 게시글입니다.')}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        isPinned: false,
        pinnedAt: null,
      },
    });

    await tx.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'POST',
        targetId: postId,
        actionType: 'UNPIN_POST',
      },
    });
  });

  revalidatePath('/admin/posts');
  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  redirect(`/admin/posts?success=${encodeURIComponent('게시글 상단 고정을 해제했어요.')}`);
}

export async function createCategoryAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const name = normalizeText(formData.get('name'));
  const slug = normalizeText(formData.get('slug'));
  const type = normalizeText(formData.get('type')) as CategoryType;
  const visibilityMode = normalizeText(formData.get('visibilityMode')) as CategoryVisibilityMode;
  const colorValue = normalizeText(formData.get('color'));
  const requireCommentBeforeContactDefault =
    formData.get('requireCommentBeforeContactDefault') === 'on';
  const quickCommentTemplates = normalizeQuickCommentTemplates(
    formData.get('quickCommentTemplates'),
  );
  const color = normalizeHexColor(colorValue);

  if (!name || !slug || !type || !visibilityMode) {
    redirect('/admin/categories?error=이름, 슬러그, 타입, 노출 방식을 입력해 주세요.');
  }

  if (!VALID_CATEGORY_TYPES.includes(type)) {
    redirect('/admin/categories?error=유효하지 않은 카테고리 타입입니다.');
  }

  if (!VALID_CATEGORY_VISIBILITY_MODES.includes(visibilityMode)) {
    redirect('/admin/categories?error=유효하지 않은 카테고리 노출 방식입니다.');
  }

  if (colorValue && !color) {
    redirect('/admin/categories?error=카테고리 색상은 #RRGGBB 형식이어야 합니다.');
  }

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    redirect('/admin/categories?error=이미 존재하는 슬러그입니다.');
  }

  await prisma.category.create({
    data: {
      name,
      slug,
      type,
      visibilityMode,
      color,
      requireCommentBeforeContactDefault,
      quickCommentTemplates:
        quickCommentTemplates.length > 0 ? quickCommentTemplates : Prisma.DbNull,
    },
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

export async function updateCategorySettingsAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const categoryId = normalizeText(formData.get('categoryId'));
  const type = normalizeText(formData.get('type')) as CategoryType;
  const visibilityMode = normalizeText(formData.get('visibilityMode')) as CategoryVisibilityMode;
  const colorValue = normalizeText(formData.get('color'));
  const requireCommentBeforeContactDefault =
    formData.get('requireCommentBeforeContactDefault') === 'on';
  const quickCommentTemplates = normalizeQuickCommentTemplates(
    formData.get('quickCommentTemplates'),
  );
  const color = normalizeHexColor(colorValue);

  if (!categoryId) {
    redirect('/admin/categories?error=카테고리 ID가 없습니다.');
  }

  if (!VALID_CATEGORY_TYPES.includes(type)) {
    redirect('/admin/categories?error=유효하지 않은 카테고리 타입입니다.');
  }

  if (!VALID_CATEGORY_VISIBILITY_MODES.includes(visibilityMode)) {
    redirect('/admin/categories?error=유효하지 않은 카테고리 노출 방식입니다.');
  }

  if (colorValue && !color) {
    redirect('/admin/categories?error=카테고리 색상은 #RRGGBB 형식이어야 합니다.');
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      type,
      visibilityMode,
      color,
      requireCommentBeforeContactDefault,
      quickCommentTemplates:
        quickCommentTemplates.length > 0 ? quickCommentTemplates : Prisma.DbNull,
    },
  });

  await logModerationAction(user.id, 'CATEGORY', categoryId, 'SETTINGS_UPDATE');

  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}

export async function createPostTagOptionAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const categoryType = normalizeText(formData.get('categoryType')) as CategoryType;
  const label = normalizeText(formData.get('label'));
  const slug = normalizeText(formData.get('slug')).toLowerCase();
  const sortOrderRaw = normalizeText(formData.get('sortOrder'));
  const sortOrder = sortOrderRaw ? Number.parseInt(sortOrderRaw, 10) : 0;

  if (!categoryType || !label || !slug) {
    redirect('/admin/categories?error=카테고리 타입, 태그명, 슬러그를 입력해 주세요.');
  }

  if (!VALID_CATEGORY_TYPES.includes(categoryType)) {
    redirect('/admin/categories?error=유효하지 않은 카테고리 타입입니다.');
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    redirect('/admin/categories?error=태그 슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.');
  }

  if (Number.isNaN(sortOrder)) {
    redirect('/admin/categories?error=정렬 순서는 숫자로 입력해 주세요.');
  }

  const existing = await prisma.postTagOption.findUnique({
    where: {
      categoryType_slug: {
        categoryType,
        slug,
      },
    },
    select: { id: true },
  });

  if (existing) {
    redirect('/admin/categories?error=동일한 슬러그 태그가 이미 존재합니다.');
  }

  const existingLabel = await prisma.postTagOption.findFirst({
    where: {
      categoryType,
      label,
    },
    select: { id: true },
  });

  if (existingLabel) {
    redirect('/admin/categories?error=동일한 이름 태그가 이미 존재합니다.');
  }

  await prisma.postTagOption.create({
    data: {
      categoryType,
      label,
      slug,
      sortOrder,
      isActive: true,
    },
  });

  await logModerationAction(user.id, 'POST_TAG_OPTION', categoryType, 'CREATE');

  revalidatePath('/admin/categories');
  revalidatePath('/posts');
  revalidatePath('/posts/new');
  redirect('/admin/categories');
}

export async function updatePostTagOptionAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const optionId = normalizeText(formData.get('optionId'));
  const label = normalizeText(formData.get('label'));
  const slug = normalizeText(formData.get('slug')).toLowerCase();
  const sortOrderRaw = normalizeText(formData.get('sortOrder'));
  const sortOrder = sortOrderRaw ? Number.parseInt(sortOrderRaw, 10) : 0;

  if (!optionId || !label || !slug) {
    redirect('/admin/categories?error=태그 정보가 올바르지 않습니다.');
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    redirect('/admin/categories?error=태그 슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.');
  }

  if (Number.isNaN(sortOrder)) {
    redirect('/admin/categories?error=정렬 순서는 숫자로 입력해 주세요.');
  }

  const option = await prisma.postTagOption.findUnique({
    where: { id: optionId },
    select: { id: true, categoryType: true, isActive: true },
  });

  if (!option) {
    redirect('/admin/categories?error=태그를 찾을 수 없습니다.');
  }

  const duplicate = await prisma.postTagOption.findFirst({
    where: {
      categoryType: option.categoryType,
      slug,
      NOT: { id: option.id },
    },
    select: { id: true },
  });

  if (duplicate) {
    redirect('/admin/categories?error=동일한 슬러그 태그가 이미 존재합니다.');
  }

  const duplicateLabel = await prisma.postTagOption.findFirst({
    where: {
      categoryType: option.categoryType,
      label,
      NOT: { id: option.id },
    },
    select: { id: true },
  });

  if (duplicateLabel) {
    redirect('/admin/categories?error=동일한 이름 태그가 이미 존재합니다.');
  }

  await prisma.postTagOption.update({
    where: { id: option.id },
    data: {
      label,
      slug,
      sortOrder,
    },
  });

  await logModerationAction(user.id, 'POST_TAG_OPTION', option.id, 'UPDATE');

  revalidatePath('/admin/categories');
  revalidatePath('/posts');
  revalidatePath('/posts/new');
  redirect('/admin/categories');
}

export async function togglePostTagOptionActiveAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const optionId = normalizeText(formData.get('optionId'));
  const isActive = formData.get('isActive') === 'true';

  if (!optionId) {
    redirect('/admin/categories?error=태그 ID가 없습니다.');
  }

  const option = await prisma.postTagOption.findUnique({
    where: { id: optionId },
    select: { id: true },
  });

  if (!option) {
    redirect('/admin/categories?error=태그를 찾을 수 없습니다.');
  }

  await prisma.postTagOption.update({
    where: { id: option.id },
    data: {
      isActive: !isActive,
    },
  });

  await logModerationAction(
    user.id,
    'POST_TAG_OPTION',
    option.id,
    isActive ? 'DEACTIVATE' : 'ACTIVATE',
  );

  revalidatePath('/admin/categories');
  revalidatePath('/posts');
  revalidatePath('/posts/new');
  redirect('/admin/categories');
}

export async function reorderPostTagOptionsAction(ids: string[]): Promise<void> {
  const user = await requireUser();
  requireAdmin(user);

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    return;
  }

  await Promise.all(
    ids.map((id, index) =>
      prisma.postTagOption.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await logModerationAction(user.id, 'POST_TAG_OPTION', ids.join(','), 'REORDER');

  revalidatePath('/admin/categories');
  revalidatePath('/posts');
  revalidatePath('/posts/new');
}

export async function createPostPermissionAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const subjectType = normalizeText(formData.get('subjectType')) as PermissionSubjectType;
  const userId = normalizeText(formData.get('userId')) || null;
  const rawRole = normalizeText(formData.get('role'));
  const role = USER_ROLES.find((candidate) => candidate === rawRole) ?? null;
  const countryId = normalizeText(formData.get('countryId')) || null;
  const cityId = normalizeText(formData.get('cityId')) || null;
  const categoryId = normalizeText(formData.get('categoryId')) || null;

  if (!Object.values(PermissionSubjectType).includes(subjectType)) {
    redirect('/admin/post-permissions?error=유효하지 않은 권한 주체입니다.');
  }

  if (subjectType === 'USER' && !userId) {
    redirect('/admin/post-permissions?error=사용자를 선택해 주세요.');
  }

  if (subjectType === 'ROLE' && !role) {
    redirect('/admin/post-permissions?error=유효하지 않은 역할입니다.');
  }

  if (cityId && !countryId) {
    redirect('/admin/post-permissions?error=도시를 지정하려면 국가를 함께 선택해 주세요.');
  }

  const [targetUser, country, city, category, existingPermission] = await Promise.all([
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        })
      : Promise.resolve(null),
    countryId
      ? prisma.country.findFirst({
          where: { id: countryId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    cityId
      ? prisma.city.findFirst({
          where: { id: cityId, isActive: true },
          select: { id: true, countryId: true },
        })
      : Promise.resolve(null),
    categoryId
      ? prisma.category.findFirst({
          where: { id: categoryId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.postPermission.findFirst({
      where: {
        subjectType,
        userId: subjectType === 'USER' ? userId : null,
        role: subjectType === 'ROLE' ? role : null,
        countryId,
        cityId,
        categoryId,
      },
      select: { id: true },
    }),
  ]);

  if (subjectType === 'USER' && !targetUser) {
    redirect('/admin/post-permissions?error=사용자를 찾을 수 없습니다.');
  }

  if (countryId && !country) {
    redirect('/admin/post-permissions?error=국가를 찾을 수 없습니다.');
  }

  if (cityId && (!city || city.countryId !== countryId)) {
    redirect('/admin/post-permissions?error=도시를 올바르게 선택해 주세요.');
  }

  if (categoryId && !category) {
    redirect('/admin/post-permissions?error=카테고리를 찾을 수 없습니다.');
  }

  if (existingPermission) {
    redirect('/admin/post-permissions?error=동일한 권한이 이미 존재합니다.');
  }

  await prisma.postPermission.create({
    data: {
      subjectType,
      userId: subjectType === 'USER' ? userId : null,
      role: subjectType === 'ROLE' ? role : null,
      countryId,
      cityId,
      categoryId,
    },
  });

  await logModerationAction(user.id, 'POST_PERMISSION', userId ?? role ?? 'UNKNOWN', `CREATE_${subjectType}`);

  revalidatePath('/admin/post-permissions');
  revalidatePath('/posts/new');
  redirect('/admin/post-permissions');
}

export async function deletePostPermissionAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const permissionId = normalizeText(formData.get('permissionId'));

  if (!permissionId) {
    redirect('/admin/post-permissions?error=권한 ID가 없습니다.');
  }

  const permission = await prisma.postPermission.findUnique({
    where: { id: permissionId },
    select: {
      id: true,
      subjectType: true,
      userId: true,
      role: true,
    },
  });

  if (!permission) {
    redirect('/admin/post-permissions?error=권한을 찾을 수 없습니다.');
  }

  await prisma.postPermission.delete({
    where: { id: permissionId },
  });

  await logModerationAction(
    user.id,
    'POST_PERMISSION',
    permission.id,
    `DELETE_${permission.subjectType}_${permission.userId ?? permission.role ?? 'UNKNOWN'}`,
  );

  revalidatePath('/admin/post-permissions');
  revalidatePath('/posts/new');
  redirect('/admin/post-permissions');
}

export async function createCityAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const name = normalizeText(formData.get('name'));
  const slug = normalizeText(formData.get('slug'));
  const countryId = normalizeText(formData.get('countryId')) || null;

  if (!name || !slug) {
    redirect('/admin/cities?error=이름과 슬러그를 입력해 주세요.');
  }

  const existing = await prisma.city.findUnique({ where: { slug } });
  if (existing) {
    redirect('/admin/cities?error=이미 존재하는 슬러그입니다.');
  }

  if (countryId) {
    const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
    if (!country) {
      redirect('/admin/cities?error=유효하지 않은 국가입니다.');
    }
  }

  await prisma.city.create({
    data: { name, slug, countryId },
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

export async function createReportOptionAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const label = normalizeText(formData.get('label'));

  if (!label) {
    redirect('/admin/report-options?error=신고 옵션 이름을 입력해 주세요.');
  }

  const exists = await prisma.reportOption.findFirst({
    where: { label },
    select: { id: true },
  });

  if (exists) {
    redirect('/admin/report-options?error=이미 존재하는 신고 옵션입니다.');
  }

  const sortOrder = await prisma.reportOption.count();
  const option = await prisma.reportOption.create({
    data: {
      label,
      isActive: true,
      sortOrder,
    },
    select: { id: true },
  });

  await logModerationAction(user.id, 'REPORT_OPTION', option.id, 'CREATE', label);

  revalidatePath('/admin/report-options');
  redirect('/admin/report-options');
}

export async function toggleReportOptionActiveAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const optionId = normalizeText(formData.get('optionId'));
  const isActive = formData.get('isActive') === 'true';

  if (!optionId) {
    redirect('/admin/report-options?error=신고 옵션 ID가 없습니다.');
  }

  await prisma.reportOption.update({
    where: { id: optionId },
    data: { isActive: !isActive },
  });

  await logModerationAction(
    user.id,
    'REPORT_OPTION',
    optionId,
    isActive ? 'DEACTIVATE' : 'ACTIVATE',
  );

  revalidatePath('/admin/report-options');
  redirect('/admin/report-options');
}

export async function createCountryAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const name = normalizeText(formData.get('name'));
  const slug = normalizeText(formData.get('slug'));

  if (!name || !slug) {
    redirect('/admin/cities?error=이름과 슬러그를 입력해 주세요.');
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    redirect('/admin/cities?error=슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.');
  }

  const existing = await prisma.country.findUnique({ where: { slug } });
  if (existing) {
    redirect('/admin/cities?error=이미 존재하는 슬러그입니다.');
  }

  const sortOrder = await prisma.country.count();
  const country = await prisma.country.create({
    data: { name, slug, sortOrder },
    select: { id: true },
  });

  await logModerationAction(user.id, 'COUNTRY', country.id, 'CREATE', name);

  revalidatePath('/admin/cities');
  redirect('/admin/cities');
}

export async function toggleCountryActiveAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const countryId = normalizeText(formData.get('countryId'));
  const isActive = formData.get('isActive') === 'true';

  if (!countryId) {
    redirect('/admin/cities?error=국가 ID가 없습니다.');
  }

  await prisma.country.update({
    where: { id: countryId },
    data: { isActive: !isActive },
  });

  await logModerationAction(
    user.id,
    'COUNTRY',
    countryId,
    isActive ? 'DEACTIVATE' : 'ACTIVATE',
  );

  revalidatePath('/admin/cities');
  redirect('/admin/cities');
}

export async function assignCityCountryAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const cityId = normalizeText(formData.get('cityId'));
  const countryId = normalizeText(formData.get('countryId')) || null;

  if (!cityId) {
    redirect('/admin/cities?error=도시 ID가 없습니다.');
  }

  if (countryId) {
    const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
    if (!country) {
      redirect('/admin/cities?error=유효하지 않은 국가입니다.');
    }
  }

  await prisma.city.update({
    where: { id: cityId },
    data: { countryId },
  });

  await logModerationAction(user.id, 'CITY', cityId, 'ASSIGN_COUNTRY', countryId ?? 'none');

  revalidatePath('/admin/cities');
  redirect('/admin/cities');
}
