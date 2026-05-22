import Link from 'next/link';
import { redirect } from 'next/navigation';

import { updateManagedAccountAction } from '@/app/admin/actions';
import { ManagedAccountLocationSelects } from '@/components/admin/managed-account-location-selects';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { DateTimeText } from '@/components/ui/date-time-text';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminManagedAccountDetailPageProps = {
  params: Promise<{ managedUserId: string }>;
  searchParams: Promise<{ error?: string; managedType?: string; includeInactive?: string }>;
};

export default async function AdminManagedAccountDetailPage({
  params,
  searchParams,
}: AdminManagedAccountDetailPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const [{ managedUserId }, query] = await Promise.all([params, searchParams]);
  const [countries, cities, managed] = await Promise.all([
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        countryId: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: managedUserId },
      select: {
        id: true,
        displayName: true,
        role: true,
        accountType: true,
        isManagedAccount: true,
        isActive: true,
        countryId: true,
        cityId: true,
        shortBio: true,
        personaNotes: true,
        toneNotes: true,
        activityNotes: true,
        profileImageUrl: true,
        createdAt: true,
      },
    }),
  ]);
  const cityOptions = cities.flatMap((city) =>
    city.countryId ? [{ id: city.id, name: city.name, countryId: city.countryId }] : [],
  );

  if (!managed || !managed.isManagedAccount || (managed.accountType !== 'PERSONA' && managed.accountType !== 'OPERATOR')) {
    redirect('/admin/managed-accounts?error=수정 가능한 운영 계정을 찾을 수 없습니다.');
  }

  const listQuery = new URLSearchParams({
    ...(query.managedType ? { managedType: query.managedType } : {}),
    ...(query.includeInactive === 'true' ? { includeInactive: 'true' } : {}),
  }).toString();
  const returnTo = `/admin/managed-accounts/${managed.id}${listQuery ? `?${listQuery}` : ''}`;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 운영 계정 상세/수정</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm space-y-3">
        <p className="text-xs text-[#888]">ID: {managed.id}</p>
        <form action={updateManagedAccountAction} className="space-y-2">
          <input type="hidden" name="targetUserId" value={managed.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              name="displayName"
              defaultValue={managed.displayName}
              required
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
            />
            <select
              name="accountType"
              defaultValue={managed.accountType}
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
            >
              <option value="PERSONA">PERSONA</option>
              <option value="OPERATOR">OPERATOR</option>
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <ManagedAccountLocationSelects
              countries={countries}
              cities={cityOptions}
              defaultCountryId={managed.countryId}
              defaultCityId={managed.cityId}
            />
            <select
              name="isActive"
              defaultValue={String(managed.isActive)}
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
            >
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>
          <input
            type="url"
            name="profileImageUrl"
            defaultValue={managed.profileImageUrl ?? ''}
            placeholder="profileImage URL"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
          />
          <textarea
            name="shortBio"
            rows={2}
            defaultValue={managed.shortBio ?? ''}
            placeholder="shortBio / description"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <textarea
              name="personaNotes"
              rows={2}
              defaultValue={managed.personaNotes ?? ''}
              placeholder="personaNotes"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs"
            />
            <textarea
              name="toneNotes"
              rows={2}
              defaultValue={managed.toneNotes ?? ''}
              placeholder="toneNotes"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs"
            />
            <textarea
              name="activityNotes"
              rows={2}
              defaultValue={managed.activityNotes ?? ''}
              placeholder="activityNotes"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#888]">
            <span>생성: <DateTimeText value={managed.createdAt} /></span>
            <span>역할: {managed.role}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <FormSubmitButton
              idleLabel="저장"
              pendingLabel="처리 중..."
              className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
            />
            <Link
              href={`/admin/managed-accounts${listQuery ? `?${listQuery}` : ''}`}
              className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
            >
              목록으로
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
