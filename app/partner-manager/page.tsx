import { redirect } from 'next/navigation';

import {
  createAdvertiserAction,
  deactivateAdvertiserMemberAction,
  updateAdvertiserAction,
  upsertAdvertiserMemberAction,
} from '@/app/partner-manager/actions';
import { ManagementSectionNav, partnerManagerNavItems } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  canAccessPartnerManagerSection,
  canManagePartnerManagerScope,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type PartnerManagerPageProps = {
  searchParams: Promise<{ error?: string; success?: string; userSearch?: string }>;
};

function formatScope(scope: { country: { name: string } | null; city: { name: string } | null }) {
  const countryLabel = scope.country?.name ?? '전체 국가';
  const cityLabel = scope.city?.name ?? '전체 도시';
  return `${countryLabel} / ${cityLabel}`;
}

export default async function PartnerManagerPage({ searchParams }: PartnerManagerPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canAccessPartnerManagerSection(currentUser)) {
    redirect('/posts');
  }

  const query = await searchParams;
  const userSearch = query.userSearch?.trim() ?? '';

  const [countries, advertisers, users] = await Promise.all([
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        cities: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.advertiser.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        countryId: true,
        cityId: true,
        country: { select: { name: true } },
        city: { select: { name: true } },
        contactEmail: true,
        contactPhone: true,
        websiteUrl: true,
        notes: true,
        isActive: true,
        members: {
          orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            role: true,
            isActive: true,
            userId: true,
            user: { select: { displayName: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        status: { not: 'DELETED' },
        isManagedAccount: false,
        ...(userSearch ? { displayName: { contains: userSearch, mode: 'insensitive' } } : {}),
      },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        displayName: true,
      },
      take: 200,
    }),
  ]);

  const manageableAdvertisers = advertisers.filter((advertiser) =>
    canManagePartnerManagerScope(currentUser, advertiser.countryId, advertiser.cityId),
  );

  const inputClass =
    'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const selectClass =
    'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const submitClass =
    'rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">파트너 매니저 — 광고주 관리</h1>
        <ManagementSectionNav items={partnerManagerNavItems} />
      </div>

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}
      {query.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>
      ) : null}

      <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
          <span>광고주 생성</span>
          <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
        </summary>
        <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
          <form action={createAdvertiserAction} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">광고주 이름 *</span>
              <input name="name" required className={inputClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">슬러그 *</span>
              <input name="slug" required placeholder="brand-name" className={inputClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">국가 (없으면 전체 국가)</span>
              <select name="countryId" className={selectClass}>
                <option value="">전체 국가</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">도시 (없으면 전체 도시)</span>
              <select name="cityId" className={selectClass}>
                <option value="">전체 도시</option>
                {countries.flatMap((country) =>
                  country.cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {country.name} / {city.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">연락 이메일</span>
              <input type="email" name="contactEmail" className={inputClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">연락 전화</span>
              <input name="contactPhone" className={inputClass} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-[#555]">웹사이트</span>
              <input type="url" name="websiteUrl" className={inputClass} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-[#555]">메모</span>
              <textarea name="notes" rows={2} className={inputClass} />
            </label>
            <div className="sm:col-span-2">
              <FormSubmitButton idleLabel="광고주 생성" pendingLabel="생성 중..." className={submitClass} />
            </div>
          </form>
        </div>
      </details>

      <div className="space-y-3">
        {manageableAdvertisers.length === 0 ? (
          <p className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#888]">
            관리 가능한 광고주가 없습니다.
          </p>
        ) : (
          manageableAdvertisers.map((advertiser) => (
            <details key={advertiser.id} className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
                <div>
                  <span className="font-semibold">{advertiser.name}</span>
                  <span className="ml-2 text-xs text-[#888]">
                    {formatScope(advertiser)} · {advertiser.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
              </summary>
              <div className="space-y-4 border-t border-[#f0f0f0] px-4 pb-4 pt-3">
                <form action={updateAdvertiserAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="advertiserId" value={advertiser.id} />
                  <label className="space-y-1 text-sm">
                    <span className="text-[#555]">광고주 이름 *</span>
                    <input name="name" required defaultValue={advertiser.name} className={inputClass} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[#555]">슬러그 *</span>
                    <input name="slug" required defaultValue={advertiser.slug} className={inputClass} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[#555]">국가</span>
                    <select name="countryId" defaultValue={advertiser.countryId ?? ''} className={selectClass}>
                      <option value="">전체 국가</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[#555]">도시</span>
                    <select name="cityId" defaultValue={advertiser.cityId ?? ''} className={selectClass}>
                      <option value="">전체 도시</option>
                      {countries.flatMap((country) =>
                        country.cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {country.name} / {city.name}
                          </option>
                        )),
                      )}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[#555]">연락 이메일</span>
                    <input type="email" name="contactEmail" defaultValue={advertiser.contactEmail ?? ''} className={inputClass} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[#555]">연락 전화</span>
                    <input name="contactPhone" defaultValue={advertiser.contactPhone ?? ''} className={inputClass} />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-[#555]">웹사이트</span>
                    <input type="url" name="websiteUrl" defaultValue={advertiser.websiteUrl ?? ''} className={inputClass} />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-[#555]">메모</span>
                    <textarea name="notes" rows={2} defaultValue={advertiser.notes ?? ''} className={inputClass} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[#555]">상태</span>
                    <select name="isActive" defaultValue={advertiser.isActive ? 'true' : 'false'} className={selectClass}>
                      <option value="true">활성</option>
                      <option value="false">비활성</option>
                    </select>
                  </label>
                  <div className="flex items-end">
                    <FormSubmitButton idleLabel="광고주 저장" pendingLabel="저장 중..." className={submitClass} />
                  </div>
                </form>

                <div className="space-y-2 rounded-lg border border-[#f0f0f0] p-3">
                  <p className="text-sm font-semibold">광고주 멤버 매핑</p>
                  <form action={upsertAdvertiserMemberAction} className="grid gap-3 sm:grid-cols-3">
                    <input type="hidden" name="advertiserId" value={advertiser.id} />
                    <div className="space-y-1 text-sm sm:col-span-2">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <span className="block text-[#555]">사용자 검색 (닉네임)</span>
                          <form action="/partner-manager" method="get" className="flex gap-2">
                            <input
                              type="text"
                              name="userSearch"
                              defaultValue={userSearch}
                              placeholder="닉네임 입력 후 검색"
                              className={inputClass}
                            />
                            <button type="submit" className="rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs hover:bg-[#f9f9f9]">
                              검색
                            </button>
                          </form>
                        </div>
                      </div>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[#555]">
                          사용자 선택
                          {userSearch ? ` — "${userSearch}" 검색 결과 (${users.length}명)` : ''}
                        </span>
                        <select name="userId" required className={selectClass}>
                          <option value="">사용자 선택</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.displayName} (ID: {user.id.slice(0, 8)})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="space-y-1 text-sm">
                      <span className="text-[#555]">역할</span>
                      <select name="role" defaultValue="MEMBER" className={selectClass}>
                        <option value="OWNER">OWNER</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                    </label>
                    <div className="sm:col-span-3">
                      <FormSubmitButton idleLabel="멤버 저장" pendingLabel="저장 중..." className={submitClass} />
                    </div>
                  </form>

                  {advertiser.members.length > 0 ? (
                    <ul className="space-y-2">
                      {advertiser.members.map((member) => (
                        <li key={member.id} className="rounded-lg border border-[#e8e8e8] p-2 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">{member.user.displayName}</p>
                              <p className="text-xs text-[#888]">
                                {member.role} · {member.isActive ? '활성' : '비활성'}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <form action={upsertAdvertiserMemberAction} className="flex items-center gap-2">
                                <input type="hidden" name="advertiserId" value={advertiser.id} />
                                <input type="hidden" name="userId" value={member.userId} />
                                <select name="role" defaultValue={member.role} className="rounded border border-[#e8e8e8] px-2 py-1 text-xs">
                                  <option value="OWNER">OWNER</option>
                                  <option value="MEMBER">MEMBER</option>
                                </select>
                                <FormSubmitButton
                                  idleLabel="역할 저장"
                                  pendingLabel="저장 중..."
                                  className="rounded border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]"
                                />
                              </form>
                              {member.isActive ? (
                                <form action={deactivateAdvertiserMemberAction}>
                                  <input type="hidden" name="membershipId" value={member.id} />
                                  <FormSubmitButton
                                    idleLabel="비활성화"
                                    pendingLabel="처리 중..."
                                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                  />
                                </form>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#888]">아직 등록된 광고주 멤버가 없습니다.</p>
                  )}
                </div>
              </div>
            </details>
          ))
        )}
      </div>
    </section>
  );
}
