import { prisma } from '@/lib/db/prisma';
import { buildDateRange, type DashboardRange } from '@/lib/admin/stats';

export type SearchAlertStatsRange = DashboardRange | 'custom';
export type SearchAlertRegionMode = 'fallback' | 'snapshot';

export type SearchAlertStatsInput = {
  range: SearchAlertStatsRange;
  from?: string;
  to?: string;
  keyword?: string;
  countryId?: string;
  cityId?: string;
  regionMode: SearchAlertRegionMode;
};

type SearchAlertRawRow = {
  id: string;
  userId: string;
  query: string;
  createdAt: Date;
  countryIdSnapshot: string | null;
  cityIdSnapshot: string | null;
  countrySnapshot: { id: string; name: string } | null;
  citySnapshot: { id: string; name: string; countryId: string | null; country: { name: string } | null } | null;
  user: {
    displayName: string;
    countryId: string | null;
    cityId: string | null;
    country: { name: string } | null;
    city: { name: string; countryId: string | null; country: { name: string } | null } | null;
  };
};

type ResolvedRegion = {
  countryId: string | null;
  countryName: string | null;
  cityId: string | null;
  cityName: string | null;
};

type AlertWithRegion = SearchAlertRawRow & {
  effectiveRegion: ResolvedRegion;
};

export type SearchAlertStatsResult = {
  period: {
    label: string;
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
  };
  kpi: {
    totalRegistrations: number;
    uniqueQueries: number;
    newQueryCount: number;
    newQueryRatio: number;
  };
  topQueries: Array<{
    query: string;
    count: number;
    uniqueUsers: number;
    lastRegisteredAt: Date;
    dominantCountry: string;
    dominantCity: string;
  }>;
  registrations: Array<{
    id: string;
    query: string;
    createdAt: Date;
    userDisplayName: string;
    snapshotCountry: string;
    snapshotCity: string;
    currentCountry: string;
    currentCity: string;
  }>;
  countries: Array<{
    key: string;
    name: string;
    count: number;
    uniqueQueries: number;
    deltaFromPrevious: number;
    previousCount: number;
  }>;
  cities: Array<{
    key: string;
    name: string;
    countryName: string;
    count: number;
    uniqueQueries: number;
    deltaFromPrevious: number;
    previousCount: number;
  }>;
  queryTrends: Array<{
    query: string;
    currentCount: number;
    previousCount: number;
    delta: number;
  }>;
};

function parseDateOnlyStart(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnlyEndExclusive(value: string): Date | null {
  const start = parseDateOnlyStart(value);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function buildRange(range: SearchAlertStatsRange, from?: string, to?: string) {
  if (range !== 'custom') {
    const preset = buildDateRange(range);
    const duration = preset.end.getTime() - preset.start.getTime();
    return {
      label: preset.label,
      start: preset.start,
      end: preset.end,
      previousStart: new Date(preset.start.getTime() - duration),
      previousEnd: preset.start,
    };
  }

  const fromDate = from ? parseDateOnlyStart(from) : null;
  const toDateExclusive = to ? parseDateOnlyEndExclusive(to) : null;

  if (!fromDate || !toDateExclusive || toDateExclusive <= fromDate) {
    const fallback = buildDateRange('week');
    const duration = fallback.end.getTime() - fallback.start.getTime();
    return {
      label: '사용자 지정(기본값: 이번 주)',
      start: fallback.start,
      end: fallback.end,
      previousStart: new Date(fallback.start.getTime() - duration),
      previousEnd: fallback.start,
    };
  }

  const duration = toDateExclusive.getTime() - fromDate.getTime();
  return {
    label: `${from} ~ ${to}`,
    start: fromDate,
    end: toDateExclusive,
    previousStart: new Date(fromDate.getTime() - duration),
    previousEnd: fromDate,
  };
}

function resolveEffectiveRegion(alert: SearchAlertRawRow, mode: SearchAlertRegionMode): ResolvedRegion {
  const citySnapshotCountryId = alert.citySnapshot?.countryId ?? null;
  const userCityCountryId = alert.user.city?.countryId ?? null;

  const countryId =
    alert.countryIdSnapshot ??
    citySnapshotCountryId ??
    (mode === 'fallback' ? (alert.user.countryId ?? userCityCountryId) : null);

  const cityId = alert.cityIdSnapshot ?? (mode === 'fallback' ? alert.user.cityId : null);

  const countryName =
    alert.countrySnapshot?.name ??
    alert.citySnapshot?.country?.name ??
    (mode === 'fallback' ? (alert.user.country?.name ?? alert.user.city?.country?.name ?? null) : null);

  const cityName =
    alert.citySnapshot?.name ??
    (mode === 'fallback' ? (alert.user.city?.name ?? null) : null);

  return {
    countryId,
    countryName,
    cityId,
    cityName,
  };
}

function withEffectiveRegion(
  alerts: SearchAlertRawRow[],
  mode: SearchAlertRegionMode,
): AlertWithRegion[] {
  return alerts.map((alert) => ({
    ...alert,
    effectiveRegion: resolveEffectiveRegion(alert, mode),
  }));
}

function applyRegionFilter(
  alerts: AlertWithRegion[],
  countryId: string | undefined,
  cityId: string | undefined,
): AlertWithRegion[] {
  return alerts.filter((alert) => {
    if (countryId && alert.effectiveRegion.countryId !== countryId) {
      return false;
    }

    if (cityId && alert.effectiveRegion.cityId !== cityId) {
      return false;
    }

    return true;
  });
}

function toDisplay(value: string | null): string {
  return value ?? '미상';
}

function safeKey(value: string | null, unknownKey: string): string {
  return value ?? unknownKey;
}

export async function getSearchAlertStats(input: SearchAlertStatsInput): Promise<SearchAlertStatsResult> {
  const period = buildRange(input.range, input.from, input.to);
  const keyword = input.keyword?.trim() ?? '';

  const baseWhere = keyword
    ? {
        query: {
          contains: keyword,
          mode: 'insensitive' as const,
        },
      }
    : {};

  const select = {
    id: true,
    userId: true,
    query: true,
    createdAt: true,
    countryIdSnapshot: true,
    cityIdSnapshot: true,
    countrySnapshot: {
      select: {
        id: true,
        name: true,
      },
    },
    citySnapshot: {
      select: {
        id: true,
        name: true,
        countryId: true,
        country: {
          select: {
            name: true,
          },
        },
      },
    },
    user: {
      select: {
        displayName: true,
        countryId: true,
        cityId: true,
        country: {
          select: {
            name: true,
          },
        },
        city: {
          select: {
            name: true,
            countryId: true,
            country: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    },
  } as const;

  const [currentRaw, previousRaw] = await Promise.all([
    prisma.searchAlert.findMany({
      where: {
        ...baseWhere,
        createdAt: {
          gte: period.start,
          lt: period.end,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select,
    }),
    prisma.searchAlert.findMany({
      where: {
        ...baseWhere,
        createdAt: {
          gte: period.previousStart,
          lt: period.previousEnd,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select,
    }),
  ]);

  const currentWithRegion = applyRegionFilter(withEffectiveRegion(currentRaw, input.regionMode), input.countryId, input.cityId);
  const previousWithRegion = applyRegionFilter(withEffectiveRegion(previousRaw, input.regionMode), input.countryId, input.cityId);

  const querySet = new Set(currentWithRegion.map((item) => item.query));
  const queries = Array.from(querySet);

  const firstSeenByQuery = new Map<string, Date>();
  if (queries.length > 0) {
    const firstSeenRows = await prisma.searchAlert.groupBy({
      by: ['query'],
      where: {
        query: {
          in: queries,
        },
      },
      _min: {
        createdAt: true,
      },
    });

    for (const row of firstSeenRows) {
      if (row._min.createdAt) {
        firstSeenByQuery.set(row.query, row._min.createdAt);
      }
    }
  }

  const topQueryMap = new Map<string, {
    count: number;
    users: Set<string>;
    lastRegisteredAt: Date;
    countryCounts: Map<string, number>;
    cityCounts: Map<string, number>;
  }>();

  for (const alert of currentWithRegion) {
    const entry = topQueryMap.get(alert.query) ?? {
      count: 0,
      users: new Set<string>(),
      lastRegisteredAt: alert.createdAt,
      countryCounts: new Map<string, number>(),
      cityCounts: new Map<string, number>(),
    };

    entry.count += 1;
    entry.users.add(alert.userId);
    if (alert.createdAt > entry.lastRegisteredAt) {
      entry.lastRegisteredAt = alert.createdAt;
    }

    const countryLabel = toDisplay(alert.effectiveRegion.countryName);
    entry.countryCounts.set(countryLabel, (entry.countryCounts.get(countryLabel) ?? 0) + 1);

    const cityLabel = toDisplay(alert.effectiveRegion.cityName);
    entry.cityCounts.set(cityLabel, (entry.cityCounts.get(cityLabel) ?? 0) + 1);

    topQueryMap.set(alert.query, entry);
  }

  const topQueries = Array.from(topQueryMap.entries())
    .map(([query, value]) => {
      const dominantCountry = Array.from(value.countryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '미상';
      const dominantCity = Array.from(value.cityCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '미상';

      return {
        query,
        count: value.count,
        uniqueUsers: value.users.size,
        lastRegisteredAt: value.lastRegisteredAt,
        dominantCountry,
        dominantCity,
      };
    })
    .sort((a, b) => b.count - a.count || b.uniqueUsers - a.uniqueUsers || b.lastRegisteredAt.getTime() - a.lastRegisteredAt.getTime())
    .slice(0, 30);

  const registrations = currentWithRegion
    .map((alert) => ({
      id: alert.id,
      query: alert.query,
      createdAt: alert.createdAt,
      userDisplayName: alert.user.displayName,
      snapshotCountry: toDisplay(alert.countrySnapshot?.name ?? alert.citySnapshot?.country?.name ?? null),
      snapshotCity: toDisplay(alert.citySnapshot?.name ?? null),
      currentCountry: toDisplay(alert.user.country?.name ?? alert.user.city?.country?.name ?? null),
      currentCity: toDisplay(alert.user.city?.name ?? null),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 200);

  const countryCurrentMap = new Map<string, { name: string; count: number; queries: Set<string> }>();
  const countryPreviousMap = new Map<string, number>();

  for (const alert of currentWithRegion) {
    const key = safeKey(alert.effectiveRegion.countryId, '__UNKNOWN_COUNTRY__');
    const name = toDisplay(alert.effectiveRegion.countryName);
    const entry = countryCurrentMap.get(key) ?? { name, count: 0, queries: new Set<string>() };
    entry.count += 1;
    entry.queries.add(alert.query);
    countryCurrentMap.set(key, entry);
  }

  for (const alert of previousWithRegion) {
    const key = safeKey(alert.effectiveRegion.countryId, '__UNKNOWN_COUNTRY__');
    countryPreviousMap.set(key, (countryPreviousMap.get(key) ?? 0) + 1);
  }

  const countries = Array.from(countryCurrentMap.entries())
    .map(([key, value]) => ({
      key,
      name: value.name,
      count: value.count,
      uniqueQueries: value.queries.size,
      previousCount: countryPreviousMap.get(key) ?? 0,
      deltaFromPrevious: value.count - (countryPreviousMap.get(key) ?? 0),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const cityCurrentMap = new Map<string, { name: string; countryName: string; count: number; queries: Set<string> }>();
  const cityPreviousMap = new Map<string, number>();

  for (const alert of currentWithRegion) {
    const key = safeKey(alert.effectiveRegion.cityId, '__UNKNOWN_CITY__');
    const name = toDisplay(alert.effectiveRegion.cityName);
    const countryName = toDisplay(alert.effectiveRegion.countryName);
    const entry = cityCurrentMap.get(key) ?? { name, countryName, count: 0, queries: new Set<string>() };
    entry.count += 1;
    entry.queries.add(alert.query);
    cityCurrentMap.set(key, entry);
  }

  for (const alert of previousWithRegion) {
    const key = safeKey(alert.effectiveRegion.cityId, '__UNKNOWN_CITY__');
    cityPreviousMap.set(key, (cityPreviousMap.get(key) ?? 0) + 1);
  }

  const cities = Array.from(cityCurrentMap.entries())
    .map(([key, value]) => ({
      key,
      name: value.name,
      countryName: value.countryName,
      count: value.count,
      uniqueQueries: value.queries.size,
      previousCount: cityPreviousMap.get(key) ?? 0,
      deltaFromPrevious: value.count - (cityPreviousMap.get(key) ?? 0),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const queryCurrentMap = new Map<string, number>();
  const queryPreviousMap = new Map<string, number>();

  for (const alert of currentWithRegion) {
    queryCurrentMap.set(alert.query, (queryCurrentMap.get(alert.query) ?? 0) + 1);
  }

  for (const alert of previousWithRegion) {
    queryPreviousMap.set(alert.query, (queryPreviousMap.get(alert.query) ?? 0) + 1);
  }

  const trendQueries = new Set([...queryCurrentMap.keys(), ...queryPreviousMap.keys()]);
  const queryTrends = Array.from(trendQueries)
    .map((query) => {
      const currentCount = queryCurrentMap.get(query) ?? 0;
      const previousCount = queryPreviousMap.get(query) ?? 0;
      return {
        query,
        currentCount,
        previousCount,
        delta: currentCount - previousCount,
      };
    })
    .sort((a, b) => b.delta - a.delta || b.currentCount - a.currentCount)
    .slice(0, 30);

  const newQueryCount = queries.filter((query) => {
    const firstSeen = firstSeenByQuery.get(query);
    return firstSeen ? firstSeen >= period.start : false;
  }).length;

  return {
    period,
    kpi: {
      totalRegistrations: currentWithRegion.length,
      uniqueQueries: querySet.size,
      newQueryCount,
      newQueryRatio: querySet.size > 0 ? newQueryCount / querySet.size : 0,
    },
    topQueries,
    registrations,
    countries,
    cities,
    queryTrends,
  };
}
