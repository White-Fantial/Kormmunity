'use client';

import Link from 'next/link';
import Image from 'next/image';

import { AdImpressionTracker } from './AdImpressionTracker';
import type { AdFeedItem, AdLayout, AdSize } from '@/lib/ads/types';

type AdCardProps = {
  ad: AdFeedItem;
};

function AdBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
      광고
    </span>
  );
}

// Layout determines the card template; size determines dimensions within that template.
function getCardClass(layout: AdLayout): string {
  if (layout === 'FEATURED') {
    return 'overflow-hidden rounded-xl border border-amber-300 bg-amber-50/30 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ring-2 ring-amber-200';
  }

  if (layout === 'IMAGE') {
    return 'overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';
  }

  // TEXT and THUMBNAIL: horizontal row card
  return 'rounded-xl border border-amber-200 bg-white p-3 shadow-sm transition hover:bg-amber-50/40';
}

function getImageHeight(layout: AdLayout, size: AdSize): string {
  if (layout === 'FEATURED') {
    if (size === 'S') return 'h-36 sm:h-44';
    if (size === 'L') return 'h-60 sm:h-72';
    return 'h-48 sm:h-56';
  }
  // IMAGE
  if (size === 'S') return 'h-28 sm:h-36';
  if (size === 'L') return 'h-52 sm:h-64';
  return 'h-40 sm:h-48';
}

function getThumbnailDimClass(size: AdSize): string {
  if (size === 'S') return 'h-12 w-12 sm:h-14 sm:w-14';
  if (size === 'L') return 'h-20 w-20 sm:h-[88px] sm:w-[88px]';
  return 'h-16 w-16 sm:h-[72px] sm:w-[72px]';
}

function getThumbnailSizesAttr(size: AdSize): string {
  if (size === 'S') return '(max-width: 640px) 48px, 56px';
  if (size === 'L') return '(max-width: 640px) 80px, 88px';
  return '(max-width: 640px) 64px, 72px';
}

function getBodyLineClamp(size: AdSize): string {
  if (size === 'S') return 'line-clamp-1';
  if (size === 'L') return 'line-clamp-3';
  return 'line-clamp-2';
}

export function AdCard({ ad }: AdCardProps) {
  const layout = ad.adLayout;
  const size = ad.adSize;

  // Layout exclusively determines the template:
  //   TEXT / THUMBNAIL → horizontal inline row
  //   IMAGE / FEATURED → vertical card with full-width image area
  const isInline = layout === 'TEXT' || layout === 'THUMBNAIL';

  // For THUMBNAIL rows, show the thumbnail if available.
  // For TEXT, always hide image regardless of thumbnailUrl.
  const showThumbnailInRow = isInline && layout === 'THUMBNAIL' && Boolean(ad.thumbnailUrl);

  // For vertical cards, show image if thumbnailUrl is present.
  const showImageInCard = !isInline && Boolean(ad.thumbnailUrl);

  function handleClick() {
    void fetch('/api/ads/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: ad.adCampaignId,
        postId: ad.adPostId,
        adContentId: ad.adContentId,
      }),
      keepalive: true,
    });
  }

  if (isInline) {
    return (
      <article className={getCardClass(layout)}>
        <AdImpressionTracker
          campaignId={ad.adCampaignId}
          postId={ad.adPostId}
          adContentId={ad.adContentId}
          placementType={ad.adPlacementType}
        />
        <Link href={ad.href} className="flex items-start gap-3" onClick={handleClick}>
          {showThumbnailInRow && ad.thumbnailUrl ? (
            <div
              className={`relative ${getThumbnailDimClass(size)} shrink-0 overflow-hidden rounded-lg border border-amber-200`}
            >
              <Image
                src={ad.thumbnailUrl}
                alt={ad.title?.trim() ? `광고: ${ad.title.trim()}` : '광고'}
                fill
                sizes={getThumbnailSizesAttr(size)}
                quality={60}
                className="object-cover"
              />
            </div>
          ) : null}

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              <AdBadge />
              {ad.category ? (
                <span className="inline-flex items-center rounded-full border border-[#f1e0a5] bg-[#fff7d1] px-2 py-0.5 text-xs font-medium text-[#7a6000]">
                  {ad.category.name}
                </span>
              ) : null}
            </div>
            {ad.title?.trim() ? (
              <p className="truncate text-sm font-semibold">{ad.title.trim()}</p>
            ) : null}
            <p className="truncate text-sm text-[#555]">{ad.bodyPreview}</p>
            {ad.author ? (
              <p className="text-xs text-[#888]">{ad.author.displayName}</p>
            ) : null}
          </div>
        </Link>
      </article>
    );
  }

  // IMAGE or FEATURED: vertical card
  const titleClass =
    layout === 'FEATURED'
      ? 'text-lg font-bold sm:text-xl'
      : 'text-base font-semibold sm:text-lg';

  return (
    <article className={getCardClass(layout)}>
      <AdImpressionTracker
        campaignId={ad.adCampaignId}
        postId={ad.adPostId}
        adContentId={ad.adContentId}
        placementType={ad.adPlacementType}
      />
      <Link href={ad.href} className="block space-y-3 p-3 sm:p-4" onClick={handleClick}>
        {showImageInCard && ad.thumbnailUrl ? (
          <div className={`relative overflow-hidden rounded-lg ${getImageHeight(layout, size)}`}>
            <Image
              src={ad.thumbnailUrl}
              alt={ad.title?.trim() ? `광고: ${ad.title.trim()}` : '광고'}
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              quality={60}
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <AdBadge />
          {ad.category ? (
            <span className="inline-flex items-center rounded-full border border-[#f1e0a5] bg-[#fff7d1] px-2 py-0.5 text-xs font-medium text-[#7a6000]">
              {ad.category.name}
            </span>
          ) : null}
          {ad.city ? (
            <span className="inline-flex items-center rounded-full border border-[#e8e8e8] bg-[#f7f7f7] px-2 py-0.5 text-xs text-[#555]">
              {ad.city.name}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          {ad.title?.trim() ? <h2 className={titleClass}>{ad.title.trim()}</h2> : null}
          <p className={`text-sm text-[#555] sm:text-[15px] ${getBodyLineClamp(size)}`}>
            {ad.bodyPreview}
          </p>
        </div>

        {ad.author ? <p className="text-sm text-[#666]">{ad.author.displayName}</p> : null}
      </Link>
    </article>
  );
}
