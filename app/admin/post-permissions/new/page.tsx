import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createPostPermissionAction } from '@/app/admin/actions';
import { PostPermissionForm } from '@/components/admin/post-permission-form';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision, USER_ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminPostPermissionsNewPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const ROLE_LABELS: Record<string, string> = {
  USER: '일반 사용자',
  MODERATOR: '모더레이터',
  COORDINATOR: '운영자',
  ADMIN: '관리자',
};

export default async function AdminPostPermissionsNewPage({
  searchParams,
}: AdminPostPermissionsNewPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const [params, users, countries, cities, categories] = await Promise.all([
    searchParams,
    prisma.user.findMany({
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true },
    }),
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, countryId: true, country: { select: { name: true } } },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, visibilityMode: true },
    }),
  ]);

  async function createPostPermissionWithReturnTo(formData: FormData) {
    'use server';
    formData.set('returnTo', '/admin/post-permissions/new');
    await createPostPermissionAction(formData);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 게시글 작성 권한 추가</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm space-y-4">
        <PostPermissionForm
          action={createPostPermissionWithReturnTo}
          users={users}
          roles={USER_ROLES.map((role) => ({
            value: role,
            label: `${ROLE_LABELS[role]} (${role})`,
          }))}
          countries={countries}
          cities={cities.map((city) => ({
            id: city.id,
            name: city.country ? `${city.country.name} · ${city.name}` : city.name,
            countryId: city.countryId,
          }))}
          categories={categories}
        />
        <Link
          href="/admin/post-permissions"
          className="inline-block rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
        >
          목록으로
        </Link>
      </div>
    </section>
  );
}
