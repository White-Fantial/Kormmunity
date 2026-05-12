import Link from 'next/link';
import { redirect } from 'next/navigation';

import { adminDeletePostAction, adminRestorePostAction } from '@/app/admin/actions';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { truncatePostBody } from '@/lib/posts/constants';

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
      postTagOption: { select: { label: true, isActive: true } },
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
        <h1 className="text-xl font-bold">관리자 — 게시글 관리</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin/users" className="font-medium text-[#3c1e1e] underline">사용자</Link>
          <Link href="/admin/post-permissions" className="font-medium text-[#3c1e1e] underline">게시글 권한</Link>
          <Link href="/admin/reports" className="font-medium text-[#3c1e1e] underline">신고내역</Link>
          <Link href="/admin/report-options" className="font-medium text-[#3c1e1e] underline">신고옵션</Link>
          <Link href="/admin/categories" className="font-medium text-[#3c1e1e] underline">카테고리</Link>
          <Link href="/admin/cities" className="font-medium text-[#3c1e1e] underline">도시</Link>
          <Link href="/admin/countries" className="font-medium text-[#3c1e1e] underline">국가</Link>
        </nav>
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">게시글 목록</h2>

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
              <li key={post.id} className="space-y-2 rounded-xl border border-[#e8e8e8] p-3">
                <div className="flex flex-wrap gap-2 text-xs text-[#888]">
                  <span className="rounded-full bg-[#fffde7] px-2 py-0.5 font-medium text-[#7a6000]">{post.category.name}</span>
                  <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5">{post.city?.name ?? '전 지역'}</span>
                  {post.postTagOption ? (
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        post.postTagOption.isActive
                          ? 'bg-[#e8f0fe] text-[#1a56db]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {post.postTagOption.label}
                      {post.postTagOption.isActive ? '' : ' (비활성 태그)'}
                    </span>
                  ) : null}
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
                <p className="text-xs text-[#888]">
                  작성자: {post.author.displayName} · {new Date(post.createdAt).toLocaleString('ko-KR')}
                </p>
                {post.heldReason ? (
                  <p className="text-xs text-[#7a6000]">보류 사유: {post.heldReason}</p>
                ) : null}
                {post.deletedReason ? (
                  <p className="text-xs text-red-600">삭제 사유: {post.deletedReason}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {post.status !== 'DELETED' ? (
                    <details>
                      <summary className="cursor-pointer rounded-xl border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                        삭제
                      </summary>
                      <form action={adminDeletePostAction} className="mt-2 space-y-2">
                        <input type="hidden" name="postId" value={post.id} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="삭제 사유 (선택)"
                          className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
                        />
                        <FormSubmitButton
                          idleLabel="삭제 확정"
                          pendingLabel="삭제 중..."
                          className="rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700"
                        />
                      </form>
                    </details>
                  ) : null}

                  {post.status === 'HELD' ? (
                    <form action={adminRestorePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <FormSubmitButton
                        idleLabel="재게시"
                        pendingLabel="처리 중..."
                        className="rounded-xl border border-green-300 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
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
        <h2 className="mb-3 font-semibold">최근 게시글 모더레이션 로그</h2>
        {moderationActions.length === 0 ? (
          <p className="text-sm text-[#888]">로그가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {moderationActions.map((action) => (
              <li key={action.id} className="rounded-lg border border-[#e8e8e8] p-2 text-xs">
                <span className="font-medium">{action.actor.displayName}</span>
                {' → '}
                <span className="text-[#555]">{action.actionType}</span>
                {' · '}
                <span className="font-mono text-[#aaa]">{action.targetId.slice(0, 8)}…</span>
                {action.reason ? <span className="ml-2 text-[#888]">({action.reason})</span> : null}
                <span className="ml-2 text-[#aaa]">
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
