import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';

import {
  advertiserMemberNavItems,
  ManagementSectionNav,
} from '@/components/admin/management-section-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessAdvertiserMemberSection } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdvertiserMemberContentsPageProps = {
  searchParams: Promise<{ contentId?: string }>;
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
          status: { in: ['REVIEW', 'APPROVED'] },
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

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">광고주 멤버 — 광고 콘텐츠</h1>
        <ManagementSectionNav items={advertiserMemberNavItems} />
      </div>

      <div className="space-y-3">
        {adContents.length === 0 ? (
          <p className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#888]">
            멤버로 속한 광고주의 REVIEW/APPROVED 콘텐츠가 없습니다.
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
          </dl>
        </div>
      ) : null}
    </section>
  );
}
