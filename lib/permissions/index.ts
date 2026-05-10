import type { PostStatus, SaleStatus, UserRole, UserStatus } from '@prisma/client';

type PermissionUser = {
  id: string;
  role: UserRole;
  status: UserStatus;
};

type PermissionPost = {
  id: string;
  authorId: string;
  status: PostStatus;
  saleStatus: SaleStatus | null;
};

type PermissionComment = {
  id: string;
  authorId: string;
};

type PermissionCategory = {
  minRole: UserRole;
};

const ROLE_RANK: Record<UserRole, number> = { USER: 0, COORDINATOR: 1, ADMIN: 2 };

export { ROLE_RANK };

function isActiveWriter(user: PermissionUser | null | undefined) {
  return user?.status === 'ACTIVE';
}

export function canCreatePost(user: PermissionUser | null | undefined) {
  return isActiveWriter(user);
}

export function canPostToCategory(
  user: PermissionUser | null | undefined,
  category: PermissionCategory,
) {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[category.minRole];
}

export function canCreateComment(user: PermissionUser | null | undefined) {
  return isActiveWriter(user);
}

export function canEditPost(
  user: PermissionUser | null | undefined,
  post: PermissionPost,
) {
  if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
    return false;
  }

  if (user.role === 'ADMIN') {
    return true;
  }

  return user.id === post.authorId;
}

export function canDeletePost(
  user: PermissionUser | null | undefined,
  post: PermissionPost,
) {
  return canEditPost(user, post);
}

export function canDeleteComment(
  user: PermissionUser | null | undefined,
  comment: PermissionComment,
) {
  if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
    return false;
  }

  if (user.role === 'COORDINATOR' || user.role === 'ADMIN') {
    return true;
  }

  return user.id === comment.authorId;
}

export function canMarkPostAsSold(
  user: PermissionUser | null | undefined,
  post: PermissionPost,
) {
  if (!user) {
    return false;
  }

  return user.id === post.authorId && user.status === 'ACTIVE';
}

export function canHoldPost(user: PermissionUser | null | undefined) {
  return user?.role === 'COORDINATOR' || user?.role === 'ADMIN';
}

export function canRestorePost(user: PermissionUser | null | undefined) {
  return canHoldPost(user);
}

export function canModerateUser(user: PermissionUser | null | undefined) {
  return canHoldPost(user);
}

export function canMakeFinalUserDecision(
  user: PermissionUser | null | undefined,
) {
  return user?.role === 'ADMIN';
}
