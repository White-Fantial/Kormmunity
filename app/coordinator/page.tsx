import { redirect } from 'next/navigation';

import {
  holdPostAction,
  restorePostAction,
  requestUserReviewAction,
} from '@/app/coordinator/actions';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canHoldPost } from '@/lib/permissions';

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
      heldReason: true,
      heldAt: true,
      createdAt: true,
      author: { select: { id: true, displayName: true } },
      category: { select: { name: true } },
      city: { select: { name: true } },
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
      <h1 className="text-xl font-semibold">운영 관리 대시보드</h1>

      {params.error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">게시글 관리</h2>

        <form className="mb-4 flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="submit"
              name="status"
              value={opt.value}
              className={`rounded-full px-3 py-1 text-sm border ${
                statusFilter === opt.value
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'border-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </form>

        {posts.length === 0 ? (
          <p className="text-sm text-zinc-500">해당 상태의 게시글이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id} className="rounded-md border p-3">
                <div className="mb-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5">{post.category.name}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5">{post.city.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      post.status === 'HELD'
                        ? 'bg-yellow-100 text-yellow-800'
                        : post.status === 'DELETED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {post.status === 'HELD' ? '보류' : post.status === 'DELETED' ? '삭제됨' : '게시됨'}
                  </span>
                </div>

                <p className="text-sm font-medium">
                  {post.title ?? post.body.slice(0, 60)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  작성자: {post.author.displayName} · {new Date(post.createdAt).toLocaleString('ko-KR')}
                </p>
                {post.heldReason ? (
                  <p className="mt-1 text-xs text-yellow-700">보류 사유: {post.heldReason}</p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2">
                  {post.status === 'PUBLISHED' ? (
                    <details className="w-full">
                      <summary className="cursor-pointer rounded-md border px-3 py-1 text-sm text-yellow-700 inline-block">
                        보류 처리
                      </summary>
                      <form action={holdPostAction} className="mt-2 space-y-2">
                        <input type="hidden" name="postId" value={post.id} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="보류 사유 (선택)"
                          className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                        <button type="submit" className="rounded-md bg-yellow-600 px-3 py-1.5 text-sm text-white">
                          보류 확정
                        </button>
                      </form>
                    </details>
                  ) : null}

                  {post.status === 'HELD' ? (
                    <form action={restorePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button type="submit" className="rounded-md border border-green-600 px-3 py-1 text-sm text-green-700">
                        재게시
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">사용자 검토 요청</h2>
        <p className="mb-3 text-sm text-zinc-500">
          문제가 있는 사용자를 관리자 검토 대상으로 표시할 수 있습니다.
        </p>

        {recentUsers.length === 0 ? (
          <p className="text-sm text-zinc-500">사용자가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                <span className="flex-1 text-sm">
                  {u.displayName}
                  <span className="ml-2 text-xs text-zinc-400">
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
                  <summary className="cursor-pointer rounded-md border px-2 py-1 text-xs text-red-600">
                    검토 요청
                  </summary>
                  <form action={requestUserReviewAction} className="mt-2 space-y-2">
                    <input type="hidden" name="targetUserId" value={u.id} />
                    <input
                      type="text"
                      name="reason"
                      required
                      placeholder="검토 사유 (필수)"
                      className="w-full rounded-md border px-3 py-1 text-sm"
                    />
                    <button type="submit" className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">
                      검토 요청 제출
                    </button>
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
