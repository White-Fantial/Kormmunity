import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';

import { reviewAdvertiserMemberAdContentAction } from '@/app/advertiser-member/actions';
import {
  advertiserMemberNavItems,
  ManagementSectionNav,
} from '@/components/admin/management-section-nav';
import { AdContentFeedPreview } from '@/components/ads/ad-content-feed-preview';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessAdvertiserMemberSection } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdvertiserMemberContentsPageProps = {
  searchParams: Promise<{ contentId?: string; error?: string; success?: string }>;
};

export default async function AdvertiserMemberContentsPage({
  searchParams,
}: AdvertiserMemberContentsPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await canAccessAdvertiserMemberSection(currentUser))) {
    redirect('/posts');
  }

  const query = await searchParams;

  const memberships = await prisma.advertiserMember.findMany({
    where: { userId: currentUser.id, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: {
      advertiserId: true,
    },
  });

  const advertiserIds = memberships.map((membership) => membership.advertiserId);
  const adContents = advertiserIds.length
    ? await prisma.adContent.findMany({
        where: {
          advertiserId: { in: advertiserIds },
          status: { in: ['REVIEW', 'REQUEST_CHANGES', 'APPROVED'] },
        },
        orderBy: [{ updatedAt: 'desc' }],
        select: {
          id: true,
          status: true,
          title: true,
          body: true,
          thumbnailUrl: true,
          landingUrl: true,
          displayName: true,
          categoryName: true,
          cityName: true,
          reviewNotes: true,
          approvedAt: true,
          updatedAt: true,
          advertiser: { select: { name: true } },
        },
      })
    : [];

  const selectedContent = query.contentId
    ? adContents.find((content) => content.id === query.contentId)
    : null;

  const inputClass =
    'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';
  const submitClass =
    'rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">광고주 멤버 — 광고 콘텐츠</h1>
        <ManagementSectionNav items={advertiserMemberNavItems} />
      </div>

      {query.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}
      {query.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>
      ) : null}

      <div className="space-y-3">
        {adContents.length === 0 ? (
          <p className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#888]">
            멤버로 속한 광고주의 리뷰 대상 콘텐츠가 없습니다.
          </p>
        ) : (
          adContents.map((content) => (
            <div key={content.id} className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{content.title ?? '(제목 없음)'}</p>
                  <p className="text-xs text-[#888]">{content.advertiser.name} · {content.status}</p>
                </div>
                <Link href={`/advertiser-member/contents?contentId=${content.id}`} className="text-xs underline">
                  상세 보기
                </Link>
              </div>
              <p className="line-clamp-2 text-sm text-[#666]">{content.body}</p>
              <div className="mt-3">
                <AdContentFeedPreview
                  title={content.title}
                  body={content.body}
                  advertiserName={content.advertiser.name}
                  displayName={content.displayName}
                  categoryName={content.categoryName}
                  cityName={content.cityName}
                  thumbnailUrl={content.thumbnailUrl}
                />
              </div>
              <div className="mt-2">
                <Link
                  href={`/ads/preview/${content.id}`}
                  className="text-xs underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  광고 페이지 미리보기 (랜딩 URL 미설정 시)
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedContent ? (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">콘텐츠 상세</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#888]">광고주</dt>
              <dd className="mt-0.5 font-medium">{selectedContent.advertiser.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">상태</dt>
              <dd className="mt-0.5 font-medium">{selectedContent.status}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-[#888]">제목</dt>
              <dd className="mt-0.5">{selectedContent.title ?? '(제목 없음)'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-[#888]">본문</dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{selectedContent.body}</dd>
            </div>
            {selectedContent.displayName ? (
              <div>
                <dt className="text-xs text-[#888]">노출 작성자명</dt>
                <dd className="mt-0.5">{selectedContent.displayName}</dd>
              </div>
            ) : null}
            {selectedContent.categoryName ? (
              <div>
                <dt className="text-xs text-[#888]">카테고리명</dt>
                <dd className="mt-0.5">{selectedContent.categoryName}</dd>
              </div>
            ) : null}
            {selectedContent.cityName ? (
              <div>
                <dt className="text-xs text-[#888]">도시명</dt>
                <dd className="mt-0.5">{selectedContent.cityName}</dd>
              </div>
            ) : null}
            {selectedContent.landingUrl ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#888]">랜딩 URL</dt>
                <dd className="mt-0.5 break-all">{selectedContent.landingUrl}</dd>
              </div>
            ) : null}
            {selectedContent.reviewNotes ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#888]">리뷰 메모</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[#666]">{selectedContent.reviewNotes}</dd>
              </div>
            ) : null}
            {selectedContent.approvedAt ? (
              <div>
                <dt className="text-xs text-[#888]">승인일</dt>
                <dd className="mt-0.5">{new Date(selectedContent.approvedAt).toLocaleString('ko-KR')}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-[#888]">최종 수정일</dt>
              <dd className="mt-0.5">{new Date(selectedContent.updatedAt).toLocaleString('ko-KR')}</dd>
            </div>
            {selectedContent.thumbnailUrl ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#888]">썸네일</dt>
                <dd className="mt-1">
                  <Image
                    src={selectedContent.thumbnailUrl}
                    alt={selectedContent.title?.trim() || '광고 콘텐츠 썸네일'}
                    width={960}
                    height={540}
                    className="h-40 w-full rounded-lg border border-[#e8e8e8] object-cover sm:h-52"
                  />
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-xs text-[#888]">실제 노출 미리보기</dt>
              <dd className="mt-0.5">
                <p className="mb-1 text-xs text-[#666]">
                  {selectedContent.landingUrl
                    ? '랜딩 URL이 설정되어 실제 클릭 시 해당 URL로 이동해요. 아래는 랜딩 URL이 없을 때 보여줄 광고 페이지 미리보기예요.'
                    : '랜딩 URL이 없으면 아래 광고 페이지로 이동해요.'}
                </p>
                <Link
                  href={`/ads/preview/${selectedContent.id}`}
                  className="text-xs underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  광고 페이지 미리보기 열기
                </Link>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <AdContentFeedPreview
                title={selectedContent.title}
                body={selectedContent.body}
                advertiserName={selectedContent.advertiser.name}
                displayName={selectedContent.displayName}
                categoryName={selectedContent.categoryName}
                cityName={selectedContent.cityName}
                thumbnailUrl={selectedContent.thumbnailUrl}
              />
            </div>
          </dl>

          {(selectedContent.status === 'REVIEW' || selectedContent.status === 'REQUEST_CHANGES') ? (
            <div className="mt-4 space-y-3 border-t border-[#f0f0f0] pt-4">
              <h3 className="text-sm font-semibold">리뷰 처리</h3>

              <form action={reviewAdvertiserMemberAdContentAction}>
                <input type="hidden" name="id" value={selectedContent.id} />
                <input type="hidden" name="status" value="APPROVED" />
                <FormSubmitButton idleLabel="콘텐츠 승인" pendingLabel="처리 중..." className={submitClass} />
              </form>

              <form action={reviewAdvertiserMemberAdContentAction} className="space-y-2">
                <input type="hidden" name="id" value={selectedContent.id} />
                <input type="hidden" name="status" value="REQUEST_CHANGES" />
                <label className="space-y-1 text-sm">
                  <span className="text-[#555]">수정 요청 내용</span>
                  <textarea
                    name="reviewNotes"
                    rows={3}
                    required
                    placeholder="광고 매니저에게 요청할 수정 사항을 입력해 주세요."
                    className={inputClass}
                  />
                </label>
                <FormSubmitButton idleLabel="수정 요청 보내기" pendingLabel="전송 중..." className={submitClass} />
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
