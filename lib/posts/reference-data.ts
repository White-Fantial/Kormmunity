import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/db/prisma';

export const getActiveCategories = unstable_cache(
  () =>
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ['reference-categories'],
  { revalidate: 3600 },
);

export const getActiveCities = unstable_cache(
  () =>
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
  ['reference-cities'],
  { revalidate: 3600 },
);
