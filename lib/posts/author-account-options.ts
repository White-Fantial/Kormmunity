import type { AccountType, UserStatus } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import type { StaffAssignmentItem } from '@/lib/auth/types';

export type AuthorAccountKind = 'PERSONA' | 'OPERATOR';

export type AuthorAccountOption = {
  id: string;
  displayName: string;
  accountType: AuthorAccountKind;
  countryId: string | null;
  cityId: string | null;
};

export type AuthorScope = {
  countryId: string | null;
  cityId: string | null;
};

type UserWithStaffAssignments = {
  staffAssignments: StaffAssignmentItem[];
};

export type AuthorSelectionCandidate = {
  id: string;
  accountType: AccountType;
  isManagedAccount: boolean;
  isActive: boolean;
  status: UserStatus;
  countryId: string | null;
  cityId: string | null;
  city: {
    countryId: string | null;
  } | null;
};

function resolveAuthorCountryId(candidate: AuthorSelectionCandidate) {
  return candidate.countryId ?? candidate.city?.countryId ?? null;
}

function toAuthorAccountKind(candidate: AuthorSelectionCandidate): AuthorAccountKind | null {
  if (!candidate.isManagedAccount || !candidate.isActive || candidate.status !== 'ACTIVE') {
    return null;
  }

  if (candidate.accountType === 'OPERATOR') {
    return 'OPERATOR';
  }

  if (candidate.accountType === 'PERSONA') {
    return 'PERSONA';
  }

  return null;
}

export function canSelectAuthorAccount(user: UserWithStaffAssignments) {
  return user.staffAssignments.some((a) => a.role === 'ADMIN');
}

export function canActorUseAuthorForScope(
  actor: UserWithStaffAssignments,
  candidate: AuthorSelectionCandidate,
  _scope: AuthorScope,
) {
  void _scope;
  const authorAccountKind = toAuthorAccountKind(candidate);
  if (!authorAccountKind) {
    return false;
  }

  if (actor.staffAssignments.some((a) => a.role === 'ADMIN')) {
    return true;
  }

  return false;
}

export async function getAuthorAccountOptionsForActor(
  actor: UserWithStaffAssignments,
  _allowedScopes: AuthorScope[],
): Promise<AuthorAccountOption[]> {
  void _allowedScopes;
  if (!canSelectAuthorAccount(actor)) {
    return [];
  }

  const authorAccountOptionsRaw = await prisma.user.findMany({
    where: {
      accountType: { in: ['PERSONA', 'OPERATOR'] },
      isManagedAccount: true,
      isActive: true,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      displayName: true,
      accountType: true,
      isManagedAccount: true,
      isActive: true,
      status: true,
      countryId: true,
      cityId: true,
      city: {
        select: {
          countryId: true,
        },
      },
    },
    orderBy: [{ displayName: 'asc' }],
  });

  return authorAccountOptionsRaw
    .map((candidate) => {
      const accountType = toAuthorAccountKind(candidate);
      if (!accountType) {
        return null;
      }

      const countryId = resolveAuthorCountryId(candidate);
      return {
        id: candidate.id,
        displayName: candidate.displayName,
        accountType,
        countryId,
        cityId: candidate.cityId,
      } satisfies AuthorAccountOption;
    })
    .filter((candidate): candidate is AuthorAccountOption => candidate !== null);
}
