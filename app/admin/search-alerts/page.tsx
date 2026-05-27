import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ManagementSectionHeader, adminManagementNavItems } from '@/components/admin/management-section-nav';
import { DateTimeText } from '@/components/ui/date-time-text';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { isAdmin } from '@/lib/permissions';
import {
  getSearchAlertStats,
  type SearchAlertRegionMode,
  type SearchAlertStatsRange,
} from '@/lib/admin/search-alert-stats';

export const dynamic = 'force-dynamic';

type SearchAlertAdminPageProps = {
  searchParams: Promise<{
    tab?: string;
    range?: string;
    from?: string;
    to?: string;
    q?: string;
    countryId?: string;
    cityId?: string;
    regionMode?: string;
  }>;
};

const RANGE_OPTIONS: Array<{ value: SearchAlertStatsRange; label: string }> = [
  { value: 'today', label: '오늘' },
  { value: 'yesterday', label: '어제' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: 'custom', label: '직접 선택' },
];

const TABS = [
  { value: 'summary', label: '요약' },
  { value: 'ranking', label: '검색어 순위' },
  { value: 'registrations', label: '등록 목록' },
  { value: 'regions', label: '지역 비교' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

function isValidRange(value: string | undefined): value is SearchAlertStatsRange {
  return value === 'today' || value === 'yesterday' || value === 'week' || value === 'month' || value === 'custom';
}

function isValidTab(value: string | undefined): value is TabValue {
  return value === 'summary' || value === 'ranking' || value === 'registrations' || value === 'regions';
}

function isValidRegionMode(value: string | undefined): value is SearchAlertRegionMode {
  return value === 'fallback' || value === 'snapshot';
}

function renderDelta(delta: number) {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

export default async function AdminSearchAlertsPage({ searchParams }: SearchAlertAdminPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;

  const tab: TabValue = isValidTab(params.tab) ? params.tab : 'summary';
  const range: SearchAlertStatsRange = isValidRange(params.range) ? params.range : 'week';
  const regionMode: SearchAlertRegionMode = isValidRegionMode(params.regionMode)
    ? params.regionMode
    : 'fallback';
  const keyword = params.q?.trim() ?? '';
  const selectedCountryId = params.countryId?.trim() || '';
  const selectedCityId = params.cityId?.trim() || '';

  const [countries, cities, stats] = await Promise.all([
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, countryId: true },
    }),
    getSearchAlertStats({
      range,
      from: params.from,
      to: params.to,
      keyword,
      countryId: selectedCountryId || undefined,
      cityId: selectedCityId || undefined,
      regionMode,
    }),
  ]);

  const cityOptions = selectedCountryId
    ? cities.filter((city) => city.countryId === selectedCountryId)
    : cities;

  const baseSearchParams = new URLSearchParams();
  if (range) baseSearchParams.set('range', range);
  if (params.from) baseSearchParams.set('from', params.from);
  if (params.to) baseSearchParams.set('to', params.to);
  if (keyword) baseSearchParams.set('q', keyword);
  if (selectedCountryId) baseSearchParams.set('countryId', selectedCountryId);
  if (selectedCityId) baseSearchParams.set('cityId', selectedCityId);
  if (regionMode) baseSearchParams.set('regionMode', regionMode);

  const buildTabHref = (nextTab: TabValue) => {
    const next = new URLSearchParams(baseSearchParams);
    next.set('tab', nextTab);
    return `/admin/search-alerts?${next.toString()}`;
  };

  return (
    <section className="space-y-6">
      <ManagementSectionHeader
        sectionLabel="관리자"
        pageLabel="검색어 통계"
        items={adminManagementNavItems}
      />

      <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
          <span className="font-semibold">필터</span>
          <span className="text-xs text-[#888] group-open:hidden">펼치기</span>
          <span className="hidden text-xs text-[#888] group-open:inline">접기</span>
        </summary>
        <div className="hidden border-t border-[#f0f0f0] p-4 group-open:block">
          <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-4">
            <p className="text-xs text-[#777]">기간</p>
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="submit"
                  name="range"
                  value={option.value}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    range === option.value
                      ? 'border-[#fee500] bg-[#fee500] font-semibold text-[#3c1e1e]'
                      : 'border-[#e8e8e8] hover:border-[#fee500] hover:bg-[#fffde7]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="space-y-1 text-sm">
            <span className="text-[#555]">검색어 포함</span>
            <input
              type="text"
              name="q"
              defaultValue={keyword}
              placeholder="예: 중고차"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-[#555]">국가</span>
            <select
              name="countryId"
              defaultValue={selectedCountryId}
              className="w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm"
            >
              <option value="">전체</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-[#555]">도시</span>
            <select
              name="cityId"
              defaultValue={selectedCityId}
              className="w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm"
            >
              <option value="">전체</option>
              {cityOptions.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-[#555]">지역 기준</span>
            <select
              name="regionMode"
              defaultValue={regionMode}
              className="w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm"
            >
              <option value="fallback">스냅샷 우선 + 현재 위치 보완</option>
              <option value="snapshot">스냅샷만 사용(없으면 미상)</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-[#555]">시작일(직접선택용)</span>
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ''}
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-[#555]">종료일(직접선택용)</span>
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ''}
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
            />
          </label>

          <input type="hidden" name="tab" value={tab} />

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
            >
              적용
            </button>
            <Link
              href="/admin/search-alerts"
              className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm hover:bg-[#f9f9f9]"
            >
              초기화
            </Link>
          </div>
          </form>
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={buildTabHref(item.value)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              tab === item.value
                ? 'border-[#fee500] bg-[#fee500] font-semibold text-[#3c1e1e]'
                : 'border-[#e8e8e8] hover:border-[#fee500] hover:bg-[#fffde7]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <p className="text-xs text-[#888]">
        집계 기간: {stats.period.label} (<DateTimeText value={stats.period.start} /> ~ <DateTimeText value={stats.period.end} />)
      </p>

      {tab === 'summary' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#888]">총 등록 건수</p>
            <p className="mt-1 text-2xl font-bold">{stats.kpi.totalRegistrations}</p>
          </div>
          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#888]">고유 검색어 수</p>
            <p className="mt-1 text-2xl font-bold">{stats.kpi.uniqueQueries}</p>
          </div>
          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#888]">신규 유입 검색어</p>
            <p className="mt-1 text-2xl font-bold">{stats.kpi.newQueryCount}</p>
          </div>
          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#888]">신규 검색어 비율</p>
            <p className="mt-1 text-2xl font-bold">{(stats.kpi.newQueryRatio * 100).toFixed(1)}%</p>
          </div>

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm sm:col-span-2">
            <h3 className="mb-2 font-semibold">국가별 Top 10</h3>
            {stats.countries.slice(0, 10).length === 0 ? (
              <p className="text-sm text-[#888]">데이터가 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {stats.countries.slice(0, 10).map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-2">
                    <span>{item.name}</span>
                    <span className="tabular-nums text-[#555]">
                      {item.count}건 ({renderDelta(item.deltaFromPrevious)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm sm:col-span-2">
            <h3 className="mb-2 font-semibold">도시별 Top 10</h3>
            {stats.cities.slice(0, 10).length === 0 ? (
              <p className="text-sm text-[#888]">데이터가 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {stats.cities.slice(0, 10).map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-2">
                    <span>{item.countryName} · {item.name}</span>
                    <span className="tabular-nums text-[#555]">
                      {item.count}건 ({renderDelta(item.deltaFromPrevious)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'ranking' ? (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">검색어 순위</h3>
          {stats.topQueries.length === 0 ? (
            <p className="text-sm text-[#888]">데이터가 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#888]">
                  <th className="pb-2 font-medium">검색어</th>
                  <th className="pb-2 text-right font-medium">등록수</th>
                  <th className="pb-2 text-right font-medium">고유 사용자</th>
                  <th className="pb-2 font-medium">주 사용 국가/도시</th>
                  <th className="pb-2 font-medium">최근 등록</th>
                </tr>
              </thead>
              <tbody>
                {stats.topQueries.map((item) => (
                  <tr key={item.query} className="border-t border-[#f0f0f0]">
                    <td className="py-2 font-medium">{item.query}</td>
                    <td className="py-2 text-right tabular-nums">{item.count}</td>
                    <td className="py-2 text-right tabular-nums">{item.uniqueUsers}</td>
                    <td className="py-2">{item.dominantCountry} · {item.dominantCity}</td>
                    <td className="py-2"><DateTimeText value={item.lastRegisteredAt} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {tab === 'registrations' ? (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">등록 목록 (최신 200건)</h3>
          {stats.registrations.length === 0 ? (
            <p className="text-sm text-[#888]">데이터가 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#888]">
                  <th className="pb-2 font-medium">검색어</th>
                  <th className="pb-2 font-medium">등록자</th>
                  <th className="pb-2 font-medium">등록 시각</th>
                  <th className="pb-2 font-medium">당시 국가/도시</th>
                  <th className="pb-2 font-medium">현재 국가/도시</th>
                </tr>
              </thead>
              <tbody>
                {stats.registrations.map((item) => (
                  <tr key={item.id} className="border-t border-[#f0f0f0]">
                    <td className="py-2 font-medium">{item.query}</td>
                    <td className="py-2">{item.userDisplayName}</td>
                    <td className="py-2"><DateTimeText value={item.createdAt} /></td>
                    <td className="py-2">{item.snapshotCountry} · {item.snapshotCity}</td>
                    <td className="py-2">{item.currentCountry} · {item.currentCity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {tab === 'regions' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold">국가별 비교</h3>
            {stats.countries.length === 0 ? (
              <p className="text-sm text-[#888]">데이터가 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#888]">
                    <th className="pb-2 font-medium">국가</th>
                    <th className="pb-2 text-right font-medium">현재</th>
                    <th className="pb-2 text-right font-medium">이전</th>
                    <th className="pb-2 text-right font-medium">증감</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.countries.map((item) => (
                    <tr key={item.key} className="border-t border-[#f0f0f0]">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-right tabular-nums">{item.count}</td>
                      <td className="py-2 text-right tabular-nums">{item.previousCount}</td>
                      <td className="py-2 text-right tabular-nums">{renderDelta(item.deltaFromPrevious)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold">도시별 비교</h3>
            {stats.cities.length === 0 ? (
              <p className="text-sm text-[#888]">데이터가 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#888]">
                    <th className="pb-2 font-medium">도시</th>
                    <th className="pb-2 text-right font-medium">현재</th>
                    <th className="pb-2 text-right font-medium">이전</th>
                    <th className="pb-2 text-right font-medium">증감</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.cities.map((item) => (
                    <tr key={item.key} className="border-t border-[#f0f0f0]">
                      <td className="py-2">{item.countryName} · {item.name}</td>
                      <td className="py-2 text-right tabular-nums">{item.count}</td>
                      <td className="py-2 text-right tabular-nums">{item.previousCount}</td>
                      <td className="py-2 text-right tabular-nums">{renderDelta(item.deltaFromPrevious)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm lg:col-span-2">
            <h3 className="mb-3 font-semibold">글로벌 급상승 검색어 (현재-이전)</h3>
            {stats.queryTrends.length === 0 ? (
              <p className="text-sm text-[#888]">데이터가 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#888]">
                    <th className="pb-2 font-medium">검색어</th>
                    <th className="pb-2 text-right font-medium">현재</th>
                    <th className="pb-2 text-right font-medium">이전</th>
                    <th className="pb-2 text-right font-medium">증감</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.queryTrends.map((item) => (
                    <tr key={item.query} className="border-t border-[#f0f0f0]">
                      <td className="py-2 font-medium">{item.query}</td>
                      <td className="py-2 text-right tabular-nums">{item.currentCount}</td>
                      <td className="py-2 text-right tabular-nums">{item.previousCount}</td>
                      <td className="py-2 text-right tabular-nums">{renderDelta(item.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
