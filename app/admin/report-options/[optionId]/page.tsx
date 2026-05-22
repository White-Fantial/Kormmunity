import Link from 'next/link';
import { redirect } from 'next/navigation';

import { toggleReportOptionActiveAction } from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminReportOptionDetailPageProps = {
  params: Promise<{ optionId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminReportOptionDetailPage({
  params,
  searchParams,
}: AdminReportOptionDetailPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const [{ optionId }, query] = await Promise.all([params, searchParams]);
  const option = await prisma.reportOption.findUnique({
    where: { id: optionId },
    select: {
      id: true,
      label: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { reports: true } },
    },
  });

  if (!option) {
    redirect('/admin/report-options?error=신고 옵션을 찾을 수 없습니다.');
  }

  const returnTo = `/admin/report-options/${option.id}`;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 신고 옵션 상세</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">ID:</span> {option.id}</p>
          <p><span className="font-medium">이름:</span> {option.label}</p>
          <p><span className="font-medium">정렬 순서:</span> {option.sortOrder}</p>
          <p><span className="font-medium">사용된 신고:</span> {option._count.reports}건</p>
          <p>
            <span className="font-medium">상태:</span>{' '}
            <span className={option.isActive ? 'text-green-700' : 'text-[#888]'}>
              {option.isActive ? '활성' : '비활성'}
            </span>
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={toggleReportOptionActiveAction}>
            <input type="hidden" name="optionId" value={option.id} />
            <input type="hidden" name="isActive" value={String(option.isActive)} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <FormSubmitButton
              idleLabel={option.isActive ? '비활성화' : '활성화'}
              pendingLabel="처리 중..."
              className="rounded-xl border border-[#e8e8e8] px-3 py-1.5 text-sm font-medium hover:bg-[#f9f9f9]"
            />
          </form>
          <Link
            href="/admin/report-options"
            className="rounded-xl border border-[#e8e8e8] px-3 py-1.5 text-sm font-medium hover:bg-[#f9f9f9]"
          >
            목록으로
          </Link>
        </div>
      </div>
    </section>
  );
}
