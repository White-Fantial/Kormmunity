import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  deletePostPermissionAction,
} from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { DateTimeText } from '@/components/ui/date-time-text';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';


export const dynamic = 'force-dynamic';

type AdminPostPermissionsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const ROLE_LABELS: Record<string, string> = {
  USER: '일반 사용자',
  MODERATOR: '모더레이터',
  COORDINATOR: '운영자',
  ADMIN: '관리자',
};

function formatScopeLabel(label: string | null, fallback: string) {
  return label ?? fallback;
}

export default async function AdminPostPermissionsPage({
  searchParams,
}: AdminPostPermissionsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const [params, permissions] = await Promise.all([
    searchParams,
    prisma.postPermission.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subjectType: true,
        role: true,
        createdAt: true,
        user: { select: { displayName: true } },
        country: { select: { name: true } },
        city: { select: { name: true } },
        category: { select: { name: true, visibilityMode: true } },
      },
    }),
  ]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 게시글 작성 권한</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">등록된 권한</h2>
          <Link
            href="/admin/post-permissions/new"
            className="rounded-xl bg-[#fee500] px-3 py-1.5 text-xs font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
          >
            권한 추가
          </Link>
        </div>
        {permissions.length === 0 ? (
          <p className="text-sm text-[#888]">등록된 게시글 작성 권한이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {permissions.map((permission) => (
              <li key={permission.id} className="space-y-2 rounded-xl border border-[#e8e8e8] p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[#555]">
                    {permission.subjectType === 'USER'
                      ? `사용자 · ${permission.user?.displayName ?? '삭제된 사용자'}`
                      : `역할 · ${ROLE_LABELS[permission.role ?? 'USER']}`}
                  </span>
                  <span className="rounded-full bg-[#fffde7] px-2 py-0.5 text-[#7a6000]">
                    국가: {formatScopeLabel(permission.country?.name ?? null, '모든 국가')}
                  </span>
                  <span className="rounded-full bg-[#fffde7] px-2 py-0.5 text-[#7a6000]">
                    도시: {formatScopeLabel(permission.city?.name ?? null, '모든 도시')}
                  </span>
                  <span className="rounded-full bg-[#fffde7] px-2 py-0.5 text-[#7a6000]">
                    카테고리: {formatScopeLabel(permission.category?.name ?? null, '모든 카테고리')}
                  </span>
                </div>
                <p className="text-xs text-[#888]">
                  생성일: <DateTimeText value={permission.createdAt} />
                </p>
                <form action={deletePostPermissionAction}>
                  <input type="hidden" name="permissionId" value={permission.id} />
                  <input type="hidden" name="returnTo" value="/admin/post-permissions" />
                  <FormSubmitButton
                    idleLabel="권한 삭제"
                    pendingLabel="삭제 중..."
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  />
                </form>
                <Link
                  href={`/admin/post-permissions/${permission.id}`}
                  className="inline-block rounded-xl border border-[#e8e8e8] px-3 py-1.5 text-xs font-medium hover:bg-[#f9f9f9]"
                >
                  상세
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
