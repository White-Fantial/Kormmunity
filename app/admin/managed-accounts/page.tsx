import { redirect } from 'next/navigation';

import {
  createManagedAccountAction,
  updateManagedAccountAction,
} from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { ManagedAccountLocationSelects } from '@/components/admin/managed-account-location-selects';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminManagedAccountsPageProps = {
  searchParams: Promise<{
    error?: string;
    managedType?: string;
    includeInactive?: string;
  }>;
};

export default async function AdminManagedAccountsPage({
  searchParams,
}: AdminManagedAccountsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const selectedManagedType = params.managedType === 'OPERATOR' ? 'OPERATOR' : 'PERSONA';
  const includeInactiveManaged = params.includeInactive === 'true';

  const [countries, cities, filteredManagedAccounts] = await Promise.all([
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
        country: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        isManagedAccount: true,
        accountType: selectedManagedType,
        ...(includeInactiveManaged ? {} : { isActive: true }),
      },
      orderBy: [{ isActive: 'desc' }, { displayName: 'asc' }],
      select: {
        id: true,
        displayName: true,
        role: true,
        accountType: true,
        isActive: true,
        countryId: true,
        country: { select: { name: true } },
        cityId: true,
        city: {
          select: {
            name: true,
            countryId: true,
            country: { select: { name: true } },
          },
        },
        shortBio: true,
        personaNotes: true,
        toneNotes: true,
        activityNotes: true,
        profileImageUrl: true,
        createdAt: true,
      },
    }),
  ]);

  const cityOptions = cities.map((c) => ({ id: c.id, name: c.name, countryId: c.countryId }));

  const managedAccountIds = filteredManagedAccounts.map((user) => user.id);
  const [latestManagedPosts, latestManagedComments] =
    managedAccountIds.length > 0
      ? await Promise.all([
          prisma.post.groupBy({
            by: ['authorId'],
            where: { authorId: { in: managedAccountIds } },
            _max: { createdAt: true },
          }),
          prisma.comment.groupBy({
            by: ['authorId'],
            where: { authorId: { in: managedAccountIds } },
            _max: { createdAt: true },
          }),
        ])
      : [[], []];

  const lastUsedByManagedUserId = new Map<string, Date>();
  for (const item of latestManagedPosts) {
    if (item._max.createdAt) {
      lastUsedByManagedUserId.set(item.authorId, item._max.createdAt);
    }
  }
  for (const item of latestManagedComments) {
    if (!item._max.createdAt) continue;
    const existing = lastUsedByManagedUserId.get(item.authorId);
    if (!existing || item._max.createdAt > existing) {
      lastUsedByManagedUserId.set(item.authorId, item._max.createdAt);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 운영 계정 관리</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="space-y-3 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="font-semibold">운영 계정 생성 (ADMIN 전용)</h2>
        <p className="text-xs text-amber-700">
          운영 계정은 기본적으로 로그인 불가(isManagedAccount=true)로 생성됩니다. REAL_USER/SYSTEM 생성은 허용되지 않습니다.
        </p>
        <form action={createManagedAccountAction} className="space-y-2">
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
          <FormSubmitButton
            idleLabel="운영 계정 생성"
            pendingLabel="생성 중..."
            className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
          />
        </form>
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">운영 계정 목록</h2>
          <form className="flex flex-wrap items-center gap-2">
            <select
              name="managedType"
              defaultValue={selectedManagedType}
              className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm"
            >
              <option value="PERSONA">PERSONA</option>
              <option value="OPERATOR">OPERATOR</option>
            </select>
            <label className="inline-flex items-center gap-1 text-xs text-[#555]">
              <input type="checkbox" name="includeInactive" value="true" defaultChecked={includeInactiveManaged} />
              비활성 포함
            </label>
            <button
              type="submit"
              className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]"
            >
              필터 적용
            </button>
          </form>
        </div>
        {filteredManagedAccounts.length === 0 ? (
          <p className="text-sm text-[#888]">조건에 맞는 운영 계정이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {filteredManagedAccounts.map((managed) => {
              const countryName = managed.country?.name ?? managed.city?.country?.name ?? null;
              const lastUsedAt = lastUsedByManagedUserId.get(managed.id);

              return (
                <li key={managed.id} className="rounded-xl border border-[#e8e8e8] p-3">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-xs text-[#666] [&::-webkit-details-marker]:hidden">
                      <span className="font-semibold text-[#333]">{managed.displayName}</span>
                      <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5">{managed.accountType}</span>
                      <span>{managed.isActive ? '활성' : '비활성'}</span>
                      <span>{countryName ?? '국가 미지정'}</span>
                      <span>{managed.city?.name ?? '도시 미지정'}</span>
                      <span className="ml-auto text-[#999]">
                        최근 사용: {lastUsedAt ? new Date(lastUsedAt).toLocaleString('ko-KR') : '기록 없음'}
                      </span>
                    </summary>
                    <form action={updateManagedAccountAction} className="mt-3 space-y-2 border-t border-[#f1f1f1] pt-3">
                      <input type="hidden" name="targetUserId" value={managed.id} />
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
                          defaultCountryId={managed.countryId ?? managed.city?.countryId}
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
                        <span>생성: {new Date(managed.createdAt).toLocaleString('ko-KR')}</span>
                        <span>역할: {managed.role}</span>
                      </div>
                      <FormSubmitButton
                        idleLabel="저장"
                        pendingLabel="처리 중..."
                        className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                      />
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
