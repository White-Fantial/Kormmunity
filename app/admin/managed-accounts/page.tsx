import Link from 'next/link';
import { redirect } from 'next/navigation';

import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { DateTimeText } from '@/components/ui/date-time-text';
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

  const filteredManagedAccounts = await prisma.user.findMany({
    where: {
      isManagedAccount: true,
      accountType: selectedManagedType,
      ...(includeInactiveManaged ? {} : { isActive: true }),
    },
    orderBy: [{ isActive: 'desc' }, { displayName: 'asc' }],
    select: {
      id: true,
      displayName: true,
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
      createdAt: true,
    },
  });

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

  const filterQuery = new URLSearchParams({
    managedType: selectedManagedType,
    ...(includeInactiveManaged ? { includeInactive: 'true' } : {}),
  }).toString();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 운영 계정 관리</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">운영 계정 목록</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/managed-accounts/new${filterQuery ? `?${filterQuery}` : ''}`}
              className="rounded-xl bg-[#fee500] px-3 py-1.5 text-xs font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
            >
              운영 계정 생성
            </Link>
          </div>
        </div>

        <form className="mb-4 flex flex-wrap items-center gap-2">
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

        {filteredManagedAccounts.length === 0 ? (
          <p className="text-sm text-[#888]">조건에 맞는 운영 계정이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {filteredManagedAccounts.map((managed) => {
              const countryName = managed.country?.name ?? managed.city?.country?.name ?? null;
              const lastUsedAt = lastUsedByManagedUserId.get(managed.id);
              const detailQuery = new URLSearchParams({
                managedType: selectedManagedType,
                ...(includeInactiveManaged ? { includeInactive: 'true' } : {}),
              }).toString();

              return (
                <li key={managed.id} className="rounded-xl border border-[#e8e8e8] p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#666]">
                    <span className="font-semibold text-[#333]">{managed.displayName}</span>
                    <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5">{managed.accountType}</span>
                    <span>{managed.isActive ? '활성' : '비활성'}</span>
                    <span>{countryName ?? '국가 미지정'}</span>
                    <span>{managed.city?.name ?? '도시 미지정'}</span>
                    <span className="ml-auto text-[#999]">
                      최근 사용: {lastUsedAt ? <DateTimeText value={lastUsedAt} /> : '기록 없음'}
                    </span>
                    <Link
                      href={`/admin/managed-accounts/${managed.id}${detailQuery ? `?${detailQuery}` : ''}`}
                      className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]"
                    >
                      상세/수정
                    </Link>
                  </div>
                  <p className="mt-2 text-xs text-[#888]">생성: <DateTimeText value={managed.createdAt} /></p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
