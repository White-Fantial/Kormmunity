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
import { truncatePostBody } from '@/lib/posts/constants';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const REASON_LABELS: Record<string, string> = {
  POST_LIKE_RECEIVED: '게시글 좋아요 받음',
  COMMENT_LIKE_RECEIVED: '댓글 좋아요 받음',
  BEST_COMMENT_SELECTED: '베스트 댓글 선정',
  COORDINATOR_RESTORES: '운영진 복구',
  ADMIN_RESTORES: '관리자 복구',
  POST_REPORT_SUBMITTED: '게시글 신고 접수',
  COMMENT_REPORT_SUBMITTED: '댓글 신고 접수',
  COORDINATOR_HOLDS: '운영진 보류',
  ADMIN_DELETES: '관리자 삭제',
};

type ScoreLogsPageProps = {
  searchParams: Promise<{ page?: string; type?: string }>;
};

export default async function ScoreLogsPage({ searchParams }: ScoreLogsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canModerate(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const typeFilter = params.type === 'COMMENT' ? 'COMMENT' : 'POST';

  const whereClause = { targetType: typeFilter };

  const [events, totalCount] = await Promise.all([
    prisma.communityScoreEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        baseDelta: true,
        weight: true,
        finalDelta: true,
        createdAt: true,
        post: {
          select: { id: true, title: true, body: true },
        },
        comment: {
          select: {
            id: true,
            body: true,
            postId: true,
          },
        },
      },
    }),
    prisma.communityScoreEvent.count({ where: whereClause }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNextPage = page < totalPages;

  const typeOptions = [
    { value: 'POST', label: '게시글' },
    { value: 'COMMENT', label: '댓글' },
  ];

  return (
    <section className="space-y-6">
      <ManagementSectionHeader
        sectionLabel="운영 관리"
        pageLabel="커뮤니티점수 로그"
        items={moderatorManagementNavItems}
      />

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {typeOptions.map((opt) => (
            <Link
              key={opt.value}
              href={`/moderator/score-logs?type=${opt.value}`}
              className={`rounded-full px-3 py-1 text-sm border transition ${
                typeFilter === opt.value
                  ? 'bg-[#fee500] text-[#3c1e1e] border-[#fee500] font-semibold'
                  : 'border-[#e8e8e8] hover:border-[#fee500] hover:bg-[#fffde7]'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        <p className="mb-3 text-sm text-[#888]">전체 {totalCount.toLocaleString()}건</p>

        {events.length === 0 ? (
          <p className="text-sm text-[#888]">커뮤니티점수 변동 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-left text-[#888]">
                  <th className="py-2 pr-3">일시</th>
                  <th className="py-2 pr-3">대상</th>
                  <th className="py-2 pr-3">사유</th>
                  <th className="py-2 pr-3 text-right">기준 변동</th>
                  <th className="py-2 pr-3 text-right">가중치</th>
                  <th className="py-2 text-right">최종 변동</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const targetHref =
                    event.targetType === 'POST'
                      ? `/posts/${event.targetId}`
                      : event.comment?.postId
                        ? `/posts/${event.comment.postId}`
                        : null;
                  const targetLabel =
                    event.targetType === 'POST'
                      ? (event.post?.title ?? truncatePostBody(event.post?.body ?? ''))
                      : truncatePostBody(event.comment?.body ?? '');

                  return (
                    <tr key={event.id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa]">
                      <td className="py-2 pr-3 text-xs text-[#888] whitespace-nowrap">
                        <DateTimeText value={event.createdAt} />
                      </td>
                      <td className="py-2 pr-3 max-w-[160px]">
                        {targetHref ? (
                          <Link href={targetHref} className="text-[#3c1e1e] hover:underline line-clamp-1">
                            {targetLabel || event.targetId.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-[#888] text-xs">{event.targetId.slice(0, 8)}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-sm">
                        {REASON_LABELS[event.reason] ?? event.reason}
                      </td>
                      <td className={`py-2 pr-3 text-right text-sm font-medium ${event.baseDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {event.baseDelta >= 0 ? '+' : ''}{event.baseDelta.toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right text-sm text-[#555]">
                        {event.weight.toFixed(2)}x
                      </td>
                      <td className={`py-2 text-right text-sm font-medium ${event.finalDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {event.finalDelta >= 0 ? '+' : ''}{event.finalDelta.toFixed(2)}
                      </td>
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
                href={`/moderator/score-logs?type=${typeFilter}&page=${page - 1}`}
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
                href={`/moderator/score-logs?type=${typeFilter}&page=${page + 1}`}
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
