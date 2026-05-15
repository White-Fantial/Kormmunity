import { prisma } from '@/lib/db/prisma';

export type AuthorAccountOption = {
  id: string;
  displayName: string;
  accountType: 'PERSONA' | 'OPERATOR';
  countryId: string | null;
  cityId: string | null;
};

export async function getAdminAuthorAccountOptions(): Promise<AuthorAccountOption[]> {
  const authorAccountOptionsRaw = await prisma.user.findMany({
    where: {
      accountType: { in: ['PERSONA', 'OPERATOR'] },
      isManagedAccount: true,
      isActive: true,
    },
    select: {
      id: true,
      displayName: true,
      accountType: true,
      countryId: true,
      cityId: true,
      city: {
        select: {
          countryId: true,
        },
      },
    },
    orderBy: [{ accountType: 'asc' }, { displayName: 'asc' }],
  });

  return authorAccountOptionsRaw.map((authorAccount) => ({
    id: authorAccount.id,
    displayName: authorAccount.displayName,
    accountType:
      authorAccount.accountType === 'OPERATOR' ? ('OPERATOR' as const) : ('PERSONA' as const),
    countryId: authorAccount.countryId ?? authorAccount.city?.countryId ?? null,
    cityId: authorAccount.cityId,
  }));
}
