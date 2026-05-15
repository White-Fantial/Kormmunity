import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  moderatorManagementNavItems,
  ManagementSectionHeader,
} from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canModerate } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const CHANGE_TYPE_LABELS: Record<string, string> = {
  CITY_CHANGED: '도시 변경',
  COUNTRY_CHANGED_CITY_RESET: '국가 변경 (도시 초기화)',
  ADMIN_OVERRIDE: '관리자 변경',
};

type LocationLogsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function LocationLogsPage({ searchParams }: LocationLogsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canModerate(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const [logs, totalCount] = await Promise.all([
    prisma.locationChangeLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        changeType: true,
        beforeCountryId: true,
        afterCountryId: true,
        beforeCityId: true,
        afterCityId: true,
        createdAt: true,
        user: {
          select: { id: true, displayName: true },
        },
        actor: {
          select: { id: true, displayName: true },
        },
      },
    }),
    prisma.locationChangeLog.count(),
  ]);

  // Collect all country/city IDs for name lookup
  const countryIds = [
    ...new Set(
      logs.flatMap((l) => [l.beforeCountryId, l.afterCountryId].filter(Boolean) as string[]),
    ),
  ];
  const cityIds = [
    ...new Set(
      logs.flatMap((l) => [l.beforeCityId, l.afterCityId].filter(Boolean) as string[]),
    ),
  ];

  const [countries, cities] = await Promise.all([
    countryIds.length > 0
      ? prisma.country.findMany({
          where: { id: { in: countryIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    cityIds.length > 0
      ? prisma.city.findMany({
          where: { id: { in: cityIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const countryMap = Object.fromEntries(countries.map((c) => [c.id, c.name]));
  const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.name]));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNextPage = page < totalPages;

  return (
    <section className="space-y-6">
      <ManagementSectionHeader
        sectionLabel="운영 관리"
        pageLabel="위치 변경 로그"
        items={moderatorManagementNavItems}
      />

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm text-[#888]">전체 {totalCount.toLocaleString()}건</p>

        {logs.length === 0 ? (
          <p className="text-sm text-[#888]">위치 변경 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-left text-[#888]">
                  <th className="py-2 pr-3">일시</th>
                  <th className="py-2 pr-3">사용자</th>
                  <th className="py-2 pr-3">처리자</th>
                  <th className="py-2 pr-3">유형</th>
                  <th className="py-2 pr-3">변경 전</th>
                  <th className="py-2">변경 후</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const beforeLocation = [
                    log.beforeCountryId ? countryMap[log.beforeCountryId] : null,
                    log.beforeCityId ? cityMap[log.beforeCityId] : null,
                  ]
                    .filter(Boolean)
                    .join(' / ') || '—';
                  const afterLocation = [
                    log.afterCountryId ? countryMap[log.afterCountryId] : null,
                    log.afterCityId ? cityMap[log.afterCityId] : null,
                  ]
                    .filter(Boolean)
                    .join(' / ') || '—';

                  return (
                    <tr key={log.id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa]">
                      <td className="py-2 pr-3 text-xs text-[#888] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/users/${log.user.id}`}
                          className="text-[#3c1e1e] hover:underline"
                        >
                          {log.user.displayName}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        {log.actor.id === log.user.id ? (
                          <span className="text-[#888]">본인</span>
                        ) : (
                          <Link
                            href={`/users/${log.actor.id}`}
                            className="text-[#3c1e1e] hover:underline"
                          >
                            {log.actor.displayName}
                          </Link>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                            log.changeType === 'ADMIN_OVERRIDE'
                              ? 'bg-purple-100 text-purple-700'
                              : log.changeType === 'COUNTRY_CHANGED_CITY_RESET'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {CHANGE_TYPE_LABELS[log.changeType] ?? log.changeType}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[#555]">{beforeLocation}</td>
                      <td className="py-2 text-[#555]">{afterLocation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex justify-between gap-2">
            {page > 1 ? (
              <Link
                href={`/moderator/location-logs?page=${page - 1}`}
                className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
              >
                이전
              </Link>
            ) : (
              <span />
            )}
            <span className="self-center text-sm text-[#888]">{page} / {totalPages}</span>
            {hasNextPage ? (
              <Link
                href={`/moderator/location-logs?page=${page + 1}`}
                className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
              >
                다음
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
