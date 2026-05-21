import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  createAdvertiserMemberProposalAction,
} from '@/app/advertiser-member/actions';
import {
  advertiserMemberNavItems,
  ManagementSectionNav,
} from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessAdvertiserMemberSection } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdvertiserMemberProposalsPageProps = {
  searchParams: Promise<{ error?: string; success?: string; proposalId?: string }>;
};

export default async function AdvertiserMemberProposalsPage({
  searchParams,
}: AdvertiserMemberProposalsPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await canAccessAdvertiserMemberSection(currentUser))) {
    redirect('/posts');
  }

  const query = await searchParams;

  const [memberships, activeProducts] = await Promise.all([
    prisma.advertiserMember.findMany({
      where: { userId: currentUser.id, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: {
        advertiserId: true,
        advertiser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.adProduct.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { code: true, name: true },
    }),
  ]);

  const advertiserIds = memberships.map((membership) => membership.advertiserId);
  const adProposals = advertiserIds.length
    ? await prisma.adProposal.findMany({
        where: { advertiserId: { in: advertiserIds } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          title: true,
          body: true,
          advertiserId: true,
          advertiser: { select: { name: true } },
          submittedByUserId: true,
          advertisedProductCode: true,
          requestedStartAt: true,
          requestedEndAt: true,
          requestedBudget: true,
          requestedLandingUrl: true,
          negotiationNotes: true,
          rejectedReason: true,
          createdAt: true,
        },
      })
    : [];

  const selectedProposal = query.proposalId
    ? adProposals.find((proposal) => proposal.id === query.proposalId)
    : null;

  const inputClass =
    'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const selectClass =
    'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const submitClass =
    'rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">광고주 멤버 — 광고 제안</h1>
        <ManagementSectionNav items={advertiserMemberNavItems} />
      </div>

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}
      {query.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>
      ) : null}

      <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
          <span>광고 제안 등록</span>
          <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
        </summary>
        <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
          <form action={createAdvertiserMemberProposalAction} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">광고주 *</span>
              <select name="advertiserId" required className={selectClass}>
                <option value="">광고주 선택</option>
                {memberships.map((membership) => (
                  <option key={membership.advertiserId} value={membership.advertiserId}>
                    {membership.advertiser.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">상품 코드 (선택)</span>
              <select name="advertisedProductCode" className={selectClass}>
                <option value="">상품 선택 안 함</option>
                {activeProducts.map((product) => (
                  <option key={product.code} value={product.code}>
                    [{product.code}] {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-[#555]">제안 제목 *</span>
              <input type="text" name="title" required className={inputClass} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-[#555]">제안 내용 *</span>
              <textarea name="body" required rows={4} className={inputClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">희망 시작일</span>
              <input type="datetime-local" name="requestedStartAt" className={inputClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">희망 종료일</span>
              <input type="datetime-local" name="requestedEndAt" className={inputClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">예산 (NZD)</span>
              <input type="number" step="0.01" min="0" name="requestedBudget" className={inputClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[#555]">희망 랜딩 URL</span>
              <input type="url" name="requestedLandingUrl" className={inputClass} />
            </label>
            <div className="sm:col-span-2">
              <FormSubmitButton idleLabel="제안 등록" pendingLabel="등록 중..." className={submitClass} />
            </div>
          </form>
        </div>
      </details>

      <div className="space-y-3">
        {adProposals.length === 0 ? (
          <p className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#888]">
            멤버로 속한 광고주의 제안이 없습니다.
          </p>
        ) : (
          adProposals.map((proposal) => (
            <div key={proposal.id} className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{proposal.title}</p>
                  <p className="text-xs text-[#888]">{proposal.advertiser.name} · {proposal.status}</p>
                </div>
                <Link href={`/advertiser-member/proposals?proposalId=${proposal.id}`} className="text-xs underline">
                  상세 보기
                </Link>
              </div>
              <p className="line-clamp-2 text-sm text-[#666]">{proposal.body}</p>
            </div>
          ))
        )}
      </div>

      {selectedProposal ? (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">제안 상세</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#888]">광고주</dt>
              <dd className="mt-0.5 font-medium">{selectedProposal.advertiser.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">상태</dt>
              <dd className="mt-0.5 font-medium">{selectedProposal.status}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-[#888]">제안 제목</dt>
              <dd className="mt-0.5">{selectedProposal.title}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-[#888]">제안 내용</dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{selectedProposal.body}</dd>
            </div>
            {selectedProposal.advertisedProductCode ? (
              <div>
                <dt className="text-xs text-[#888]">상품 코드</dt>
                <dd className="mt-0.5 font-mono">{selectedProposal.advertisedProductCode}</dd>
              </div>
            ) : null}
            {selectedProposal.requestedStartAt ? (
              <div>
                <dt className="text-xs text-[#888]">희망 시작일</dt>
                <dd className="mt-0.5">{new Date(selectedProposal.requestedStartAt).toLocaleString('ko-KR')}</dd>
              </div>
            ) : null}
            {selectedProposal.requestedEndAt ? (
              <div>
                <dt className="text-xs text-[#888]">희망 종료일</dt>
                <dd className="mt-0.5">{new Date(selectedProposal.requestedEndAt).toLocaleString('ko-KR')}</dd>
              </div>
            ) : null}
            {selectedProposal.requestedBudget != null ? (
              <div>
                <dt className="text-xs text-[#888]">예산</dt>
                <dd className="mt-0.5">NZD {Number(selectedProposal.requestedBudget).toFixed(2)}</dd>
              </div>
            ) : null}
            {selectedProposal.requestedLandingUrl ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#888]">희망 랜딩 URL</dt>
                <dd className="mt-0.5 break-all">{selectedProposal.requestedLandingUrl}</dd>
              </div>
            ) : null}
            {selectedProposal.negotiationNotes ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#888]">협의 메모</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[#666]">{selectedProposal.negotiationNotes}</dd>
              </div>
            ) : null}
            {selectedProposal.status === 'REJECTED' && selectedProposal.rejectedReason ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#888]">반려 사유</dt>
                <dd className="mt-0.5 text-red-600">{selectedProposal.rejectedReason}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-[#888]">등록일</dt>
              <dd className="mt-0.5">{new Date(selectedProposal.createdAt).toLocaleString('ko-KR')}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
