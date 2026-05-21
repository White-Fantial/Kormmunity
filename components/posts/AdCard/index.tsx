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

function getCardClass(layout: AdLayout, size: AdSize): string {
  if (layout === 'FEATURED' || (layout === 'IMAGE' && size === 'L')) {
    return 'overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ring-1 ring-amber-100';
  }

  if (layout === 'IMAGE' || size === 'L') {
    return 'overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';
  }

  return 'rounded-xl border border-amber-200 bg-white p-3 shadow-sm transition hover:bg-amber-50/40';
}

function getImageHeight(layout: AdLayout, size: AdSize): string {
  if (layout === 'FEATURED' || size === 'L') {
    return 'h-52 sm:h-64';
  }

  return 'h-40 sm:h-48';
}

export function AdCard({ ad }: AdCardProps) {
  const layout = ad.adLayout;
  const size = ad.adSize;
  const isInline = layout === 'TEXT' || layout === 'THUMBNAIL';
  const hasThumbnail = Boolean(ad.thumbnailUrl) && layout !== 'TEXT';

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

  if (isInline || size === 'S') {
    return (
      <article className={getCardClass(layout, size)}>
        <AdImpressionTracker
          campaignId={ad.adCampaignId}
          postId={ad.adPostId}
          adContentId={ad.adContentId}
          placementType={ad.adPlacementType}
        />
        <Link
          href={ad.href}
          className="flex items-start gap-3"
          onClick={handleClick}
        >
          {hasThumbnail && ad.thumbnailUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-amber-200 sm:h-[72px] sm:w-[72px]">
              <Image
                src={ad.thumbnailUrl}
                alt={ad.title?.trim() ? `광고: ${ad.title.trim()}` : '광고'}
                fill
                sizes="(max-width: 640px) 64px, 72px"
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

  return (
    <article className={getCardClass(layout, size)}>
      <AdImpressionTracker
        campaignId={ad.adCampaignId}
        postId={ad.adPostId}
        adContentId={ad.adContentId}
        placementType={ad.adPlacementType}
      />
      <Link href={ad.href} className="block space-y-3 p-3 sm:p-4" onClick={handleClick}>
        {hasThumbnail && ad.thumbnailUrl ? (
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
          {ad.title?.trim() ? (
            <h2 className="text-base font-semibold sm:text-lg">{ad.title.trim()}</h2>
          ) : null}
          <p className="line-clamp-2 text-sm text-[#555] sm:text-[15px]">{ad.bodyPreview}</p>
        </div>

        {ad.author ? (
          <p className="text-sm text-[#666]">{ad.author.displayName}</p>
        ) : null}
      </Link>
    </article>
  );
}
