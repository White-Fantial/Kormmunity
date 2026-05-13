import { redirect } from 'next/navigation';

import {

  createReportOptionAction,
  toggleReportOptionActiveAction,
} from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const runtime = "nodejs";
export const preferredRegion = "syd1";

export const dynamic = 'force-dynamic';

type AdminReportOptionsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminReportOptionsPage({
  searchParams,
}: AdminReportOptionsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const options = await prisma.reportOption.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      label: true,
      isActive: true,
      _count: { select: { reports: true } },
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 신고 옵션 관리</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">신고 옵션 추가</h2>
        <form action={createReportOptionAction} className="flex flex-wrap gap-2">
          <input
            type="text"
            name="label"
            required
            placeholder="예: 거래 사기 의심"
            className="min-w-[240px] flex-1 rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
          <FormSubmitButton
            idleLabel="추가"
            pendingLabel="처리 중..."
            className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
          />
        </form>
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">신고 옵션 목록</h2>
        {options.length === 0 ? (
          <p className="text-sm text-[#888]">등록된 신고 옵션이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {options.map((option) => (
              <li
                key={option.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e8e8e8] p-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-[#888]">사용된 신고 {option._count.reports}건</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    option.isActive
                      ? 'bg-green-50 text-green-700'
                      : 'bg-[#f5f5f5] text-[#888]'
                  }`}
                >
                  {option.isActive ? '활성' : '비활성'}
                </span>
                <form action={toggleReportOptionActiveAction}>
                  <input type="hidden" name="optionId" value={option.id} />
                  <input type="hidden" name="isActive" value={String(option.isActive)} />
                  <FormSubmitButton
                    idleLabel={option.isActive ? '비활성화' : '활성화'}
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
