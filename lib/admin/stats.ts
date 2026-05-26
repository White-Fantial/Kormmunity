/**
 * Admin dashboard stats helper.
 *
 * All date-range boundaries are computed in Pacific/Auckland local time.
 * The service primarily serves NZ-based Korean communities (NZD currency,
 * Korean locale). Adjust SERVICE_TIMEZONE if the community expands.
 */

import { prisma } from '@/lib/db/prisma';

export const SERVICE_TIMEZONE = 'Pacific/Auckland';

// ─── Date range helpers ────────────────────────────────────────────────────────

export type DashboardRange = 'today' | 'yesterday' | 'week' | 'month';

/**
 * Given a UTC timestamp and a timezone, return the UTC timestamp of the start
 * of the local day in that timezone.
 *
 * Method: format the date with hour/minute/second in the target timezone,
 * then subtract that elapsed time from the UTC timestamp.
 * This gives local midnight in UTC. Accurate to ±1 second; suitable for
 * day-level stats. DST transitions that shorten/lengthen a day are ignored
 * here (the impact on a count-by-day stat is negligible).
 */
function getLocalDayStart(date: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => {
    const val = parts.find((p) => p.type === type)?.value ?? '0';
    const n = parseInt(val, 10);
    return Number.isNaN(n) ? 0 : n;
  };

  let hour = get('hour');
  if (hour === 24) hour = 0; // some runtimes return 24 for midnight
  const minute = get('minute');
  const second = get('second');

  const msSinceMidnight =
    (hour * 3_600 + minute * 60 + second) * 1_000 + date.getMilliseconds();
  return new Date(date.getTime() - msSinceMidnight);
}

/**
 * Return numeric day-of-week (0 = Sunday … 6 = Saturday) for a local date,
 * using the en-CA date string to avoid locale ambiguity.
 */
function getLocalDayOfWeek(date: Date, timezone: string): number {
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
  // Parse as noon UTC so we stay on the correct date regardless of runtime timezone
  return new Date(dateStr + 'T12:00:00Z').getUTCDay();
}

/**
 * Return numeric day-of-month (1–31) for the local date.
 */
function getLocalDayOfMonth(date: Date, timezone: string): number {
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
  return parseInt(dateStr.split('-')[2], 10);
}

export type DateRangeResult = {
  start: Date;
  end: Date;
  label: string;
};

export function buildDateRange(range: DashboardRange): DateRangeResult {
  const now = new Date();
  const todayStart = getLocalDayStart(now, SERVICE_TIMEZONE);
  const oneDayMs = 86_400_000;

  switch (range) {
    case 'yesterday': {
      const start = new Date(todayStart.getTime() - oneDayMs);
      return { start, end: todayStart, label: '어제' };
    }
    case 'week': {
      // Monday of current week
      const dow = getLocalDayOfWeek(todayStart, SERVICE_TIMEZONE);
      const daysFromMonday = (dow + 6) % 7; // Mon=0, Sun=6
      const start = new Date(todayStart.getTime() - daysFromMonday * oneDayMs);
      return { start, end: now, label: '이번 주' };
    }
    case 'month': {
      const dom = getLocalDayOfMonth(now, SERVICE_TIMEZONE);
      const start = new Date(todayStart.getTime() - (dom - 1) * oneDayMs);
      return { start, end: now, label: '이번 달' };
    }
    default: // today
      return { start: todayStart, end: now, label: '오늘' };
  }
}

// ─── Query helpers ─────────────────────────────────────────────────────────────

function rangeWhere(start: Date, end: Date) {
  return { gte: start, lte: end } as const;
}

// ─── Main stats function ───────────────────────────────────────────────────────

export type PostSummary = {
  id: string;
  title: string | null;
  body: string;
  viewCount: number;
  createdAt: Date;
  author: { displayName: string };
  city: { name: string } | null;
  category: { name: string };
  _count: { postLikes: number; comments: number; reports: number };
};

export type CommentSummary = {
  id: string;
  body: string;
  createdAt: Date;
  postId: string;
  author: { displayName: string };
};

export type ReportSummary = {
  id: string;
  createdAt: Date;
  reviewStatus: string;
  option: { label: string };
  reporter: { displayName: string };
  targetLabel: string; // truncated post title/comment body
  targetPostId: string; // for linking to the post
};

export type KakaoDeliverySummary = {
  id: string;
  deliveryType: string;
  status: string;
  attemptCount: number;
  errorMessage: string | null;
  createdAt: Date;
  recipientUser: { displayName: string };
};

export type DashboardStats = {
  rangeLabel: string;
  rangeStart: Date;
  rangeEnd: Date;

  // KPI – range-scoped
  kpi: {
    postsCreated: number;
    commentsCreated: number;
    newUsers: number;
    reportsCreated: number; // post + comment combined
    pendingReports: number; // all-time total pending
    kakaoPending: number; // all-time total pending
    kakaoFailedInRange: number;
    kakaoSuccessInRange: number;
    kakaoLongPending: number; // pending > 5 min, all-time
  };

  // Content overview
  content: {
    recentPosts: PostSummary[];
    mostViewedPosts: PostSummary[];
    mostLikedPosts: PostSummary[];
    mostCommentedPosts: PostSummary[];
    postsByCity: { cityName: string; count: number }[];
    postsByCategory: { categoryName: string; count: number }[];
  };

  // Comment overview
  comments: {
    recentComments: CommentSummary[];
    mostActiveCommenters: { displayName: string; commentCount: number }[];
    postsWithMostComments: {
      postId: string;
      title: string;
      commentCount: number;
    }[];
  };

  // Report overview
  reports: {
    byStatus: { status: string; label: string; count: number }[];
    byReason: { reason: string; count: number }[];
    mostReportedPosts: PostSummary[];
    recentReports: ReportSummary[];
  };

  // Kakao health
  kakao: {
    recentFailed: KakaoDeliverySummary[];
  };
};

const POST_SELECT = {
  id: true,
  title: true,
  body: true,
  viewCount: true,
  createdAt: true,
  author: { select: { displayName: true } },
  city: { select: { name: true } },
  category: { select: { name: true } },
  _count: { select: { postLikes: true, comments: true, reports: true } },
} as const;

export async function getDashboardStats(range: DashboardRange): Promise<DashboardStats> {
  const { start, end, label } = buildDateRange(range);

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60_000);

  // For Kakao today stats (always "today" regardless of selected range)
  const { start: todayStart, end: todayEnd } = buildDateRange('today');
  // For "this week" comment stats (always current week)
  const { start: weekStart, end: weekEnd } = buildDateRange('week');

  const [
    postsCreated,
    commentsCreated,
    newUsers,
    postReportsInRange,
    commentReportsInRange,
    pendingPostReports,
    pendingCommentReports,
    kakaoPending,
    kakaoLongPending,
    kakaoFailedInRange,
    kakaoSuccessInRange,

    recentPosts,
    mostViewedPosts,
    mostLikedPosts,
    mostCommentedPosts,
    postsByCityRaw,
    postsByCategoryRaw,

    recentComments,
    commentsByAuthorInRange,
    postCommentCountsInRange,

    postReportsByStatus,
    commentReportsByStatus,
    reportsByReasonRaw,
    mostReportedPostsRaw,
    recentPostReports,
    recentCommentReports,

    kakaoRecentFailed,
  ] = await Promise.all([
    // ── KPI ────────────────────────────────────────────────────────────────────
    prisma.post.count({ where: { createdAt: rangeWhere(start, end) } }),
    prisma.comment.count({ where: { createdAt: rangeWhere(start, end) } }),
    prisma.user.count({ where: { createdAt: rangeWhere(start, end) } }),
    prisma.postReport.count({ where: { createdAt: rangeWhere(start, end) } }),
    prisma.commentReport.count({ where: { createdAt: rangeWhere(start, end) } }),
    prisma.postReport.count({ where: { reviewStatus: 'PENDING' } }),
    prisma.commentReport.count({ where: { reviewStatus: 'PENDING' } }),
    prisma.kakaoMessageDelivery.count({ where: { status: 'PENDING' } }),
    prisma.kakaoMessageDelivery.count({
      where: { status: 'PENDING', createdAt: { lt: fiveMinutesAgo } },
    }),
    prisma.kakaoMessageDelivery.count({
      where: { status: 'FAILED', createdAt: rangeWhere(todayStart, todayEnd) },
    }),
    prisma.kakaoMessageDelivery.count({
      where: { status: 'SUCCESS', createdAt: rangeWhere(todayStart, todayEnd) },
    }),

    // ── Content overview ───────────────────────────────────────────────────────
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 7,
      select: POST_SELECT,
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { viewCount: 'desc' },
      take: 7,
      select: POST_SELECT,
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { postLikes: { _count: 'desc' } },
      take: 7,
      select: POST_SELECT,
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { comments: { _count: 'desc' } },
      take: 7,
      select: POST_SELECT,
    }),
    prisma.post.groupBy({
      by: ['cityId'],
      where: { status: 'PUBLISHED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.post.groupBy({
      by: ['categoryId'],
      where: { status: 'PUBLISHED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

    // ── Comment overview ───────────────────────────────────────────────────────
    prisma.comment.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 7,
      select: {
        id: true,
        body: true,
        createdAt: true,
        postId: true,
        author: { select: { displayName: true } },
      },
    }),
    // Most active commenters in the selected range – groupBy authorId
    prisma.comment.groupBy({
      by: ['authorId'],
      where: { createdAt: rangeWhere(weekStart, weekEnd), status: 'PUBLISHED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 7,
    }),
    // Posts with most comments in the selected range
    prisma.comment.groupBy({
      by: ['postId'],
      where: { createdAt: rangeWhere(weekStart, weekEnd), status: 'PUBLISHED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 7,
    }),

    // ── Reports ────────────────────────────────────────────────────────────────
    prisma.postReport.groupBy({
      by: ['reviewStatus'],
      _count: { id: true },
    }),
    prisma.commentReport.groupBy({
      by: ['reviewStatus'],
      _count: { id: true },
    }),
    // Reports by reason (option label) – use option groupBy via raw post reports
    prisma.postReport.groupBy({
      by: ['optionId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    // Most reported posts
    prisma.postReport.groupBy({
      by: ['postId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 7,
    }),
    // Recent post reports
    prisma.postReport.findMany({
      where: { reviewStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        reviewStatus: true,
        option: { select: { label: true } },
        reporter: { select: { displayName: true } },
        post: {
          select: {
            id: true,
            title: true,
            body: true,
          },
        },
      },
    }),
    prisma.commentReport.findMany({
      where: { reviewStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        reviewStatus: true,
        option: { select: { label: true } },
        reporter: { select: { displayName: true } },
        comment: {
          select: {
            id: true,
            body: true,
            postId: true,
          },
        },
      },
    }),

    // ── Kakao ──────────────────────────────────────────────────────────────────
    prisma.kakaoMessageDelivery.findMany({
      where: { status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: 7,
      select: {
        id: true,
        deliveryType: true,
        status: true,
        attemptCount: true,
        errorMessage: true,
        createdAt: true,
        recipientUser: { select: { displayName: true } },
      },
    }),
  ]);

  // ── Post-process groupBy results ─────────────────────────────────────────────

  // Posts by city – look up city names
  const cityIds = postsByCityRaw.flatMap((r) => (r.cityId ? [r.cityId] : []));
  const citiesData =
    cityIds.length > 0
      ? await prisma.city.findMany({
          where: { id: { in: cityIds } },
          select: { id: true, name: true },
        })
      : [];
  const cityNameById = new Map(citiesData.map((c) => [c.id, c.name]));
  const postsByCity = postsByCityRaw.map((r) => ({
    cityName: r.cityId ? (cityNameById.get(r.cityId) ?? '알 수 없음') : '전 지역',
    count: r._count.id,
  }));

  // Posts by category – look up category names
  const categoryIds = postsByCategoryRaw.map((r) => r.categoryId);
  const categoriesData =
    categoryIds.length > 0
      ? await prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
  const categoryNameById = new Map(categoriesData.map((c) => [c.id, c.name]));
  const postsByCategory = postsByCategoryRaw.map((r) => ({
    categoryName: categoryNameById.get(r.categoryId) ?? '알 수 없음',
    count: r._count.id,
  }));

  // Most active commenters – look up user display names
  const authorIds = commentsByAuthorInRange.map((r) => r.authorId);
  const authorsData =
    authorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, displayName: true },
        })
      : [];
  const authorNameById = new Map(authorsData.map((u) => [u.id, u.displayName]));
  const mostActiveCommenters = commentsByAuthorInRange.map((r) => ({
    displayName: authorNameById.get(r.authorId) ?? '알 수 없음',
    commentCount: r._count.id,
  }));

  // Posts with most comments in range – look up post titles
  const topCommentedPostIds = postCommentCountsInRange.map((r) => r.postId);
  const topCommentedPostsData =
    topCommentedPostIds.length > 0
      ? await prisma.post.findMany({
          where: { id: { in: topCommentedPostIds } },
          select: { id: true, title: true, body: true },
        })
      : [];
  const topCommentedPostById = new Map(topCommentedPostsData.map((p) => [p.id, p]));
  const postsWithMostComments = postCommentCountsInRange.map((r) => {
    const post = topCommentedPostById.get(r.postId);
    return {
      postId: r.postId,
      title: post?.title ?? post?.body.slice(0, 50) ?? r.postId,
      commentCount: r._count.id,
    };
  });

  // Reports by status – combine post and comment report counts
  const statusCountMap = new Map<string, number>();
  for (const r of postReportsByStatus) {
    statusCountMap.set(r.reviewStatus, (statusCountMap.get(r.reviewStatus) ?? 0) + r._count.id);
  }
  for (const r of commentReportsByStatus) {
    statusCountMap.set(r.reviewStatus, (statusCountMap.get(r.reviewStatus) ?? 0) + r._count.id);
  }
  const STATUS_LABELS: Record<string, string> = {
    PENDING: '미확정',
    VALID: '적절한 신고',
    FALSE_REPORT: '허위 신고',
  };
  const byStatus = [...statusCountMap.entries()].map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count,
  }));

  // Reports by reason – look up option labels
  const optionIds = reportsByReasonRaw.map((r) => r.optionId);
  const optionsData =
    optionIds.length > 0
      ? await prisma.reportOption.findMany({
          where: { id: { in: optionIds } },
          select: { id: true, label: true },
        })
      : [];
  const optionLabelById = new Map(optionsData.map((o) => [o.id, o.label]));
  const byReason = reportsByReasonRaw.map((r) => ({
    reason: optionLabelById.get(r.optionId) ?? '알 수 없음',
    count: r._count.id,
  }));

  // Most reported posts – look up post data
  const mostReportedPostIds = mostReportedPostsRaw.map((r) => r.postId);
  const mostReportedPosts =
    mostReportedPostIds.length > 0
      ? await prisma.post.findMany({
          where: { id: { in: mostReportedPostIds } },
          select: POST_SELECT,
        })
      : [];
  // Re-sort by report count
  const reportCountByPostId = new Map(mostReportedPostsRaw.map((r) => [r.postId, r._count.id]));
  mostReportedPosts.sort(
    (a, b) => (reportCountByPostId.get(b.id) ?? 0) - (reportCountByPostId.get(a.id) ?? 0),
  );

  // Recent reports – combine and sort post/comment reports
  const combinedReports: ReportSummary[] = [
    ...recentPostReports.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      reviewStatus: r.reviewStatus,
      option: r.option,
      reporter: r.reporter,
      targetLabel: r.post.title ?? r.post.body.slice(0, 60),
      targetPostId: r.post.id,
    })),
    ...recentCommentReports.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      reviewStatus: r.reviewStatus,
      option: r.option,
      reporter: r.reporter,
      targetLabel: r.comment.body.slice(0, 60),
      targetPostId: r.comment.postId,
    })),
  ];
  combinedReports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    rangeLabel: label,
    rangeStart: start,
    rangeEnd: end,

    kpi: {
      postsCreated,
      commentsCreated,
      newUsers,
      reportsCreated: postReportsInRange + commentReportsInRange,
      pendingReports: pendingPostReports + pendingCommentReports,
      kakaoPending,
      kakaoFailedInRange,
      kakaoSuccessInRange,
      kakaoLongPending,
    },

    content: {
      recentPosts,
      mostViewedPosts,
      mostLikedPosts,
      mostCommentedPosts,
      postsByCity,
      postsByCategory,
    },

    comments: {
      recentComments,
      mostActiveCommenters,
      postsWithMostComments,
    },

    reports: {
      byStatus,
      byReason,
      mostReportedPosts,
      recentReports: combinedReports.slice(0, 10),
    },

    kakao: {
      recentFailed: kakaoRecentFailed,
    },
  };
}
