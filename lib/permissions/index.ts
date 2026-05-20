import { CategoryVisibilityMode } from '@prisma/client';
import type { CategoryType, PostStatus, StaffRole, UserStatus } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import {
  getActiveCategories,
  getActiveCities,
  getActivePostTagOptions,
} from '@/lib/posts/reference-data';

type StaffAssignmentItem = {
  role: StaffRole;
  countryId: string | null;
  cityId: string | null;
};

type PermissionUser = {
  id: string;
  status: UserStatus;
  countryId: string | null;
  cityId: string | null;
  staffAssignments: StaffAssignmentItem[];
};

type PermissionPost = {
  id: string;
  authorId: string;
  status: PostStatus;
};

type PermissionComment = {
  id: string;
  authorId: string;
};

export type PostFormCountryOption = {
  id: string;
  name: string;
};

export type PostFormCityOption = {
  id: string;
  name: string;
  countryId: string | null;
};

export type PostFormCategoryOption = {
  id: string;
  name: string;
  type: CategoryType;
  visibilityMode: CategoryVisibilityMode;
  requireCommentBeforeContactDefault: boolean;
  contactSectionDefaultExpanded: boolean;
  postTagOptions: {
    id: string;
    label: string;
    slug: string;
  }[];
};

export type PostFormTargetOption = {
  countryId: string | null;
  cityId: string | null;
  categoryId: string;
};

export type PostCreationFormOptions = {
  countries: PostFormCountryOption[];
  cities: PostFormCityOption[];
  categories: PostFormCategoryOption[];
  allowedTargets: PostFormTargetOption[];
  defaultCountryId: string | null;
  defaultCityId: string | null;
};

export const USER_ROLES = ['USER', 'MODERATOR', 'COORDINATOR', 'ADMIN'] as const;
export const STAFF_ROLES = [
  'MODERATOR',
  'COORDINATOR',
  'AD_MANAGER',
  'PARTNER_MANAGER',
  'ADMIN',
] as const;
export type StaffRoleValue = (typeof STAFF_ROLES)[number];

// ─── Core staff assignment helpers ────────────────────────────────────────────

function hasAdminAssignment(assignments: StaffAssignmentItem[]): boolean {
  return assignments.some((a) => a.role === 'ADMIN');
}

function hasModeratorAssignment(assignments: StaffAssignmentItem[]): boolean {
  return assignments.some((a) => a.role === 'MODERATOR' || a.role === 'ADMIN');
}

function hasCoordinatorAssignment(assignments: StaffAssignmentItem[]): boolean {
  return assignments.some((a) => a.role === 'COORDINATOR' || a.role === 'ADMIN');
}

function hasAdManagerAssignment(assignments: StaffAssignmentItem[]): boolean {
  return assignments.some((a) => a.role === 'AD_MANAGER' || a.role === 'ADMIN');
}

/**
 * Returns true if the given assignment's scope covers the target location.
 * A null countryId/cityId on the assignment means "global" (matches any).
 */
function assignmentCoversLocation(
  assignment: StaffAssignmentItem,
  targetCountryId: string | null,
  targetCityId: string | null,
): boolean {
  const countryMatch =
    assignment.countryId === null || assignment.countryId === targetCountryId;
  const cityMatch = assignment.cityId === null || assignment.cityId === targetCityId;
  return countryMatch && cityMatch;
}

/**
 * Returns the highest effective staff role for a user at a given location.
 * Used to determine default write visibility modes for post creation.
 */
function getEffectiveLocalRole(
  assignments: StaffAssignmentItem[],
  countryId: string | null,
  cityId: string | null,
): 'ADMIN' | 'MODERATOR' | 'COORDINATOR' | 'USER' {
  if (hasAdminAssignment(assignments)) {
    return 'ADMIN';
  }

  if (
    assignments.some(
      (a) => a.role === 'MODERATOR' && assignmentCoversLocation(a, countryId, cityId),
    )
  ) {
    return 'MODERATOR';
  }

  if (
    assignments.some(
      (a) => a.role === 'COORDINATOR' && assignmentCoversLocation(a, countryId, cityId),
    )
  ) {
    return 'COORDINATOR';
  }

  return 'USER';
}

export function canUseAutoContentGeneration(
  user: PermissionUser | null | undefined,
) {
  if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
    return false;
  }

  return hasAdminAssignment(user.staffAssignments);
}

export function isAdmin(user: PermissionUser | null | undefined): boolean {
  return hasAdminAssignment(user?.staffAssignments ?? []);
}

export function isModerator(user: PermissionUser | null | undefined): boolean {
  return hasModeratorAssignment(user?.staffAssignments ?? []);
}

export function isCoordinator(user: PermissionUser | null | undefined): boolean {
  return hasCoordinatorAssignment(user?.staffAssignments ?? []);
}

function isActiveWriter(user: PermissionUser | null | undefined) {
  return user?.status === 'ACTIVE';
}

function getDefaultWriteVisibilityModes(
  effectiveRole: 'MODERATOR' | 'COORDINATOR' | 'USER',
): CategoryVisibilityMode[] {
  if (effectiveRole === 'MODERATOR') {
    return [
      CategoryVisibilityMode.NORMAL,
      CategoryVisibilityMode.OPERATOR_BOARD,
      CategoryVisibilityMode.OPERATOR_NOTICE,
    ];
  }

  if (effectiveRole === 'COORDINATOR') {
    return [CategoryVisibilityMode.NORMAL, CategoryVisibilityMode.OPERATOR_BOARD];
  }

  return [CategoryVisibilityMode.NORMAL];
}

export function isPostScopeValid(
  countryId: string | null,
  cityId: string | null,
) {
  return !cityId || Boolean(countryId);
}

function buildTargetKey(target: PostFormTargetOption) {
  return `${target.countryId ?? '*'}:${target.cityId ?? '*'}:${target.categoryId}`;
}

export async function canCreatePost(
  user: PermissionUser | null | undefined,
  targetCountryId: string | null,
  targetCityId: string | null,
  targetCategoryId: string,
  categoryVisibilityMode?: CategoryVisibilityMode,
) {
  if (!user || !isActiveWriter(user)) {
    return false;
  }

  if (!isPostScopeValid(targetCountryId, targetCityId)) {
    return false;
  }

  let visibilityMode = categoryVisibilityMode;
  if (visibilityMode === undefined) {
    const category = await prisma.category.findUnique({
      where: { id: targetCategoryId },
      select: { visibilityMode: true },
    });

    if (!category) {
      return false;
    }

    visibilityMode = category.visibilityMode;
  }

  if (hasAdminAssignment(user.staffAssignments)) {
    return true;
  }

  if (targetCountryId !== null && targetCityId !== null) {
    const effectiveRole = getEffectiveLocalRole(
      user.staffAssignments,
      targetCountryId,
      targetCityId,
    );
    if (
      effectiveRole !== 'USER' ||
      visibilityMode === CategoryVisibilityMode.NORMAL
    ) {
      if (
        targetCountryId === user.countryId &&
        targetCityId === user.cityId &&
        getDefaultWriteVisibilityModes(
          effectiveRole === 'ADMIN' ? 'MODERATOR' : effectiveRole,
        ).includes(visibilityMode)
      ) {
        return true;
      }
    }
  }

  const userStaffRoles = user.staffAssignments.map((a) => a.role);
  const permissionOrConditions: object[] = [{ subjectType: 'USER', userId: user.id }];
  if (userStaffRoles.length > 0) {
    permissionOrConditions.push({ subjectType: 'ROLE', role: { in: userStaffRoles } });
  }

  const matchingPermission = await prisma.postPermission.findFirst({
    where: {
      OR: permissionOrConditions,
      AND: [
        {
          OR:
            targetCountryId === null
              ? [{ countryId: null }]
              : [{ countryId: targetCountryId }, { countryId: null }],
        },
        {
          OR:
            targetCityId === null
              ? [{ cityId: null }]
              : [{ cityId: targetCityId }, { cityId: null }],
        },
        {
          OR: [{ categoryId: targetCategoryId }, { categoryId: null }],
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(matchingPermission);
}

export async function getPostCreationFormOptions(
  user: PermissionUser | null | undefined,
): Promise<PostCreationFormOptions> {
  if (!user || !isActiveWriter(user)) {
    return {
      countries: [],
      cities: [],
      categories: [],
      allowedTargets: [],
      defaultCountryId: null,
      defaultCityId: null,
    };
  }

  const isAdminUser = hasAdminAssignment(user.staffAssignments);
  const userStaffRoles = user.staffAssignments.map((a) => a.role);
  const permissionOrConditions: object[] = [{ subjectType: 'USER', userId: user.id }];
  if (userStaffRoles.length > 0) {
    permissionOrConditions.push({ subjectType: 'ROLE', role: { in: userStaffRoles } });
  }

  const [countries, cities, categories, tagOptions, permissions] = await Promise.all([
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    getActiveCities(),
    getActiveCategories(),
    getActivePostTagOptions(),
    isAdminUser
      ? Promise.resolve([])
      : prisma.postPermission.findMany({
          where: { OR: permissionOrConditions },
          select: { countryId: true, cityId: true, categoryId: true },
        }),
  ]);

  const optionsByCategoryType = new Map<
    CategoryType,
    { id: string; label: string; slug: string }[]
  >();
  for (const option of tagOptions) {
    const existing = optionsByCategoryType.get(option.categoryType) ?? [];
    existing.push({
      id: option.id,
      label: option.label,
      slug: option.slug,
    });
    optionsByCategoryType.set(option.categoryType, existing);
  }

  const categoryById = new Map(
    categories.map((category) => [
      category.id,
      {
        ...category,
        postTagOptions: optionsByCategoryType.get(category.type) ?? [],
      },
    ]),
  );
  const countryIds = countries.map((country) => country.id);
  const countryIdSet = new Set(countryIds);
  const wildcardCountryIds = [null, ...countryIds];
  const allCategoryIds = categories.map((category) => category.id);
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const cityIdsByCountry = new Map<string, string[]>();

  for (const city of cities) {
    if (!city.countryId) {
      continue;
    }

    const existing = cityIdsByCountry.get(city.countryId) ?? [];
    existing.push(city.id);
    cityIdsByCountry.set(city.countryId, existing);
  }

  const targets = new Map<string, PostFormTargetOption>();

  const addTarget = (countryId: string | null, cityId: string | null, categoryId: string) => {
    const category = categoryById.get(categoryId);
    if (!category) {
      return;
    }

    if (!isPostScopeValid(countryId, cityId)) {
      return;
    }

    if (countryId && !countryIdSet.has(countryId)) {
      return;
    }

    if (cityId) {
      const city = cityById.get(cityId);
      if (!city || city.countryId !== countryId) {
        return;
      }
    }

    const target = { countryId, cityId, categoryId };
    targets.set(buildTargetKey(target), target);
  };

  if (isAdminUser) {
    for (const category of categories) {
      addTarget(null, null, category.id);
      for (const country of countries) {
        addTarget(country.id, null, category.id);
        for (const cityId of cityIdsByCountry.get(country.id) ?? []) {
          addTarget(country.id, cityId, category.id);
        }
      }
    }
  } else {
    if (user.countryId && user.cityId) {
      const effectiveRole = getEffectiveLocalRole(
        user.staffAssignments,
        user.countryId,
        user.cityId,
      );
      const localRole: 'MODERATOR' | 'COORDINATOR' | 'USER' =
        effectiveRole === 'ADMIN' ? 'MODERATOR' : effectiveRole;
      const defaultWriteVisibilityModes = new Set(getDefaultWriteVisibilityModes(localRole));
      for (const category of categories) {
        if (defaultWriteVisibilityModes.has(category.visibilityMode)) {
          addTarget(user.countryId, user.cityId, category.id);
        }
      }
    }

    for (const permission of permissions) {
      const allowedCountryIds = permission.countryId
        ? [permission.countryId]
        : wildcardCountryIds;
      const allowedCategoryIds = permission.categoryId
        ? [permission.categoryId]
        : allCategoryIds;

      for (const countryId of allowedCountryIds) {
        const allowedCityIds = permission.cityId
          ? [permission.cityId]
          : countryId
            ? [null, ...(cityIdsByCountry.get(countryId) ?? [])]
            : [null];

        for (const categoryId of allowedCategoryIds) {
          for (const cityId of allowedCityIds) {
            addTarget(countryId, cityId, categoryId);
          }
        }
      }
    }
  }

  const allowedTargets = [...targets.values()];
  const allowedCategoryIds = new Set(allowedTargets.map((target) => target.categoryId));

  const defaultCountryId =
    user.countryId && allowedTargets.some((target) => target.countryId === user.countryId)
      ? user.countryId
      : allowedTargets.some((target) => target.countryId === null)
        ? null
        : countries[0]?.id ?? null;

  const defaultCityId =
    user.cityId &&
    allowedTargets.some(
      (target) => target.countryId === (user.countryId ?? null) && target.cityId === user.cityId,
    )
      ? user.cityId
      : null;

  return {
    countries,
    cities,
    categories: [...categoryById.values()].filter((category) => allowedCategoryIds.has(category.id)),
    allowedTargets,
    defaultCountryId,
    defaultCityId,
  };
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

export function canReportComment(
  user: PermissionUser | null | undefined,
  comment: { authorId: string; status: string },
) {
  if (!user || !isActiveWriter(user)) {
    return false;
  }

  if (comment.status !== 'PUBLISHED') {
    return false;
  }

  return user.id !== comment.authorId;
}

export function canEditPost(
  user: PermissionUser | null | undefined,
  post: PermissionPost,
) {
  if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  return user.id === post.authorId;
}

export function canDeletePost(
  user: PermissionUser | null | undefined,
  post: PermissionPost,
) {
  if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
    return false;
  }

  if (canModerate(user)) {
    return true;
  }

  return user.id === post.authorId;
}

export function canDeleteComment(
  user: PermissionUser | null | undefined,
  comment: PermissionComment,
) {
  if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
    return false;
  }

  if (canModerate(user)) {
    return true;
  }

  return user.id === comment.authorId;
}

export function canModerate(user: PermissionUser | null | undefined) {
  return hasModeratorAssignment(user?.staffAssignments ?? []);
}

export function canCoordinate(user: PermissionUser | null | undefined) {
  return hasCoordinatorAssignment(user?.staffAssignments ?? []);
}

export function canAccessCoordinatorSection(user: PermissionUser | null | undefined) {
  return isCoordinator(user);
}

export function canAccessOperatorBoard(user: PermissionUser | null | undefined) {
  return canCoordinate(user) || canModerate(user);
}

export function canAccessAdsManagerSection(user: PermissionUser | null | undefined) {
  return hasAdManagerAssignment(user?.staffAssignments ?? []);
}

export function canHoldPost(user: PermissionUser | null | undefined) {
  return canModerate(user);
}

export function canRestorePost(user: PermissionUser | null | undefined) {
  return canModerate(user);
}

export function canModerateUser(user: PermissionUser | null | undefined) {
  return canModerate(user);
}

export function canMakeFinalUserDecision(
  user: PermissionUser | null | undefined,
) {
  return isAdmin(user);
}

export function canUseContactFeature(user: PermissionUser | null | undefined) {
  if (!user) {
    return true;
  }

  return user.status !== 'SUSPENDED' && user.status !== 'DELETED';
}
