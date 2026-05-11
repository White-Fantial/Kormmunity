import { UserRole } from '@prisma/client';
import type { PermissionEffect, PermissionResourceType, PostStatus, SaleStatus, UserStatus } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

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

const ROLE_RANK: Record<UserRole, number> = { USER: 0, COORDINATOR: 1, ADMIN: 2 };

export { ROLE_RANK };
export const USER_ROLES = Object.values(UserRole) as UserRole[];

export const DEFAULT_PERMISSION_EFFECT: Record<UserRole, Record<PermissionResourceType, PermissionEffect>> = {
  USER: {
    CATEGORY: 'ALLOW',
    COUNTRY: 'ALLOW',
    CITY: 'ALLOW',
  },
  COORDINATOR: {
    CATEGORY: 'ALLOW',
    COUNTRY: 'ALLOW',
    CITY: 'ALLOW',
  },
  ADMIN: {
    CATEGORY: 'ALLOW',
    COUNTRY: 'ALLOW',
    CITY: 'ALLOW',
  },
};

function resolveDefaultEffect(user: PermissionUser, resourceType: PermissionResourceType) {
  const roleDefaults = DEFAULT_PERMISSION_EFFECT[user.role];
  if (!roleDefaults) {
    throw new Error(`Unknown user role for permission defaults: ${String(user.role)}`);
  }

  const effect = roleDefaults[resourceType];
  if (!effect) {
    throw new Error(`Unknown permission resource type: ${String(resourceType)}`);
  }

  return effect;
}

async function resolveResourcePermission(
  user: PermissionUser,
  resourceType: PermissionResourceType,
  resourceId: string | null | undefined,
) {
  if (!resourceId) {
    return resolveDefaultEffect(user, resourceType) === 'ALLOW';
  }

  const [userPolicy, rolePolicy] = await Promise.all([
    prisma.userWritePermissionPolicy.findUnique({
      where: {
        userId_resourceType_resourceId: {
          userId: user.id,
          resourceType,
          resourceId,
        },
      },
      select: { effect: true },
    }),
    prisma.roleWritePermissionPolicy.findUnique({
      where: {
        role_resourceType_resourceId: {
          role: user.role,
          resourceType,
          resourceId,
        },
      },
      select: { effect: true },
    }),
  ]);

  const effect = userPolicy?.effect ?? rolePolicy?.effect ?? resolveDefaultEffect(user, resourceType);
  return effect === 'ALLOW';
}

function isActiveWriter(user: PermissionUser | null | undefined) {
  return user?.status === 'ACTIVE';
}

export function canCreatePost(user: PermissionUser | null | undefined) {
  return isActiveWriter(user);
}

export async function canPostToCategoryAndCountry(
  user: PermissionUser | null | undefined,
  options: { categoryId: string; countryId: string | null | undefined },
) {
  if (!user) return false;

  const [canUseCategory, canUseCountry] = await Promise.all([
    resolveResourcePermission(user, 'CATEGORY', options.categoryId),
    resolveResourcePermission(user, 'COUNTRY', options.countryId),
  ]);

  return canUseCategory && canUseCountry;
}

type PostableCategory = {
  id: string;
  ignoreCountry: boolean;
};

function evaluateResourceEffect(
  user: PermissionUser,
  resourceType: PermissionResourceType,
  resourceId: string | null | undefined,
  userPolicyMap: Map<string, PermissionEffect>,
  rolePolicyMap: Map<string, PermissionEffect>,
) {
  if (!resourceId) {
    return resolveDefaultEffect(user, resourceType) === 'ALLOW';
  }

  const key = `${resourceType}:${resourceId}`;
  const effect =
    userPolicyMap.get(key) ??
    rolePolicyMap.get(key) ??
    resolveDefaultEffect(user, resourceType);

  return effect === 'ALLOW';
}

export async function filterPostableCategoriesForUser<T extends PostableCategory>(
  user: PermissionUser | null | undefined,
  categories: T[],
  userCountryId: string | null | undefined,
) {
  if (!user) return [];
  if (categories.length === 0) return [];

  const categoryIds = [...new Set(categories.map((category) => category.id))];
  const countryIds =
    userCountryId && categories.some((category) => !category.ignoreCountry)
      ? [userCountryId]
      : [];

  const [userCategoryPolicies, roleCategoryPolicies, userCountryPolicies, roleCountryPolicies] = await Promise.all([
    prisma.userWritePermissionPolicy.findMany({
      where: {
        userId: user.id,
        resourceType: 'CATEGORY',
        resourceId: { in: categoryIds },
      },
      select: { resourceType: true, resourceId: true, effect: true },
    }),
    prisma.roleWritePermissionPolicy.findMany({
      where: {
        role: user.role,
        resourceType: 'CATEGORY',
        resourceId: { in: categoryIds },
      },
      select: { resourceType: true, resourceId: true, effect: true },
    }),
    prisma.userWritePermissionPolicy.findMany({
      where: {
        userId: user.id,
        resourceType: 'COUNTRY',
        resourceId: { in: countryIds },
      },
      select: { resourceType: true, resourceId: true, effect: true },
    }),
    prisma.roleWritePermissionPolicy.findMany({
      where: {
        role: user.role,
        resourceType: 'COUNTRY',
        resourceId: { in: countryIds },
      },
      select: { resourceType: true, resourceId: true, effect: true },
    }),
  ]);

  const userPolicyMap = new Map(
    [...userCategoryPolicies, ...userCountryPolicies].map((policy) => [
      `${policy.resourceType}:${policy.resourceId}`,
      policy.effect,
    ]),
  );
  const rolePolicyMap = new Map(
    [...roleCategoryPolicies, ...roleCountryPolicies].map((policy) => [
      `${policy.resourceType}:${policy.resourceId}`,
      policy.effect,
    ]),
  );

  return categories.filter((category) => {
    const categoryAllowed = evaluateResourceEffect(
      user,
      'CATEGORY',
      category.id,
      userPolicyMap,
      rolePolicyMap,
    );
    const countryId = category.ignoreCountry ? null : userCountryId;
    const countryAllowed = evaluateResourceEffect(
      user,
      'COUNTRY',
      countryId,
      userPolicyMap,
      rolePolicyMap,
    );

    return categoryAllowed && countryAllowed;
  });
}

export function canCreateComment(user: PermissionUser | null | undefined) {
  return isActiveWriter(user);
}

export function canReportPost(
  user: PermissionUser | null | undefined,
  post: PermissionPost,
) {
  if (!user || !isActiveWriter(user)) {
    return false;
  }

  if (post.status !== 'PUBLISHED') {
    return false;
  }

  return user.id !== post.authorId;
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

export function canMarkPostAsReserved(
  user: PermissionUser | null | undefined,
  post: PermissionPost,
) {
  return canMarkPostAsSold(user, post);
}

export function canMarkPostAsAvailable(
  user: PermissionUser | null | undefined,
  post: PermissionPost,
) {
  return canMarkPostAsSold(user, post);
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
