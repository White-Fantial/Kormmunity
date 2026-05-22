import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createReportOptionAction } from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminReportOptionNewPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminReportOptionNewPage({ searchParams }: AdminReportOptionNewPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 신고 옵션 추가</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <form action={createReportOptionAction} className="space-y-3">
          <input type="hidden" name="returnTo" value="/admin/report-options/new" />
          <label className="space-y-1 text-sm">
            <span className="text-[#555]">신고 옵션 이름</span>
            <input
              type="text"
              name="label"
              required
              placeholder="예: 거래 사기 의심"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <FormSubmitButton
              idleLabel="추가"
              pendingLabel="처리 중..."
              className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
            />
            <Link
              href="/admin/report-options"
              className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
            >
              목록으로
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
