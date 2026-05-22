import Link from 'next/link';
import { redirect } from 'next/navigation';

import { deletePostPermissionAction } from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { DateTimeText } from '@/components/ui/date-time-text';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminPostPermissionDetailPageProps = {
  params: Promise<{ permissionId: string }>;
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

export default async function AdminPostPermissionDetailPage({
  params,
  searchParams,
}: AdminPostPermissionDetailPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const [{ permissionId }, query] = await Promise.all([params, searchParams]);

  const permission = await prisma.postPermission.findUnique({
    where: { id: permissionId },
    select: {
      id: true,
      subjectType: true,
      role: true,
      createdAt: true,
      user: { select: { displayName: true } },
      country: { select: { name: true } },
      city: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!permission) {
    redirect('/admin/post-permissions?error=권한을 찾을 수 없습니다.');
  }

  const returnTo = `/admin/post-permissions/${permission.id}`;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 게시글 권한 상세</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">ID:</span> {permission.id}</p>
          <p>
            <span className="font-medium">주체:</span>{' '}
            {permission.subjectType === 'USER'
              ? `사용자 · ${permission.user?.displayName ?? '삭제된 사용자'}`
              : `역할 · ${ROLE_LABELS[permission.role ?? 'USER']}`}
          </p>
          <p>
            <span className="font-medium">국가:</span>{' '}
            {formatScopeLabel(permission.country?.name ?? null, '모든 국가')}
          </p>
          <p>
            <span className="font-medium">도시:</span>{' '}
            {formatScopeLabel(permission.city?.name ?? null, '모든 도시')}
          </p>
          <p>
            <span className="font-medium">카테고리:</span>{' '}
            {formatScopeLabel(permission.category?.name ?? null, '모든 카테고리')}
          </p>
          <p>
            <span className="font-medium">생성일:</span> <DateTimeText value={permission.createdAt} />
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={deletePostPermissionAction}>
            <input type="hidden" name="permissionId" value={permission.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <FormSubmitButton
              idleLabel="권한 삭제"
              pendingLabel="삭제 중..."
              className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            />
          </form>
          <Link
            href="/admin/post-permissions"
            className="rounded-xl border border-[#e8e8e8] px-3 py-1.5 text-sm font-medium hover:bg-[#f9f9f9]"
          >
            목록으로
          </Link>
        </div>
      </div>
    </section>
  );
}
