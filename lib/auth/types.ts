import type { AccountType, StaffRole, UserStatus } from '@prisma/client';

export type StaffAssignmentItem = {
  id: string;
  role: StaffRole;
  countryId: string | null;
  cityId: string | null;
};

export type SessionUser = {
  id: string;
  kakaoId: string;
  displayName: string;
  accountType: AccountType;
  isManagedAccount: boolean;
  isActive: boolean;
  status: UserStatus;
  countryId: string | null;
  cityId: string | null;
  staffAssignments: StaffAssignmentItem[];
};
