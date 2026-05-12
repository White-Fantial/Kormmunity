import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canHoldPost, canMakeFinalUserDecision } from '@/lib/permissions';
import { truncatePostBody } from '@/lib/posts/constants';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const currentUser = await getCurrentUser();
  const canAccessAdminLinks = canMakeFinalUserDecision(currentUser);

  if (!currentUser || !canHoldPost(currentUser)) {
    redirect('/posts');
  }

  const reports = await prisma.postReport.findMany({
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
          author: { select: { displayName: true } },
          _count: { select: { reports: true } },
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">신고 내역</h1>
        <nav className="flex gap-3 text-sm">
          {canAccessAdminLinks ? (
            <>
              <Link
                href="/admin/report-options"
                className="font-medium text-[#3c1e1e] underline"
              >
                신고 옵션
              </Link>
              <Link href="/admin/post-permissions" className="font-medium text-[#3c1e1e] underline">
                게시글 권한
              </Link>
              <Link href="/admin/posts" className="font-medium text-[#3c1e1e] underline">
                게시글
              </Link>
              <Link href="/admin/users" className="font-medium text-[#3c1e1e] underline">
                사용자
              </Link>
            </>
          ) : (
            <Link href="/coordinator" className="font-medium text-[#3c1e1e] underline">
              운영 관리
            </Link>
          )}
        </nav>
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">신고 기록 ({reports.length}건)</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-[#888]">신고 기록이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => (
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
    </section>
  );
}
