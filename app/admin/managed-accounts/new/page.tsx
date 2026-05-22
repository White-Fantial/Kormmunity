import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createManagedAccountAction } from '@/app/admin/actions';
import { ManagedAccountLocationSelects } from '@/components/admin/managed-account-location-selects';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminManagedAccountNewPageProps = {
  searchParams: Promise<{ error?: string; managedType?: string; includeInactive?: string }>;
};

export default async function AdminManagedAccountNewPage({
  searchParams,
}: AdminManagedAccountNewPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const [params, countries, cities] = await Promise.all([
    searchParams,
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
  ]);
  const cityOptions = cities.flatMap((city) =>
    city.countryId ? [{ id: city.id, name: city.name, countryId: city.countryId }] : [],
  );

  const returnTo = '/admin/managed-accounts/new';
  const listQuery = new URLSearchParams({
    ...(params.managedType ? { managedType: params.managedType } : {}),
    ...(params.includeInactive === 'true' ? { includeInactive: 'true' } : {}),
  }).toString();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 운영 계정 생성</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs text-amber-700">
          운영 계정은 기본적으로 로그인 불가(isManagedAccount=true)로 생성됩니다. REAL_USER/SYSTEM 생성은 허용되지 않습니다.
        </p>
        <form action={createManagedAccountAction} className="space-y-2">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              name="displayName"
              required
              placeholder="nickname"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
            />
            <select
              name="accountType"
              required
              defaultValue="PERSONA"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
            >
              <option value="PERSONA">PERSONA</option>
              <option value="OPERATOR">OPERATOR</option>
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <ManagedAccountLocationSelects countries={countries} cities={cityOptions} />
            <select
              name="isActive"
              defaultValue="true"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
            >
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>
          <input
            type="url"
            name="profileImageUrl"
            placeholder="profileImage URL (선택)"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
          />
          <textarea
            name="shortBio"
            rows={2}
            placeholder="shortBio / description (선택)"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <textarea
              name="personaNotes"
              rows={2}
              placeholder="personaNotes (선택)"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs focus:border-[#fee500] focus:outline-none"
            />
            <textarea
              name="toneNotes"
              rows={2}
              placeholder="toneNotes (선택)"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs focus:border-[#fee500] focus:outline-none"
            />
            <textarea
              name="activityNotes"
              rows={2}
              placeholder="activityNotes (선택)"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs focus:border-[#fee500] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FormSubmitButton
              idleLabel="운영 계정 생성"
              pendingLabel="생성 중..."
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
