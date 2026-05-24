import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  addStaffAssignmentAction,
  deactivateStaffAssignmentAction,
  deleteStaffAssignmentAction,
  changeUserAccountTypeAction,
  changeUserStatusAction,
} from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import { DateTimeText } from '@/components/ui/date-time-text';
import { FormSubmitButton } from '@/components/ui/form-submit-button';

export const dynamic = 'force-dynamic';
const MAX_REVIEW_REQUESTS_PER_USER = 5;
const MIN_REVIEW_REQUEST_LOOKUP = 20;
const MAX_REVIEW_REQUEST_LOOKUP = 200;
const MAX_RECENT_USER_MODERATION_ACTIONS = 40;

type AdminUsersPageProps = {
  searchParams: Promise<{ error?: string; q?: string }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const nameQuery = params.q?.trim() ?? '';
  const userQuerySelect = {
    id: true,
    displayName: true,
    accountType: true,
    isManagedAccount: true,
    isActive: true,
    status: true,
    shortBio: true,
    personaNotes: true,
    toneNotes: true,
    activityNotes: true,
    profileImageUrl: true,
    countryId: true,
    cityId: true,
    createdAt: true,
    _count: {
      select: { posts: true, comments: true },
    },
  } as const;

  const usersPromise = prisma.user
    .findMany({
      where: {
        isManagedAccount: false,
        ...(nameQuery ? { displayName: { contains: nameQuery, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...userQuerySelect,
        staffAssignments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            countryId: true,
            cityId: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

  const [users, countries, cities] = await Promise.all([
    usersPromise,
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, countryId: true },
    }),
  ]);

  const userIds = users.map((user) => user.id);
  const reviewRequestTake = Math.min(
    Math.max(userIds.length * MAX_REVIEW_REQUESTS_PER_USER, MIN_REVIEW_REQUEST_LOOKUP),
    MAX_REVIEW_REQUEST_LOOKUP,
  );

  const [userReviewRequests, userModerationActions] = await Promise.all([
    prisma.moderationAction.findMany({
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
    }),
    prisma.moderationAction.findMany({
      where: {
        OR: [{ targetType: 'USER' }, { targetType: 'MANAGED_ACCOUNT' }],
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
    }),
  ]);

  const roleLabels: Record<string, string> = {
    USER: '일반',
    MODERATOR: '모더레이터',
    COORDINATOR: '운영',
    ADMIN: '관리자',
  };

  const staffRoleLabels: Record<string, string> = {
    MODERATOR: '모더레이터',
    COORDINATOR: '운영진',
    AD_MANAGER: '광고 매니저',
    PARTNER_MANAGER: '파트너 매니저',
    ADMIN: '관리자',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: '활성',
    LIMITED: '제한',
    SUSPENDED: '정지',
    DELETED: '삭제',
  };

  const accountTypeLabels: Record<string, string> = {
    REAL_USER: 'REAL_USER',
    PERSONA: 'PERSONA',
    OPERATOR: 'OPERATOR',
    SYSTEM: 'SYSTEM',
  };

  const countryNameById = new Map(countries.map((c) => [c.id, c.name]));
  const cityNameById = new Map(cities.map((c) => [c.id, c.name]));

  function formatAssignmentScope(countryId: string | null, cityId: string | null): string {
    if (!countryId && !cityId) return '전역';
    const countryName = countryId ? (countryNameById.get(countryId) ?? countryId) : '전 국가';
    const cityName = cityId ? (cityNameById.get(cityId) ?? cityId) : '전 도시';
    return `${countryName} / ${cityName}`;
  }

  const formatUserActionType = (actionType: string) => {
    if (actionType === 'REVIEW_REQUEST') return '검토 요청';
    if (actionType.startsWith('ROLE_CHANGE_TO_')) {
      const role = actionType.replace('ROLE_CHANGE_TO_', '');
      return `역할 변경 → ${roleLabels[role] ?? role}`;
    }
    if (actionType.startsWith('STAFF_ASSIGNMENT_ADDED_')) {
      const role = actionType.replace('STAFF_ASSIGNMENT_ADDED_', '');
      return `스태프 권한 추가 (${staffRoleLabels[role] ?? role})`;
    }
    if (actionType.startsWith('STAFF_ASSIGNMENT_DEACTIVATED_')) {
      const role = actionType.replace('STAFF_ASSIGNMENT_DEACTIVATED_', '');
      return `스태프 권한 비활성화 (${staffRoleLabels[role] ?? role})`;
    }
    if (actionType.startsWith('STAFF_ASSIGNMENT_DELETED_')) {
      const role = actionType.replace('STAFF_ASSIGNMENT_DELETED_', '');
      return `스태프 권한 삭제 (${staffRoleLabels[role] ?? role})`;
    }
    if (actionType.startsWith('STATUS_CHANGE_TO_')) {
      const status = actionType.replace('STATUS_CHANGE_TO_', '');
      return `상태 변경 → ${statusLabels[status] ?? status}`;
    }
    if (actionType.startsWith('ACCOUNT_TYPE_CHANGE_TO_')) {
      const accountType = actionType.replace('ACCOUNT_TYPE_CHANGE_TO_', '');
      return `계정 타입 변경 → ${accountTypeLabels[accountType] ?? accountType}`;
    }
    if (actionType.startsWith('MANAGED_ACCOUNT_')) return actionType;
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
        <form method="GET" className="mb-3 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={nameQuery}
            placeholder="사용자 이름 검색"
            className="flex-1 rounded-lg border border-[#e8e8e8] px-3 py-1.5 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#fee500] px-3 py-1.5 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
          >
            검색
          </button>
          {nameQuery ? (
            <Link
              href="/admin/users"
              className="rounded-xl border border-[#e8e8e8] px-3 py-1.5 text-sm hover:bg-[#f9f9f9]"
            >
              초기화
            </Link>
          ) : null}
        </form>
        {users.length === 0 ? (
          <p className="text-sm text-[#888]">사용자가 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {users.map((u) => {
              const reviewRequests =
                userReviewRequestsByTargetId[u.id]?.slice(0, MAX_REVIEW_REQUESTS_PER_USER) ?? [];
              const activeAssignments = u.staffAssignments.filter((a) => a.isActive);

              return (
                <li key={u.id} className="space-y-2 rounded-xl border border-[#e8e8e8] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/users/${u.id}`} className="text-sm font-medium hover:underline">{u.displayName}</Link>
                    <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#555]">
                      {u.accountType}
                    </span>
                    {u.isManagedAccount ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        managed
                      </span>
                    ) : null}
                    {activeAssignments.length > 0 ? (
                      activeAssignments.map((a) => (
                        <span
                          key={a.id}
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            a.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : a.role === 'MODERATOR'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {staffRoleLabels[a.role]}
                          {(a.countryId || a.cityId) ? ` (${formatAssignmentScope(a.countryId, a.cityId)})` : ''}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#555]">
                        일반
                      </span>
                    )}
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.isActive ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f5] text-[#888]'
                      }`}
                    >
                      {u.isActive ? '활성' : '비활성'}
                    </span>
                    <span className="ml-auto text-xs text-[#aaa]">
                      글 {u._count.posts} · 댓글 {u._count.comments}
                    </span>
                  </div>

                  {/* Staff assignments list */}
                  {u.staffAssignments.length > 0 ? (
                    <div className="rounded-lg border border-[#e8e8e8] p-2">
                      <p className="mb-1 text-xs font-semibold text-[#555]">스태프 권한 목록</p>
                      <ul className="space-y-1">
                        {u.staffAssignments.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={a.isActive ? 'font-medium' : 'text-[#aaa] line-through'}>
                              {staffRoleLabels[a.role] ?? a.role}
                            </span>
                            <span className="text-[#888]">
                              {formatAssignmentScope(a.countryId, a.cityId)}
                            </span>
                            <span className={`rounded-full px-1.5 py-0.5 ${a.isActive ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f5] text-[#888]'}`}>
                              {a.isActive ? '활성' : '비활성'}
                            </span>
                            {u.id !== currentUser.id ? (
                              <>
                                {a.isActive ? (
                                  <form action={deactivateStaffAssignmentAction}>
                                    <input type="hidden" name="assignmentId" value={a.id} />
                                    <FormSubmitButton
                                      idleLabel="비활성화"
                                      pendingLabel="처리 중..."
                                      className="rounded border border-[#e8e8e8] px-1.5 py-0.5 text-xs hover:bg-[#f9f9f9]"
                                    />
                                  </form>
                                ) : null}
                                <form action={deleteStaffAssignmentAction}>
                                  <input type="hidden" name="assignmentId" value={a.id} />
                                  <FormSubmitButton
                                    idleLabel="삭제"
                                    pendingLabel="처리 중..."
                                    className="rounded border border-red-200 px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50"
                                  />
                                </form>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {u.id !== currentUser.id ? (
                    <div className="flex flex-wrap gap-2">
                      <details>
                        <summary className="cursor-pointer rounded-xl border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]">
                          스태프 권한 추가
                        </summary>
                        <form action={addStaffAssignmentAction} className="mt-2 space-y-2">
                          <input type="hidden" name="targetUserId" value={u.id} />
                          <select
                            name="role"
                            className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
                          >
                            <option value="MODERATOR">모더레이터 (MODERATOR)</option>
                            <option value="COORDINATOR">운영진 (COORDINATOR)</option>
                            <option value="AD_MANAGER">광고 매니저 (AD_MANAGER)</option>
                            <option value="PARTNER_MANAGER">파트너 매니저 (PARTNER_MANAGER)</option>
                            <option value="ADMIN">관리자 (ADMIN)</option>
                          </select>
                          <select
                            name="countryId"
                            className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
                          >
                            <option value="">전역 (국가 무관)</option>
                            {countries.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <select
                            name="cityId"
                            className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
                          >
                            <option value="">전 도시 (도시 무관)</option>
                            {cities.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <p className="text-xs text-[#888]">국가를 선택하면 해당 국가 범위, 도시를 선택하면 해당 도시 범위로 권한이 부여됩니다.</p>
                          <FormSubmitButton
                            idleLabel="추가"
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

                      <details>
                        <summary className="cursor-pointer rounded-xl border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]">
                          계정 타입 변경
                        </summary>
                        <form action={changeUserAccountTypeAction} className="mt-2 space-y-2">
                          <input type="hidden" name="targetUserId" value={u.id} />
                          <select
                            name="accountType"
                            defaultValue={u.accountType}
                            className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
                          >
                            <option value="REAL_USER">REAL_USER</option>
                            <option value="PERSONA">PERSONA</option>
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="SYSTEM">SYSTEM</option>
                          </select>
                          <p className="text-xs text-amber-700">
                            실제 가입자를 PERSONA/OPERATOR/SYSTEM으로 변경하면 로그인 정책과 노출 정책이 달라집니다.
                          </p>
                          <input
                            type="text"
                            name="reason"
                            placeholder="변경 사유 (선택)"
                            className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-sm focus:border-[#fee500] focus:outline-none"
                          />
                          <FormSubmitButton
                            idleLabel="계정 타입 변경"
                            pendingLabel="처리 중..."
                            className="rounded-xl border border-[#e8e8e8] px-3 py-1.5 text-sm font-medium hover:bg-[#f9f9f9]"
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
                            <DateTimeText value={request.createdAt} />
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
        <h2 className="mb-3 font-semibold">최근 사용자/운영 계정 변경 내역</h2>
        {userModerationActions.length === 0 ? (
          <p className="text-sm text-[#888]">로그가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {userModerationActions.map((action) => (
              <li key={action.id} className="rounded-lg border border-[#e8e8e8] p-2 text-xs">
                <details>
                  <summary className="cursor-pointer list-none">
                    <span className="font-medium">{action.actor.displayName}</span>
                    {' → '}
                    <span className="text-[#555]">{formatUserActionType(action.actionType)}</span>
                    {' · '}
                    <span className="font-mono text-[#aaa]">{action.targetId.slice(0, 8)}…</span>
                    <span className="ml-2 text-[#aaa]">
                      <DateTimeText value={action.createdAt} />
                    </span>
                  </summary>
                  <div className="mt-2 space-y-1 rounded-md bg-[#fafafa] p-2 text-[#666]">
                    <p>
                      <span className="font-medium">액션 코드:</span> {action.actionType}
                    </p>
                    <p>
                      <span className="font-medium">대상 ID:</span>{' '}
                      <span className="font-mono">{action.targetId}</span>
                    </p>
                    <p>
                      <span className="font-medium">사유:</span> {action.reason ?? '없음'}
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
