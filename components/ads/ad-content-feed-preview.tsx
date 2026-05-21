import Image from 'next/image';

type AdContentFeedPreviewProps = {
  title: string | null;
  body: string;
  advertiserName: string;
  displayName: string | null;
  categoryName: string | null;
  cityName: string | null;
  thumbnailUrl: string | null;
};

export function AdContentFeedPreview({
  title,
  body,
  advertiserName,
  displayName,
  categoryName,
  cityName,
  thumbnailUrl,
}: AdContentFeedPreviewProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
      <div className="mb-2 text-xs font-medium text-[#7a6000]">피드 목록 미리보기</div>
      <div className="flex items-start gap-3">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title?.trim() ? `광고: ${title.trim()}` : '광고'}
            width={144}
            height={144}
            className="h-16 w-16 shrink-0 rounded-lg border border-amber-200 object-cover sm:h-[72px] sm:w-[72px]"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
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
          {title?.trim() ? <p className="truncate text-sm font-semibold">{title.trim()}</p> : null}
          <p className="truncate text-sm text-[#555]">{body.slice(0, 220)}</p>
          <p className="text-xs text-[#888]">{displayName ?? advertiserName}</p>
        </div>
      </div>
    </div>
  );
}
