import { redirect } from 'next/navigation';

import {
  createOperatorProfileAction,
  toggleOperatorProfileActiveAction,
} from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminOperatorProfilesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminOperatorProfilesPage({
  searchParams,
}: AdminOperatorProfilesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const profiles = await prisma.operatorProfile.findMany({
    orderBy: [{ isActive: 'desc' }, { displayName: 'asc' }],
    select: {
      id: true,
      displayName: true,
      slug: true,
      avatarUrl: true,
      bio: true,
      isActive: true,
      _count: { select: { postsByDisplayProfile: true } },
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 관리자 프로필 관리</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">관리자 프로필 추가</h2>
        <form action={createOperatorProfileAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              name="displayName"
              required
              placeholder="프로필 이름 (예: 오클랜드 생활지기)"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
            />
            <input
              type="text"
              name="slug"
              required
              placeholder="슬러그 (영문 소문자/하이픈)"
              pattern="[a-z0-9-]+"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
            />
          </div>
          <input
            type="url"
            name="avatarUrl"
            placeholder="아바타 이미지 URL (선택)"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
          <textarea
            name="bio"
            rows={3}
            placeholder="소개 (선택)"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
          <FormSubmitButton
            idleLabel="추가"
            pendingLabel="처리 중..."
            className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
          />
        </form>
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">관리자 프로필 목록</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-[#888]">등록된 관리자 프로필이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-[#e8e8e8] p-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">{profile.displayName}</p>
                  <p className="truncate text-xs text-[#888]">슬러그: {profile.slug}</p>
                  {profile.avatarUrl ? (
                    <p className="truncate text-xs text-[#888]">아바타: {profile.avatarUrl}</p>
                  ) : null}
                  {profile.bio ? <p className="text-xs text-[#666]">{profile.bio}</p> : null}
                  <p className="text-xs text-[#888]">
                    이 프로필로 작성된 게시글 {profile._count.postsByDisplayProfile}개
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    profile.isActive ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f5] text-[#888]'
                  }`}
                >
                  {profile.isActive ? '활성' : '비활성'}
                </span>
                <form action={toggleOperatorProfileActiveAction}>
                  <input type="hidden" name="profileId" value={profile.id} />
                  <input type="hidden" name="isActive" value={String(profile.isActive)} />
                  <FormSubmitButton
                    idleLabel={profile.isActive ? '비활성화' : '활성화'}
                    pendingLabel="처리 중..."
                    className="rounded-xl border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]"
                  />
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
