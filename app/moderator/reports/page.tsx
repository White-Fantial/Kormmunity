import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReportReviewStatus } from '@prisma/client';

import {
  moderatorManagementNavItems,
  ManagementSectionHeader,
} from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canModerate } from '@/lib/permissions';
import { DateTimeText } from '@/components/ui/date-time-text';
import { truncatePostBody } from '@/lib/posts/constants';
import {
  holdCommentAction,
  restoreCommentAction,
  reviewCommentReportAction,
  reviewPostReportAction,
} from '@/app/moderator/actions';
import { FormSubmitButton } from '@/components/ui/form-submit-button';

export const dynamic = 'force-dynamic';

type ReportFilter = 'pending' | 'resolved' | 'all';

type CoordinatorReportsPageProps = {
  searchParams: Promise<{ filter?: string; error?: string; success?: string }>;
};

const REPORT_FILTER_OPTIONS: Array<{ value: ReportFilter; label: string }> = [
  { value: 'pending', label: '미확정' },
  { value: 'resolved', label: '확정 완료' },
  { value: 'all', label: '전체' },
];

function normalizeReportFilter(value: string | undefined): ReportFilter {
  return value === 'resolved' || value === 'all' ? value : 'pending';
}

function getReviewStatusLabel(reviewStatus: ReportReviewStatus) {
  switch (reviewStatus) {
    case ReportReviewStatus.VALID:
      return '적절한 신고';
    case ReportReviewStatus.FALSE_REPORT:
      return '허위 신고';
    default:
      return '미확정';
  }
}

function getReviewStatusClassName(reviewStatus: ReportReviewStatus) {
  switch (reviewStatus) {
    case ReportReviewStatus.VALID:
      return 'bg-blue-50 text-blue-700';
    case ReportReviewStatus.FALSE_REPORT:
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-red-50 text-red-700';
  }
}

function getEmptyMessage(filter: ReportFilter, typeLabel: string) {
  switch (filter) {
    case 'resolved':
      return `확정된 ${typeLabel} 신고가 없습니다.`;
    case 'all':
      return `${typeLabel} 신고 기록이 없습니다.`;
    default:
      return `미확정 ${typeLabel} 신고가 없습니다.`;
  }
}

function buildReviewWhere(filter: ReportFilter) {
  if (filter === 'resolved') {
    return { NOT: { reviewStatus: ReportReviewStatus.PENDING } };
  }

  if (filter === 'all') {
    return {};
  }

  return { reviewStatus: ReportReviewStatus.PENDING };
}

function ReportDecisionActions({
  reportId,
  filter,
  reviewStatus,
  action,
}: {
  reportId: string;
  filter: ReportFilter;
  reviewStatus: ReportReviewStatus;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={action}>
        <input type="hidden" name="reportId" value={reportId} />
        <input type="hidden" name="filter" value={filter} />
        <input type="hidden" name="reviewStatus" value={ReportReviewStatus.VALID} />
        <FormSubmitButton
          idleLabel={reviewStatus === ReportReviewStatus.VALID ? '적절한 신고로 확정됨' : '적절한 신고 확정'}
          pendingLabel="처리 중..."
          className={`rounded-xl border px-2 py-1 text-xs font-medium ${
            reviewStatus === ReportReviewStatus.VALID
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-[#e8e8e8] text-[#555] hover:bg-blue-50'
          }`}
        />
      </form>
      <form action={action}>
        <input type="hidden" name="reportId" value={reportId} />
        <input type="hidden" name="filter" value={filter} />
        <input type="hidden" name="reviewStatus" value={ReportReviewStatus.FALSE_REPORT} />
        <FormSubmitButton
          idleLabel={reviewStatus === ReportReviewStatus.FALSE_REPORT ? '허위 신고로 확정됨' : '허위 신고 확정'}
          pendingLabel="처리 중..."
          className={`rounded-xl border px-2 py-1 text-xs font-medium ${
            reviewStatus === ReportReviewStatus.FALSE_REPORT
              ? 'border-slate-300 bg-slate-100 text-slate-700'
              : 'border-[#e8e8e8] text-[#555] hover:bg-slate-100'
          }`}
        />
      </form>
    </div>
  );
}

export default async function CoordinatorReportsPage({
  searchParams,
}: CoordinatorReportsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canModerate(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const filter = normalizeReportFilter(params.filter);
  const reviewWhere = buildReviewWhere(filter);

  const [postReports, commentReports] = await Promise.all([
    prisma.postReport.findMany({
      where: reviewWhere,
      orderBy: [{ reviewStatus: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        additionalReason: true,
        createdAt: true,
        reviewStatus: true,
        reviewedAt: true,
        option: {
          select: { label: true },
        },
        reporter: {
          select: { displayName: true },
        },
        reviewedBy: {
          select: { displayName: true },
        },
        post: {
          select: {
            id: true,
            title: true,
            body: true,
            status: true,
            communityScore: true,
            author: { select: { displayName: true } },
            _count: { select: { reports: true } },
          },
        },
      },
    }),
    prisma.commentReport.findMany({
      where: reviewWhere,
      orderBy: [{ reviewStatus: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        additionalReason: true,
        createdAt: true,
        reviewStatus: true,
        reviewedAt: true,
        option: {
          select: { label: true },
        },
        reporter: {
          select: { displayName: true },
        },
        reviewedBy: {
          select: { displayName: true },
        },
        comment: {
          select: {
            id: true,
            body: true,
            status: true,
            communityScore: true,
            postId: true,
            author: { select: { displayName: true } },
            _count: { select: { reports: true } },
          },
        },
      },
    }),
  ]);

  return (
    <section className="space-y-6">
      <ManagementSectionHeader
        sectionLabel="운영 관리"
        pageLabel="신고 내역"
        items={moderatorManagementNavItems}
      />

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}
      {params.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{params.success}</p>
      ) : null}

      <form className="flex flex-wrap gap-2">
        {REPORT_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="submit"
            name="filter"
            value={option.value}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              filter === option.value
                ? 'border-[#fee500] bg-[#fee500] font-semibold text-[#3c1e1e]'
                : 'border-[#e8e8e8] hover:border-[#fee500] hover:bg-[#fffde7]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </form>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">게시글 신고 기록 ({postReports.length}건)</h2>
        {postReports.length === 0 ? (
          <p className="text-sm text-[#888]">{getEmptyMessage(filter, '게시글')}</p>
        ) : (
          <ul className="space-y-3">
            {postReports.map((report) => (
              <li key={report.id} className="space-y-2 rounded-xl border border-[#e8e8e8] p-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                    신고 {report.post._count.reports}건
                  </span>
                  <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[#555]">
                    {report.option.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 ${getReviewStatusClassName(report.reviewStatus)}`}>
                    {getReviewStatusLabel(report.reviewStatus)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      report.post.status === 'DELETED'
                        ? 'bg-red-50 text-red-700'
                        : report.post.status === 'HELD'
                          ? 'bg-[#fffde7] text-[#7a6000]'
                          : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {report.post.status === 'DELETED'
                      ? '삭제됨'
                      : report.post.status === 'HELD'
                        ? '보류'
                        : '게시됨'}
                  </span>
                  <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[#555]">
                    점수 {report.post.communityScore.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm font-medium">
                  <Link href={`/posts/${report.post.id}`} className="underline">
                    {report.post.title ?? truncatePostBody(report.post.body)}
                  </Link>
                </p>
                <p className="text-xs text-[#888]">
                  신고자: {report.reporter.displayName} · 작성자: {report.post.author.displayName} ·{' '}
                  <DateTimeText value={report.createdAt} />
                </p>
                {report.reviewStatus !== ReportReviewStatus.PENDING && report.reviewedAt ? (
                  <p className="text-xs text-[#666]">
                    확정: {getReviewStatusLabel(report.reviewStatus)}
                    {report.reviewedBy ? ` · ${report.reviewedBy.displayName}` : ''}
                    {' · '}
                    <DateTimeText value={report.reviewedAt} />
                  </p>
                ) : null}
                {report.additionalReason ? (
                  <p className="rounded-lg bg-[#fafafa] px-2 py-1 text-xs text-[#555]">
                    추가 사유: {report.additionalReason}
                  </p>
                ) : null}
                <ReportDecisionActions
                  reportId={report.id}
                  filter={filter}
                  reviewStatus={report.reviewStatus}
                  action={reviewPostReportAction}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">댓글 신고 기록 ({commentReports.length}건)</h2>
        {commentReports.length === 0 ? (
          <p className="text-sm text-[#888]">{getEmptyMessage(filter, '댓글')}</p>
        ) : (
          <ul className="space-y-3">
            {commentReports.map((report) => (
              <li key={report.id} className="space-y-2 rounded-xl border border-[#e8e8e8] p-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                    신고 {report.comment._count.reports}건
                  </span>
                  <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[#555]">
                    {report.option.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 ${getReviewStatusClassName(report.reviewStatus)}`}>
                    {getReviewStatusLabel(report.reviewStatus)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      report.comment.status === 'DELETED'
                        ? 'bg-red-50 text-red-700'
                        : report.comment.status === 'HELD'
                          ? 'bg-[#fffde7] text-[#7a6000]'
                          : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {report.comment.status === 'DELETED'
                      ? '삭제됨'
                      : report.comment.status === 'HELD'
                        ? '보류'
                        : '게시됨'}
                  </span>
                  <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[#555]">
                    점수 {report.comment.communityScore.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-[#333]">
                  {truncatePostBody(report.comment.body)}{' '}
                  <Link href={`/posts/${report.comment.postId}`} className="text-xs text-[#888] underline">
                    게시글 보기
                  </Link>
                </p>
                <p className="text-xs text-[#888]">
                  신고자: {report.reporter.displayName} · 작성자: {report.comment.author.displayName} ·{' '}
                  <DateTimeText value={report.createdAt} />
                </p>
                {report.reviewStatus !== ReportReviewStatus.PENDING && report.reviewedAt ? (
                  <p className="text-xs text-[#666]">
                    확정: {getReviewStatusLabel(report.reviewStatus)}
                    {report.reviewedBy ? ` · ${report.reviewedBy.displayName}` : ''}
                    {' · '}
                    <DateTimeText value={report.reviewedAt} />
                  </p>
                ) : null}
                {report.additionalReason ? (
                  <p className="rounded-lg bg-[#fafafa] px-2 py-1 text-xs text-[#555]">
                    추가 사유: {report.additionalReason}
                  </p>
                ) : null}
                <div className="space-y-2 pt-1">
                  <ReportDecisionActions
                    reportId={report.id}
                    filter={filter}
                    reviewStatus={report.reviewStatus}
                    action={reviewCommentReportAction}
                  />
                  {report.comment.status !== 'DELETED' ? (
                    <div className="flex flex-wrap gap-2">
                      {report.comment.status === 'PUBLISHED' ? (
                        <details>
                          <summary className="cursor-pointer rounded-xl border border-yellow-300 bg-[#fffde7] px-2 py-1 text-xs font-medium text-[#7a6000]">
                            보류 처리
                          </summary>
                          <form action={holdCommentAction} className="mt-2 space-y-2">
                            <input type="hidden" name="postId" value={report.comment.postId} />
                            <input type="hidden" name="commentId" value={report.comment.id} />
                            <input
                              type="text"
                              name="reason"
                              placeholder="보류 사유 (선택)"
                              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
                            />
                            <FormSubmitButton
                              idleLabel="보류 확정"
                              pendingLabel="처리 중..."
                              className="rounded-xl bg-[#fee500] px-3 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                            />
                          </form>
                        </details>
                      ) : null}
                      {report.comment.status === 'HELD' ? (
                        <form action={restoreCommentAction}>
                          <input type="hidden" name="postId" value={report.comment.postId} />
                          <input type="hidden" name="commentId" value={report.comment.id} />
                          <FormSubmitButton
                            idleLabel="재게시"
                            pendingLabel="처리 중..."
                            className="rounded-xl border border-green-300 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                          />
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
