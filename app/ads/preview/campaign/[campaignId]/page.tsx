import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdContentFeedPreview } from '@/components/ads/ad-content-feed-preview';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canAccessAdsManagerSection } from '@/lib/permissions';
import { AD_CAMPAIGN_STATUS_LABELS } from '@/lib/ads/types';
import type { AdLayout, AdSize } from '@/lib/ads/types';

type CampaignPreviewPageProps = {
  params: Promise<{ campaignId: string }>;
};

async function getCampaign(campaignId: string) {
  try {
    return await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        advertiserId: true,
        status: true,
        landingUrl: true,
        startAt: true,
        endAt: true,
        notes: true,
        adProduct: {
          select: {
            layout: true,
            size: true,
            placementType: true,
          },
        },
        adContent: {
          select: {
            id: true,
            title: true,
            body: true,
            thumbnailUrl: true,
            landingUrl: true,
            displayName: true,
            categoryName: true,
            cityName: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            body: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
            category: { select: { name: true } },
            city: { select: { name: true } },
            author: { select: { displayName: true } },
          },
        },
        advertiser: {
          select: { name: true },
        },
      },
    });
  } catch {
    return null;
  }
}

export default async function CampaignPreviewPage({ params }: CampaignPreviewPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/posts');
  }

  const { campaignId } = await params;
  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    redirect('/posts');
  }

  const isAdManager = canAccessAdsManagerSection(currentUser);
  if (!isAdManager) {
    if (!campaign.advertiserId) {
      redirect('/posts');
    }

    const membership = await prisma.advertiserMember.findFirst({
      where: {
        advertiserId: campaign.advertiserId,
        userId: currentUser.id,
        isActive: true,
      },
      select: { id: true },
    });
    if (!membership) {
      redirect('/posts');
    }
  }

  const content = campaign.adContent;
  const post = campaign.post;

  const adTitle = content?.title ?? post?.title ?? null;
  const adBody = content?.body ?? post?.body ?? '';
  const advertiserName =
    content?.displayName ?? campaign.advertiser?.name ?? post?.author.displayName ?? '광고';
  const categoryName = content?.categoryName ?? post?.category.name ?? null;
  const cityName = content?.cityName ?? post?.city?.name ?? null;
  const thumbnailUrl = content?.thumbnailUrl ?? post?.images[0]?.url ?? null;
  const effectiveLandingUrl =
    campaign.landingUrl ?? content?.landingUrl ?? null;
  const fallbackHref = content
    ? `/ads/${content.id}`
    : post
      ? `/posts/${post.id}`
      : null;

  const layout = (campaign.adProduct.layout ?? 'THUMBNAIL') as AdLayout;
  const size = (campaign.adProduct.size ?? 'M') as AdSize;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="rounded-lg border border-[#e8e8e8] bg-[#f8f8f8] px-3 py-2 text-xs text-[#555]">
        캠페인 미리보기 · 현재 상태:{' '}
        <span className="font-medium">{AD_CAMPAIGN_STATUS_LABELS[campaign.status]}</span>
      </div>

      {/* Feed list preview */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#444]">피드 목록에서 보이는 모습</h2>
        <AdContentFeedPreview
          title={adTitle}
          body={adBody}
          advertiserName={advertiserName}
          displayName={content?.displayName ?? null}
          categoryName={categoryName}
          cityName={cityName}
          thumbnailUrl={thumbnailUrl}
          layout={layout}
          size={size}
        />
      </section>

      {/* Ad page preview (shown when no landing URL) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#444]">
          클릭 시 이동할 페이지
        </h2>
        {effectiveLandingUrl ? (
          <div className="rounded-lg border border-[#e8e8e8] bg-white px-4 py-3 text-sm">
            <p className="text-[#555]">외부 랜딩 URL로 이동:</p>
            <a
              href={effectiveLandingUrl}
              className="mt-1 block break-all text-[#3c1e1e] underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              {effectiveLandingUrl}
            </a>
          </div>
        ) : fallbackHref ? (
          <>
            <p className="text-xs text-[#888]">
              랜딩 URL이 설정되어 있지 않아 아래 광고 페이지로 이동합니다.
            </p>
            <Link
              href={fallbackHref}
              className="text-xs underline"
              target="_blank"
              rel="noreferrer"
            >
              광고 페이지 열기
            </Link>
            {/* Inline page preview */}
            <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
              {thumbnailUrl ? (
                <div className="relative h-52 w-full sm:h-64">
                  <Image
                    src={thumbnailUrl}
                    alt={adTitle?.trim() ? `광고: ${adTitle.trim()}` : '광고 이미지'}
                    fill
                    sizes="(max-width: 672px) 100vw, 672px"
                    className="object-cover"
                    priority
                  />
                </div>
              ) : null}
              <div className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    광고
                  </span>
                  {categoryName ? (
                    <span className="inline-flex items-center rounded-full border border-[#f1e0a5] bg-[#fff7d1] px-2 py-0.5 text-xs font-medium text-[#7a6000]">
                      {categoryName}
                    </span>
                  ) : null}
                  {cityName ? (
                    <span className="inline-flex items-center rounded-full border border-[#e8e8e8] bg-[#f7f7f7] px-2 py-0.5 text-xs text-[#555]">
                      {cityName}
                    </span>
                  ) : null}
                </div>
                {adTitle?.trim() ? (
                  <h1 className="text-xl font-bold sm:text-2xl">{adTitle.trim()}</h1>
                ) : null}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#333] sm:text-base">
                  {adBody}
                </p>
                <p className="text-sm text-[#888]">{advertiserName}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-[#e8e8e8] bg-white px-4 py-3 text-sm text-[#888]">
            연결된 콘텐츠 또는 게시글이 없습니다.
          </p>
        )}
      </section>
    </main>
  );
}
