import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/db/prisma';

export const getActiveCategories = unstable_cache(
  () =>
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        visibilityMode: true,
        type: true,
        requireCommentBeforeContactDefault: true,
      },
    }),
  ['reference-categories-v2'],
  { revalidate: 3600 },
);

export const getActiveCities = unstable_cache(
  () =>
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, countryId: true },
    }),
  ['reference-cities-v2'],
  { revalidate: 3600 },
);

export const getActivePostTagOptions = unstable_cache(
  () =>
    prisma.postTagOption.findMany({
      where: { isActive: true },
      orderBy: [{ categoryType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, label: true, categoryType: true, slug: true },
    }),
  ['reference-post-tag-options-v2'],
  { revalidate: 3600 },
);

export function getActiveCitiesByCountry(countryId: string) {
  return unstable_cache(
    () =>
      prisma.city.findMany({
        where: { isActive: true, countryId },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true },
      }),
    [`reference-cities-${countryId}`],
    { revalidate: 3600 },
  )();
}
