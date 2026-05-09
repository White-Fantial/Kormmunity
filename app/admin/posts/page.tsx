import Link from 'next/link';
import { redirect } from 'next/navigation';

import { adminDeletePostAction, adminRestorePostAction } from '@/app/admin/actions';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminPostsPageProps = {
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function AdminPostsPage({ searchParams }: AdminPostsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
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
      deletedReason: true,
      heldAt: true,
      deletedAt: true,
      createdAt: true,
      author: { select: { id: true, displayName: true } },
      category: { select: { name: true } },
      city: { select: { name: true } },
    },
  });

  const moderationActions = await prisma.moderationAction.findMany({
    where: { targetType: 'POST' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      targetId: true,
      actionType: true,
      reason: true,
      createdAt: true,
      actor: { select: { displayName: true } },
    },
  });

  const statusOptions = [
    { value: 'PUBLISHED', label: '게시됨' },
    { value: 'HELD', label: '보류' },
    { value: 'DELETED', label: '삭제됨' },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">관리자 — 게시글 관리</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin/users" className="text-zinc-600 underline">사용자</Link>
          <Link href="/admin/categories" className="text-zinc-600 underline">카테고리</Link>
          <Link href="/admin/cities" className="text-zinc-600 underline">도시</Link>
        </nav>
      </div>

      {params.error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">게시글 목록</h2>

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
              <li key={post.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
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
                  {post.title ?? post.body.slice(0, 80)}
                </p>
                <p className="text-xs text-zinc-500">
                  작성자: {post.author.displayName} · {new Date(post.createdAt).toLocaleString('ko-KR')}
                </p>
                {post.heldReason ? (
                  <p className="text-xs text-yellow-700">보류 사유: {post.heldReason}</p>
                ) : null}
                {post.deletedReason ? (
                  <p className="text-xs text-red-700">삭제 사유: {post.deletedReason}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {post.status !== 'DELETED' ? (
                    <details>
                      <summary className="cursor-pointer rounded-md border px-2 py-1 text-xs text-red-600">
                        삭제
                      </summary>
                      <form action={adminDeletePostAction} className="mt-2 space-y-2">
                        <input type="hidden" name="postId" value={post.id} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="삭제 사유 (선택)"
                          className="w-full rounded-md border px-2 py-1 text-sm"
                        />
                        <button type="submit" className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">
                          삭제 확정
                        </button>
                      </form>
                    </details>
                  ) : null}

                  {post.status === 'HELD' ? (
                    <form action={adminRestorePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button type="submit" className="rounded-md border border-green-600 px-2 py-1 text-xs text-green-700">
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
        <h2 className="mb-3 font-semibold">최근 게시글 모더레이션 로그</h2>
        {moderationActions.length === 0 ? (
          <p className="text-sm text-zinc-500">로그가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {moderationActions.map((action) => (
              <li key={action.id} className="rounded-md border p-2 text-xs">
                <span className="font-medium">{action.actor.displayName}</span>
                {' → '}
                <span className="text-zinc-600">{action.actionType}</span>
                {' · '}
                <span className="text-zinc-400 font-mono">{action.targetId.slice(0, 8)}…</span>
                {action.reason ? <span className="ml-2 text-zinc-500">({action.reason})</span> : null}
                <span className="ml-2 text-zinc-400">
                  {new Date(action.createdAt).toLocaleString('ko-KR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
