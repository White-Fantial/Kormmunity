import { redirect } from 'next/navigation';

import {

  holdPostAction,
  restorePostAction,
  requestUserReviewAction,
} from '@/app/coordinator/actions';
import {
  coordinatorManagementNavItems,
  ManagementSectionNav,
} from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canHoldPost } from '@/lib/permissions';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { truncatePostBody } from '@/lib/posts/constants';

export const runtime = "nodejs";
export const preferredRegion = "syd1";

export const dynamic = 'force-dynamic';

type CoordinatorPageProps = {
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function CoordinatorPage({ searchParams }: CoordinatorPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canHoldPost(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const statusFilter = params.status ?? 'HELD';

  const posts = await prisma.post.findMany({
    where: {
      status: statusFilter as 'PUBLISHED' | 'HELD' | 'DELETED',
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      communityScore: true,
      heldReason: true,
      heldAt: true,
      createdAt: true,
      author: { select: { id: true, displayName: true } },
      category: { select: { name: true } },
      city: { select: { name: true } },
      _count: { select: { reports: true } },
    },
  });

  const recentUsers = await prisma.user.findMany({
    where: { role: { in: ['USER', 'COORDINATOR'] } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      displayName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  const statusOptions = [
    { value: 'PUBLISHED', label: '게시됨' },
    { value: 'HELD', label: '보류' },
    { value: 'DELETED', label: '삭제됨' },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">운영 관리 대시보드</h1>
        <ManagementSectionNav items={coordinatorManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">게시글 관리</h2>

        <form className="mb-4 flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="submit"
              name="status"
              value={opt.value}
              className={`rounded-full px-3 py-1 text-sm border transition ${
                statusFilter === opt.value
                  ? 'bg-[#fee500] text-[#3c1e1e] border-[#fee500] font-semibold'
                  : 'border-[#e8e8e8] hover:border-[#fee500] hover:bg-[#fffde7]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </form>

        {posts.length === 0 ? (
          <p className="text-sm text-[#888]">해당 상태의 게시글이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id} className="rounded-xl border border-[#e8e8e8] p-3">
                <div className="mb-1 flex flex-wrap gap-2 text-xs text-[#888]">
                  <span className="rounded-full bg-[#fffde7] px-2 py-0.5 font-medium text-[#7a6000]">{post.category.name}</span>
                  <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5">{post.city?.name ?? '전 지역'}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      post.status === 'HELD'
                        ? 'bg-[#fffde7] text-[#7a6000]'
                        : post.status === 'DELETED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-800'
                    }`}
                  >
                    {post.status === 'HELD' ? '보류' : post.status === 'DELETED' ? '삭제됨' : '게시됨'}
                  </span>
                </div>

                <p className="text-sm font-medium">
                  {post.title ?? truncatePostBody(post.body)}
                </p>
                <p className="mt-1 text-xs text-[#888]">
                  <span>작성자: {post.author.displayName}</span>
                  {' · '}
                  <span>{new Date(post.createdAt).toLocaleString('ko-KR')}</span>
                  {' · '}
                  <span aria-label={`신고 ${post._count.reports}건`}>신고 {post._count.reports}건</span>
                </p>
                {post.heldReason ? (
                  <p className="mt-1 text-xs text-[#7a6000]">보류 사유: {post.heldReason}</p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2">
                  {post.status === 'PUBLISHED' ? (
                    <details className="w-full">
                      <summary className="inline-block cursor-pointer rounded-xl border border-yellow-300 bg-[#fffde7] px-3 py-1 text-sm font-medium text-[#7a6000]">
                        보류 처리
                      </summary>
                      <form action={holdPostAction} className="mt-2 space-y-2">
                        <input type="hidden" name="postId" value={post.id} />
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

                  {post.status === 'HELD' ? (
                    <form action={restorePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <FormSubmitButton
                        idleLabel="재게시"
                        pendingLabel="처리 중..."
                        className="rounded-xl border border-green-300 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-50"
                      />
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">사용자 검토 요청</h2>
        <p className="mb-3 text-sm text-[#888]">
          문제가 있는 사용자를 관리자 검토 대상으로 표시할 수 있습니다.
        </p>

        {recentUsers.length === 0 ? (
          <p className="text-sm text-[#888]">사용자가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e8e8e8] p-3">
                <span className="flex-1 text-sm">
                  {u.displayName}
                  <span className="ml-2 text-xs text-[#aaa]">
                    {u.role === 'COORDINATOR' ? '운영' : '일반'} ·{' '}
                    {u.status === 'ACTIVE'
                      ? '활성'
                      : u.status === 'LIMITED'
                        ? '제한'
                        : u.status === 'SUSPENDED'
                          ? '정지'
                          : '삭제'}
                  </span>
                </span>
                <details>
                  <summary className="cursor-pointer rounded-xl border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                    검토 요청
                  </summary>
                  <form action={requestUserReviewAction} className="mt-2 space-y-2">
                    <input type="hidden" name="targetUserId" value={u.id} />
                    <input
                      type="text"
                      name="reason"
                      required
                      placeholder="검토 사유 (필수)"
                      className="w-full rounded-lg border border-[#e8e8e8] px-3 py-1 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
                    />
                    <FormSubmitButton
                      idleLabel="검토 요청 제출"
                      pendingLabel="처리 중..."
                      className="rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700"
                    />
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
