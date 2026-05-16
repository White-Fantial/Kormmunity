import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  moderatorManagementNavItems,
  ManagementSectionHeader,
} from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canModerate } from '@/lib/permissions';
import { DateTimeText } from '@/components/ui/date-time-text';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const REASON_LABELS: Record<string, string> = {
  POST_LIKE_RECEIVED: '게시글 좋아요 받음',
  COMMENT_LIKE_RECEIVED: '댓글 좋아요 받음',
  BEST_COMMENT_SELECTED: '베스트 댓글 선정',
  VALID_POST_REPORT: '게시글 신고 확정',
  VALID_COMMENT_REPORT: '댓글 신고 확정',
  COORDINATOR_HOLDS: '운영진 보류',
  ADMIN_DELETES: '관리자 삭제',
  FALSE_REPORT: '허위 신고',
};

type WarmthLogsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function WarmthLogsPage({ searchParams }: WarmthLogsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canModerate(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const [logs, totalCount] = await Promise.all([
    prisma.neighbourWarmthLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reason: true,
        baseDelta: true,
        actualDelta: true,
        previousWarmth: true,
        newWarmth: true,
        createdAt: true,
        user: {
          select: { id: true, displayName: true },
        },
      },
    }),
    prisma.neighbourWarmthLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNextPage = page < totalPages;

  return (
    <section className="space-y-6">
      <ManagementSectionHeader
        sectionLabel="운영 관리"
        pageLabel="온기 변동 로그"
        items={moderatorManagementNavItems}
      />

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm text-[#888]">전체 {totalCount.toLocaleString()}건</p>

        {logs.length === 0 ? (
          <p className="text-sm text-[#888]">온기 변동 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-left text-[#888]">
                  <th className="py-2 pr-3">일시</th>
                  <th className="py-2 pr-3">사용자</th>
                  <th className="py-2 pr-3">사유</th>
                  <th className="py-2 pr-3 text-right">기준 변동</th>
                  <th className="py-2 pr-3 text-right">실제 변동</th>
                  <th className="py-2 pr-3 text-right">변동 전</th>
                  <th className="py-2 text-right">변동 후</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa]">
                    <td className="py-2 pr-3 text-xs text-[#888] whitespace-nowrap">
                      <DateTimeText value={log.createdAt} />
                    </td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/users/${log.user.id}`}
                        className="text-[#3c1e1e] hover:underline"
                      >
                        {log.user.displayName}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-sm">
                      {REASON_LABELS[log.reason] ?? log.reason}
                    </td>
                    <td className={`py-2 pr-3 text-right text-sm font-medium ${log.baseDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {log.baseDelta >= 0 ? '+' : ''}{log.baseDelta.toFixed(2)}
                    </td>
                    <td className={`py-2 pr-3 text-right text-sm font-medium ${log.actualDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {log.actualDelta >= 0 ? '+' : ''}{log.actualDelta.toFixed(2)}°
                    </td>
                    <td className="py-2 pr-3 text-right text-sm text-[#555]">
                      {log.previousWarmth.toFixed(1)}°
                    </td>
                    <td className="py-2 text-right text-sm text-[#555]">
                      {log.newWarmth.toFixed(1)}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex justify-between gap-2">
            {page > 1 ? (
              <Link
                href={`/moderator/warmth-logs?page=${page - 1}`}
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
                href={`/moderator/warmth-logs?page=${page + 1}`}
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
