import { redirect } from 'next/navigation';

import { changeUserRoleAction, changeUserStatusAction } from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import { FormSubmitButton } from '@/components/ui/form-submit-button';



export const dynamic = 'force-dynamic';
const MAX_REVIEW_REQUESTS_PER_USER = 5;
const MIN_REVIEW_REQUEST_LOOKUP = 20;
const MAX_REVIEW_REQUEST_LOOKUP = 200;
const MAX_RECENT_USER_MODERATION_ACTIONS = 30;

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
  const userIds = users.map((user) => user.id);
  const reviewRequestTake = Math.min(
    Math.max(userIds.length * MAX_REVIEW_REQUESTS_PER_USER, MIN_REVIEW_REQUEST_LOOKUP),
    MAX_REVIEW_REQUEST_LOOKUP,
  );

  const userReviewRequests = await prisma.moderationAction.findMany({
    where: {
      targetType: 'USER',
      actionType: 'REVIEW_REQUEST',
      ...(userIds.length > 0 ? { targetId: { in: userIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: reviewRequestTake,
    select: {
      id: true,
      targetId: true,
      reason: true,
      createdAt: true,
      actor: { select: { displayName: true } },
    },
  });

  const userModerationActions = await prisma.moderationAction.findMany({
    where: {
      targetType: 'USER',
      ...(userIds.length > 0 ? { targetId: { in: userIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_RECENT_USER_MODERATION_ACTIONS,
    select: {
      id: true,
      targetId: true,
      actionType: true,
      reason: true,
      createdAt: true,
      actor: { select: { displayName: true } },
    },
  });

  const roleLabels: Record<string, string> = {
    USER: '일반',
    MODERATOR: '모더레이터',
    COORDINATOR: '운영',
    ADMIN: '관리자',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: '활성',
    LIMITED: '제한',
    SUSPENDED: '정지',
    DELETED: '삭제',
  };

  const formatUserActionType = (actionType: string) => {
    if (actionType === 'REVIEW_REQUEST') {
      return '검토 요청';
    }

    if (actionType.startsWith('ROLE_CHANGE_TO_')) {
      const role = actionType.replace('ROLE_CHANGE_TO_', '');
      return `역할 변경 → ${roleLabels[role] ?? role}`;
    }

    if (actionType.startsWith('STATUS_CHANGE_TO_')) {
      const status = actionType.replace('STATUS_CHANGE_TO_', '');
      return `상태 변경 → ${statusLabels[status] ?? status}`;
    }

    return actionType;
  };

  const userReviewRequestsByTargetId = userReviewRequests.reduce<
    Record<string, Array<(typeof userReviewRequests)[number]>>
  >((acc, request) => {
    if (!acc[request.targetId]) {
      acc[request.targetId] = [];
    }
    acc[request.targetId].push(request);
    return acc;
  }, {});

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 사용자 관리</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">사용자 목록 ({users.length}명)</h2>

        {users.length === 0 ? (
          <p className="text-sm text-[#888]">사용자가 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {users.map((u) => {
              const reviewRequests =
                userReviewRequestsByTargetId[u.id]?.slice(0, MAX_REVIEW_REQUESTS_PER_USER) ?? [];

              return (
                <li key={u.id} className="space-y-2 rounded-xl border border-[#e8e8e8] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{u.displayName}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : u.role === 'MODERATOR'
                          ? 'bg-emerald-50 text-emerald-700'
                        : u.role === 'COORDINATOR'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-[#f5f5f5] text-[#555]'
                    }`}
                  >
                    {roleLabels[u.role]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.status === 'ACTIVE'
                        ? 'bg-green-50 text-green-700'
                        : u.status === 'LIMITED'
                          ? 'bg-[#fffde7] text-[#7a6000]'
                          : u.status === 'SUSPENDED'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {statusLabels[u.status]}
                  </span>
                  <span className="ml-auto text-xs text-[#aaa]">
                    글 {u._count.posts} · 댓글 {u._count.comments}
                  </span>
                </div>

                {u.id !== currentUser.id ? (
                  <div className="flex flex-wrap gap-2">
                    <details>
                      <summary className="cursor-pointer rounded-xl border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]">
                        역할 변경
                      </summary>
                      <form action={changeUserRoleAction} className="mt-2 space-y-2">
                        <input type="hidden" name="targetUserId" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
                        >
                          <option value="USER">일반 (USER)</option>
                          <option value="MODERATOR">모더레이터 (MODERATOR)</option>
                          <option value="COORDINATOR">운영 (COORDINATOR)</option>
                          <option value="ADMIN">관리자 (ADMIN)</option>
                        </select>
                        <input
                          type="text"
                          name="reason"
                          placeholder="사유 (선택)"
                          className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
                        />
                        <FormSubmitButton
                          idleLabel="변경"
                          pendingLabel="처리 중..."
                          className="rounded-xl bg-[#fee500] px-3 py-1.5 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                        />
                      </form>
                    </details>

                    <details>
                      <summary className="cursor-pointer rounded-xl border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]">
                        상태 변경
                      </summary>
                      <form action={changeUserStatusAction} className="mt-2 space-y-2">
                        <input type="hidden" name="targetUserId" value={u.id} />
                        <select
                          name="status"
                          defaultValue={u.status}
                          className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
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
                          className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
                        />
                        <FormSubmitButton
                          idleLabel="변경"
                          pendingLabel="처리 중..."
                          className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700"
                        />
                      </form>
                    </details>
                  </div>
                ) : (
                  <p className="text-xs text-[#aaa]">본인 계정은 수정할 수 없습니다.</p>
                )}

                {reviewRequests.length > 0 ? (
                  <div className="rounded-lg border border-[#f3e8e8] bg-[#fffafa] p-2">
                    <p className="mb-2 text-xs font-semibold text-[#7a2e2e]">
                      검토 요청 내역 ({reviewRequests.length}건)
                    </p>
                    <ul className="space-y-1">
                      {reviewRequests.map((request) => (
                        <li key={request.id} className="text-xs text-[#555]">
                          <span className="font-medium">{request.actor.displayName}</span>
                          {' · '}
                          <span>{new Date(request.createdAt).toLocaleString('ko-KR')}</span>
                          {request.reason ? (
                            <span className="ml-1 text-[#7a2e2e]">({request.reason})</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">최근 사용자 변경 내역</h2>
        {userModerationActions.length === 0 ? (
          <p className="text-sm text-[#888]">로그가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {userModerationActions.map((action) => (
              <li key={action.id} className="rounded-lg border border-[#e8e8e8] p-2 text-xs">
                <span className="font-medium">{action.actor.displayName}</span>
                {' → '}
                <span className="text-[#555]">{formatUserActionType(action.actionType)}</span>
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
