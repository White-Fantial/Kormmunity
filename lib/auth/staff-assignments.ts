import { Prisma } from '@prisma/client';

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
