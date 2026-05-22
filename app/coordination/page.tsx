import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';

import {
  coordinatorSectionNavItems,
  ManagementSectionHeader,
} from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessCoordinatorSection } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '코디네이션 — 대시보드',
};

type DailyCountRow = {
  day: Date;
  count: bigint | number;
};

function toCountValue(value: bigint | number) {
  return typeof value === 'bigint' ? Number(value) : value;
}

export default async function CoordinationPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canAccessCoordinatorSection(currentUser)) {
    redirect('/posts');
  }

  const cityId = currentUser.cityId ?? null;

  if (!cityId) {
    return (
      <section className="space-y-6">
        <ManagementSectionHeader
          sectionLabel="코디네이션"
          pageLabel="대시보드"
          items={coordinatorSectionNavItems}
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          도시가 설정되어 있지 않아 대시보드를 조회할 수 없습니다. 프로필에서 기본 도시를 먼저 설정해 주세요.
        </div>
      </section>
    );
  }

  const nowDate = new Date();
  const now = nowDate.getTime();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [
    city,
    totalUsersInCity,
    newUsersInCity7d,
    totalPostsInCity,
    newPostsInCity7d,
    newCommentsInCity7d,
    noCommentPostsInCity,
    heldPostsInCity,
    postReports7d,
    commentReports7d,
    postsByCategory,
    postDailyRows,
    commentDailyRows,
  ] = await Promise.all([
    prisma.city.findUnique({
      where: { id: cityId },
      select: { id: true, name: true },
    }),
    prisma.user.count({
      where: { cityId },
    }),
    prisma.user.count({
      where: {
        cityId,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.post.count({
      where: { cityId },
    }),
    prisma.post.count({
      where: {
        cityId,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.comment.count({
      where: {
        status: 'PUBLISHED',
        createdAt: { gte: sevenDaysAgo },
        post: { cityId },
      },
    }),
    prisma.post.count({
      where: {
        cityId,
        status: 'PUBLISHED',
        comments: { none: { status: 'PUBLISHED' } },
      },
    }),
    prisma.post.count({
      where: {
        cityId,
        status: 'HELD',
      },
    }),
    prisma.postReport.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        post: { cityId },
      },
    }),
    prisma.commentReport.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        comment: {
          post: { cityId },
        },
      },
    }),
    prisma.post.groupBy({
      by: ['categoryId'],
      where: { cityId },
      _count: { _all: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 8,
    }),
    prisma.$queryRaw<DailyCountRow[]>(Prisma.sql`
      SELECT DATE("createdAt") AS day, COUNT(*) AS count
      FROM "Post"
      WHERE "cityId" = ${cityId}
        AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `),
    prisma.$queryRaw<DailyCountRow[]>(Prisma.sql`
      SELECT DATE(c."createdAt") AS day, COUNT(*) AS count
      FROM "Comment" c
      INNER JOIN "Post" p ON p."id" = c."postId"
      WHERE p."cityId" = ${cityId}
        AND c."status" = 'PUBLISHED'
        AND c."createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE(c."createdAt")
      ORDER BY DATE(c."createdAt") ASC
    `),
  ]);

  const categoryIds = postsByCategory.map((item) => item.categoryId);
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];

  const categoryNameMap = new Map(categories.map((item) => [item.id, item.name]));
  const categoryDistribution = postsByCategory.map((item) => ({
    categoryId: item.categoryId,
    categoryName: categoryNameMap.get(item.categoryId) ?? '알 수 없는 카테고리',
    count: item._count._all,
  }));

  const postDailyMap = new Map(
    postDailyRows.map((row) => [
      new Date(row.day).toISOString().slice(0, 10),
      toCountValue(row.count),
    ]),
  );
  const commentDailyMap = new Map(
    commentDailyRows.map((row) => [
      new Date(row.day).toISOString().slice(0, 10),
      toCountValue(row.count),
    ]),
  );

  const activityTrend = Array.from({ length: 7 }).map((_, index) => {
    const dayDate = new Date(now - (6 - index) * 24 * 60 * 60 * 1000);
    const dayKey = dayDate.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat('ko-KR', {
      month: 'numeric',
      day: 'numeric',
    }).format(dayDate);

    return {
      key: dayKey,
      label,
      postCount: postDailyMap.get(dayKey) ?? 0,
      commentCount: commentDailyMap.get(dayKey) ?? 0,
    };
  });

  const reportCount7d = postReports7d + commentReports7d;
  const cityName = city?.name ?? '내 도시';

  const kpiItems = [
    { label: '도시 등록 사용자', value: totalUsersInCity, description: '현재 내 도시를 기본 지역으로 둔 사용자' },
    { label: '최근 7일 신규 사용자', value: newUsersInCity7d, description: '최근 7일 내 도시로 가입/등록된 사용자' },
    { label: '도시 총 게시글', value: totalPostsInCity, description: '현재 도시에 등록된 전체 게시글' },
    { label: '최근 7일 신규 게시글', value: newPostsInCity7d, description: '최근 7일 생성된 도시 게시글' },
    { label: '최근 7일 신규 댓글', value: newCommentsInCity7d, description: '최근 7일 도시 게시글에 달린 댓글' },
    { label: '댓글 없는 게시글', value: noCommentPostsInCity, description: '답변/응대가 필요한 게시글 후보' },
    { label: '최근 7일 신고 접수', value: reportCount7d, description: '게시글 + 댓글 신고 합계' },
    { label: '보류 게시글', value: heldPostsInCity, description: '현재 HELD 상태 게시글 수' },
  ];

  return (
    <section className="space-y-6">
      <ManagementSectionHeader
        sectionLabel="코디네이션"
        pageLabel="대시보드"
        items={coordinatorSectionNavItems}
      />

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">{cityName} 운영 현황</h2>
        <p className="mt-1 text-sm text-[#888]">내 도시 기준 핵심 운영 지표를 한눈에 확인할 수 있어요.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {kpiItems.map((item) => (
          <div key={item.label} className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-[#666]">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#222]">{item.value.toLocaleString('ko-KR')}</p>
            <p className="mt-1 text-xs text-[#999]">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <h3 className="font-semibold">카테고리별 게시글 분포</h3>
          {categoryDistribution.length === 0 ? (
            <p className="mt-3 text-sm text-[#888]">표시할 카테고리 데이터가 없습니다.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {categoryDistribution.map((item) => (
                <li key={item.categoryId} className="flex items-center justify-between rounded-lg bg-[#fafafa] px-3 py-2">
                  <span className="text-[#444]">{item.categoryName}</span>
                  <span className="font-semibold text-[#222]">{item.count.toLocaleString('ko-KR')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <h3 className="font-semibold">최근 7일 활동 추이</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {activityTrend.map((item) => (
              <li key={item.key} className="rounded-lg bg-[#fafafa] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#444]">{item.label}</span>
                  <span className="text-xs text-[#888]">게시글 {item.postCount} · 댓글 {item.commentCount}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
