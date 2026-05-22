import Image from 'next/image';

import type { AdLayout, AdSize } from '@/lib/ads/types';

type AdContentFeedPreviewProps = {
  title: string | null;
  body: string;
  advertiserName: string;
  displayName: string | null;
  categoryName: string | null;
  cityName: string | null;
  thumbnailUrl: string | null;
  layout?: AdLayout;
  size?: AdSize;
};

function AdBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
      광고
    </span>
  );
}

function CategoryBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#f1e0a5] bg-[#fff7d1] px-2 py-0.5 text-xs font-medium text-[#7a6000]">
      {name}
    </span>
  );
}

function CityBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#e8e8e8] bg-[#f7f7f7] px-2 py-0.5 text-xs text-[#555]">
      {name}
    </span>
  );
}

function getThumbnailDimClass(size: AdSize): string {
  if (size === 'S') return 'h-12 w-12 sm:h-14 sm:w-14';
  if (size === 'L') return 'h-20 w-20 sm:h-[88px] sm:w-[88px]';
  return 'h-16 w-16 sm:h-[72px] sm:w-[72px]';
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

export function AdContentFeedPreview({
  title,
  body,
  advertiserName,
  displayName,
  categoryName,
  cityName,
  thumbnailUrl,
  layout = 'THUMBNAIL',
  size = 'M',
}: AdContentFeedPreviewProps) {
  const authorName = displayName ?? advertiserName;
  const isInline = layout === 'TEXT' || layout === 'THUMBNAIL';
  const showThumbnailInRow = isInline && layout === 'THUMBNAIL' && Boolean(thumbnailUrl);
  const showImageInCard = !isInline && Boolean(thumbnailUrl);

  const wrapperClass =
    layout === 'FEATURED'
      ? 'overflow-hidden rounded-xl border border-amber-300 bg-amber-50/30 shadow-md ring-2 ring-amber-200'
      : layout === 'IMAGE'
        ? 'overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm'
        : 'rounded-xl border border-amber-200 bg-white p-3 shadow-sm';

  const titleClass =
    layout === 'FEATURED' ? 'truncate text-base font-bold' : 'truncate text-sm font-semibold';

  return (
    <div>
      <div className="mb-2 text-xs font-medium text-[#7a6000]">
        피드 목록 미리보기 ({layout} / {size})
      </div>

      <div className={wrapperClass}>
        {isInline ? (
          /* TEXT or THUMBNAIL: horizontal row */
          <div className="flex items-start gap-3">
            {showThumbnailInRow && thumbnailUrl ? (
              <div
                className={`relative ${getThumbnailDimClass(size)} shrink-0 overflow-hidden rounded-lg border border-amber-200`}
              >
                <Image
                  src={thumbnailUrl}
                  alt={title?.trim() ? `광고: ${title.trim()}` : '광고'}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                <AdBadge />
                {categoryName ? <CategoryBadge name={categoryName} /> : null}
                {cityName ? <CityBadge name={cityName} /> : null}
              </div>
              {title?.trim() ? <p className={titleClass}>{title.trim()}</p> : null}
              <p className="truncate text-sm text-[#555]">{body.slice(0, 220)}</p>
              <p className="text-xs text-[#888]">{authorName}</p>
            </div>
          </div>
        ) : (
          /* IMAGE or FEATURED: vertical card */
          <div className="space-y-3 p-3 sm:p-4">
            {showImageInCard && thumbnailUrl ? (
              <div
                className={`relative overflow-hidden rounded-lg ${getImageHeight(layout, size)}`}
              >
                <Image
                  src={thumbnailUrl}
                  alt={title?.trim() ? `광고: ${title.trim()}` : '광고'}
                  fill
                  sizes="(max-width: 768px) 100vw, 720px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              <AdBadge />
              {categoryName ? <CategoryBadge name={categoryName} /> : null}
              {cityName ? <CityBadge name={cityName} /> : null}
            </div>
            <div className="space-y-1">
              {title?.trim() ? <p className={titleClass}>{title.trim()}</p> : null}
              <p className="line-clamp-2 text-sm text-[#555]">{body.slice(0, 220)}</p>
            </div>
            <p className="text-sm text-[#666]">{authorName}</p>
          </div>
        )}
      </div>
    </div>
  );
}
