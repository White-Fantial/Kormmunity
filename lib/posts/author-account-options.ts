import type { AccountType, UserRole, UserStatus } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

export type AuthorAccountKind = 'OPERATOR';

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

export type AuthorSelectionCandidate = {
  id: string;
  role: UserRole;
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
  if (
    candidate.accountType === 'OPERATOR' &&
    candidate.isManagedAccount &&
    candidate.isActive &&
    candidate.status === 'ACTIVE'
  ) {
    return 'OPERATOR';
  }

  return null;
}

function canAccountCoverScope(
  candidateCountryId: string | null,
  candidateCityId: string | null,
  scope: AuthorScope,
) {
  if (scope.countryId && candidateCountryId !== scope.countryId) {
    return false;
  }

  if (!scope.cityId) {
    return true;
  }

  return candidateCityId === null || candidateCityId === scope.cityId;
}

function normalizeScopes(scopes: AuthorScope[]) {
  const map = new Map<string, AuthorScope>();
  for (const scope of scopes) {
    map.set(`${scope.countryId ?? '*'}:${scope.cityId ?? '*'}`, scope);
  }
  return [...map.values()];
}

export function canSelectAuthorAccount(role: UserRole) {
  return role === 'ADMIN' || role === 'COORDINATOR';
}

export function canActorUseAuthorForScope(
  actorRole: UserRole,
  candidate: AuthorSelectionCandidate,
  scope: AuthorScope,
) {
  const authorAccountKind = toAuthorAccountKind(candidate);
  if (!authorAccountKind) {
    return false;
  }

  if (actorRole === 'ADMIN') {
    return true;
  }

  if (actorRole !== 'COORDINATOR') {
    return false;
  }

  const candidateCountryId = resolveAuthorCountryId(candidate);
  return canAccountCoverScope(candidateCountryId, candidate.cityId, scope);
}

export async function getAuthorAccountOptionsForActor(
  actorRole: UserRole,
  allowedScopes: AuthorScope[],
): Promise<AuthorAccountOption[]> {
  if (!canSelectAuthorAccount(actorRole)) {
    return [];
  }

  const normalizedScopes = normalizeScopes(allowedScopes);
  if (actorRole === 'COORDINATOR' && normalizedScopes.length === 0) {
    return [];
  }

  const authorAccountOptionsRaw = await prisma.user.findMany({
    where: {
      accountType: 'OPERATOR',
      isManagedAccount: true,
      isActive: true,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      displayName: true,
      role: true,
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
      if (
        actorRole === 'COORDINATOR' &&
        !normalizedScopes.some((scope) =>
          canAccountCoverScope(countryId, candidate.cityId, scope),
        )
      ) {
        return null;
      }

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
