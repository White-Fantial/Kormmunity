import { redirect } from 'next/navigation';

import {

  createCityAction,
  createCountryAction,
  toggleCityActiveAction,
  toggleCountryActiveAction,
} from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const runtime = "nodejs";
export const preferredRegion = "syd1";

export const dynamic = 'force-dynamic';

type AdminCountryCityPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminCountryCityPage({ searchParams }: AdminCountryCityPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;

  const countries = await prisma.country.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      _count: {
        select: {
          cities: true,
          users: true,
        },
      },
      cities: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          _count: { select: { posts: true } },
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 국가/도시 관리</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm" open>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
          <span>국가 추가</span>
          <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">
            ▼
          </span>
        </summary>
        <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
          <form action={createCountryAction} className="space-y-2">
            <input
              type="text"
              name="name"
              required
              placeholder="국가 이름 (예: Australia)"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
            />
            <input
              type="text"
              name="slug"
              required
              placeholder="슬러그 (예: australia, 영문 소문자/하이픈만)"
              pattern="[a-z0-9-]+"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
            />
            <FormSubmitButton
              idleLabel="국가 추가"
              pendingLabel="처리 중..."
              className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
            />
          </form>
        </div>
      </details>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">등록된 국가</h2>
        {countries.length === 0 ? (
          <p className="text-sm text-[#888]">등록된 국가가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {countries.map((country) => (
              <li key={country.id}>
                <details className="group rounded-xl border border-[#e8e8e8]">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{country.name}</p>
                      <p className="truncate text-xs text-[#aaa]">
                        슬러그: {country.slug} · 도시 {country._count.cities}개 · 사용자 {country._count.users}명
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                        country.isActive ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f5] text-[#888]'
                      }`}
                    >
                      {country.isActive ? '활성' : '비활성'}
                    </span>
                    <span className="shrink-0 text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">
                      ▼
                    </span>
                  </summary>

                  <div className="space-y-4 border-t border-[#f0f0f0] px-3 pb-4 pt-3">
                    <div className="flex justify-end">
                      <form action={toggleCountryActiveAction}>
                        <input type="hidden" name="countryId" value={country.id} />
                        <input type="hidden" name="isActive" value={String(country.isActive)} />
                        <FormSubmitButton
                          idleLabel={country.isActive ? '국가 비활성화' : '국가 활성화'}
                          pendingLabel="처리 중..."
                          className="rounded-xl border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]"
                        />
                      </form>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">도시 목록</h3>
                      {country.cities.length === 0 ? (
                        <p className="text-xs text-[#888]">등록된 도시가 없습니다.</p>
                      ) : (
                        <ul className="space-y-2">
                          {country.cities.map((city) => (
                            <li
                              key={city.id}
                              className="flex items-center gap-3 rounded-xl border border-[#e8e8e8] p-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{city.name}</p>
                                <p className="truncate text-xs text-[#aaa]">
                                  슬러그: {city.slug} · 게시글 {city._count.posts}개
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                                  city.isActive ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f5] text-[#888]'
                                }`}
                              >
                                {city.isActive ? '활성' : '비활성'}
                              </span>
                              <form action={toggleCityActiveAction}>
                                <input type="hidden" name="cityId" value={city.id} />
                                <input type="hidden" name="isActive" value={String(city.isActive)} />
                                <FormSubmitButton
                                  idleLabel={city.isActive ? '비활성화' : '활성화'}
                                  pendingLabel="처리 중..."
                                  className="rounded-xl border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]"
                                />
                              </form>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-2 border-t border-[#f0f0f0] pt-3">
                      <h3 className="text-sm font-semibold">도시 추가</h3>
                      <form action={createCityAction} className="space-y-2">
                        <input type="hidden" name="countryId" value={country.id} />
                        <input
                          type="text"
                          name="name"
                          required
                          placeholder="도시 이름 (예: Auckland)"
                          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
                        />
                        <input
                          type="text"
                          name="slug"
                          required
                          placeholder="슬러그 (예: auckland, 영문 소문자/하이픈만)"
                          pattern="[a-z0-9-]+"
                          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
                        />
                        <FormSubmitButton
                          idleLabel="도시 추가"
                          pendingLabel="처리 중..."
                          className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                        />
                      </form>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
