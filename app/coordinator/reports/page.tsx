import Link from 'next/link';
import { redirect } from 'next/navigation';

import {

  coordinatorManagementNavItems,
  ManagementSectionNav,
} from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canHoldPost } from '@/lib/permissions';
import { truncatePostBody } from '@/lib/posts/constants';
import {
  holdCommentAction,
  restoreCommentAction,
} from '@/app/coordinator/actions';
import { FormSubmitButton } from '@/components/ui/form-submit-button';

export const runtime = "nodejs";
export const preferredRegion = "syd1";

export const dynamic = 'force-dynamic';

export default async function CoordinatorReportsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canHoldPost(currentUser)) {
    redirect('/posts');
  }

  const [postReports, commentReports] = await Promise.all([
    prisma.postReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        additionalReason: true,
        createdAt: true,
        option: {
          select: { label: true },
        },
        reporter: {
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
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        additionalReason: true,
        createdAt: true,
        option: {
          select: { label: true },
        },
        reporter: {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">운영 관리 — 신고 내역</h1>
        <ManagementSectionNav items={coordinatorManagementNavItems} />
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">게시글 신고 기록 ({postReports.length}건)</h2>
        {postReports.length === 0 ? (
          <p className="text-sm text-[#888]">신고 기록이 없습니다.</p>
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
                  {new Date(report.createdAt).toLocaleString('ko-KR')}
                </p>
                {report.additionalReason ? (
                  <p className="rounded-lg bg-[#fafafa] px-2 py-1 text-xs text-[#555]">
                    추가 사유: {report.additionalReason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">댓글 신고 기록 ({commentReports.length}건)</h2>
        {commentReports.length === 0 ? (
          <p className="text-sm text-[#888]">댓글 신고 기록이 없습니다.</p>
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
                  {truncatePostBody(report.comment.body)}
                  {' '}
                  <Link href={`/posts/${report.comment.postId}`} className="text-xs text-[#888] underline">
                    게시글 보기
                  </Link>
                </p>
                <p className="text-xs text-[#888]">
                  신고자: {report.reporter.displayName} · 작성자: {report.comment.author.displayName} ·{' '}
                  {new Date(report.createdAt).toLocaleString('ko-KR')}
                </p>
                {report.additionalReason ? (
                  <p className="rounded-lg bg-[#fafafa] px-2 py-1 text-xs text-[#555]">
                    추가 사유: {report.additionalReason}
                  </p>
                ) : null}
                {report.comment.status !== 'DELETED' ? (
                  <div className="flex flex-wrap gap-2 pt-1">
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
