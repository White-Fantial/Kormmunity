import { Prisma, type StaffRole, type UserRole } from '@prisma/client';

type LegacyStaffAssignment = {
  id: string;
  role: StaffRole;
  countryId: string | null;
  cityId: string | null;
};

function toLegacyStaffRole(role: UserRole): StaffRole | null {
  if (role === 'ADMIN' || role === 'MODERATOR' || role === 'COORDINATOR') {
    return role;
  }

  return null;
}

export function toLegacyStaffAssignments(role: UserRole, countryId: string | null, cityId: string | null): LegacyStaffAssignment[] {
  const legacyRole = toLegacyStaffRole(role);

  if (!legacyRole) {
    return [];
  }

  return [
    {
      id: `legacy:${legacyRole}`,
      role: legacyRole,
      countryId,
      cityId,
    },
  ];
}

export function isMissingStaffAssignmentTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== 'P2021') {
    return false;
  }

  const table = (error.meta?.table as string | undefined) ?? '';
  return table.endsWith('StaffAssignment');
}
