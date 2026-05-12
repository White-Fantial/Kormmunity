import { CategoryVisibilityMode, UserRole } from '@prisma/client';
import type { CategoryType, PostStatus, UserStatus } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

type PermissionUser = {
  id: string;
  role: UserRole;
  status: UserStatus;
  countryId: string | null;
  cityId: string | null;
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

const ROLE_RANK: Record<UserRole, number> = { USER: 0, COORDINATOR: 1, ADMIN: 2 };
const DEFAULT_USER_POST_VISIBILITY = CategoryVisibilityMode.NORMAL;

export { ROLE_RANK };
export const USER_ROLES = Object.values(UserRole) as UserRole[];

function isActiveWriter(user: PermissionUser | null | undefined) {
  return user?.status === 'ACTIVE';
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

  if (user.role === 'ADMIN') {
    return true;
  }

  if (
    user.role === 'USER' &&
    targetCountryId !== null &&
    targetCityId !== null &&
    targetCountryId === user.countryId &&
    targetCityId === user.cityId &&
    visibilityMode === DEFAULT_USER_POST_VISIBILITY
  ) {
    return true;
  }

  const matchingPermission = await prisma.postPermission.findFirst({
    where: {
      OR: [
        {
          subjectType: 'USER',
          userId: user.id,
        },
        {
          subjectType: 'ROLE',
          role: user.role,
        },
      ],
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

  const [countries, cities, categories, tagOptions, permissions] = await Promise.all([
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, countryId: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        visibilityMode: true,
      },
    }),
    prisma.postTagOption.findMany({
      where: { isActive: true },
      orderBy: [{ categoryType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        categoryType: true,
        label: true,
        slug: true,
      },
    }),
    user.role === 'ADMIN'
      ? Promise.resolve([])
      : prisma.postPermission.findMany({
          where: {
            OR: [
              {
                subjectType: 'USER',
                userId: user.id,
              },
              {
                subjectType: 'ROLE',
                role: user.role,
              },
            ],
          },
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

  if (user.role === 'ADMIN') {
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
    if (user.role === 'USER' && user.countryId && user.cityId) {
      for (const category of categories) {
        if (category.visibilityMode === DEFAULT_USER_POST_VISIBILITY) {
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
