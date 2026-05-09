import Link from 'next/link';
import { redirect } from 'next/navigation';

import { changeUserRoleAction, changeUserStatusAction } from '@/app/admin/actions';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminUsersPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      displayName: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: { posts: true, comments: true },
      },
    },
  });

  const roleLabels: Record<string, string> = {
    USER: '일반',
    COORDINATOR: '운영',
    ADMIN: '관리자',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: '활성',
    LIMITED: '제한',
    SUSPENDED: '정지',
    DELETED: '삭제',
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">관리자 — 사용자 관리</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin/posts" className="text-zinc-600 underline">게시글</Link>
          <Link href="/admin/categories" className="text-zinc-600 underline">카테고리</Link>
          <Link href="/admin/cities" className="text-zinc-600 underline">도시</Link>
        </nav>
      </div>

      {params.error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">사용자 목록 ({users.length}명)</h2>

        {users.length === 0 ? (
          <p className="text-sm text-zinc-500">사용자가 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {users.map((u) => (
              <li key={u.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{u.displayName}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : u.role === 'COORDINATOR'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {roleLabels[u.role]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : u.status === 'LIMITED'
                          ? 'bg-yellow-100 text-yellow-700'
                          : u.status === 'SUSPENDED'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {statusLabels[u.status]}
                  </span>
                  <span className="ml-auto text-xs text-zinc-400">
                    글 {u._count.posts} · 댓글 {u._count.comments}
                  </span>
                </div>

                {u.id !== currentUser.id ? (
                  <div className="flex flex-wrap gap-2">
                    <details>
                      <summary className="cursor-pointer rounded-md border px-2 py-1 text-xs">
                        역할 변경
                      </summary>
                      <form action={changeUserRoleAction} className="mt-2 space-y-2">
                        <input type="hidden" name="targetUserId" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="w-full rounded-md border px-2 py-1 text-sm"
                        >
                          <option value="USER">일반 (USER)</option>
                          <option value="COORDINATOR">운영 (COORDINATOR)</option>
                          <option value="ADMIN">관리자 (ADMIN)</option>
                        </select>
                        <input
                          type="text"
                          name="reason"
                          placeholder="사유 (선택)"
                          className="w-full rounded-md border px-2 py-1 text-sm"
                        />
                        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">
                          변경
                        </button>
                      </form>
                    </details>

                    <details>
                      <summary className="cursor-pointer rounded-md border px-2 py-1 text-xs">
                        상태 변경
                      </summary>
                      <form action={changeUserStatusAction} className="mt-2 space-y-2">
                        <input type="hidden" name="targetUserId" value={u.id} />
                        <select
                          name="status"
                          defaultValue={u.status}
                          className="w-full rounded-md border px-2 py-1 text-sm"
                        >
                          <option value="ACTIVE">활성 (ACTIVE)</option>
                          <option value="LIMITED">제한 (LIMITED)</option>
                          <option value="SUSPENDED">정지 (SUSPENDED)</option>
                          <option value="DELETED">삭제 (DELETED)</option>
                        </select>
                        <input
                          type="text"
                          name="reason"
                          placeholder="사유 (선택)"
                          className="w-full rounded-md border px-2 py-1 text-sm"
                        />
                        <button type="submit" className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">
                          변경
                        </button>
                      </form>
                    </details>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">본인 계정은 수정할 수 없습니다.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
