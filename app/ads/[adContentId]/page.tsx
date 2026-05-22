import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/db/prisma';

type AdContentPageProps = {
  params: Promise<{ adContentId: string }>;
};

async function getAdContent(adContentId: string) {
  try {
    return await prisma.adContent.findUnique({
      where: { id: adContentId },
      select: {
        id: true,
        status: true,
        title: true,
        body: true,
        thumbnailUrl: true,
        displayName: true,
        categoryName: true,
        cityName: true,
        advertiser: {
          select: { name: true },
        },
      },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: AdContentPageProps): Promise<Metadata> {
  const { adContentId } = await params;
  const adContent = await getAdContent(adContentId);

  if (!adContent || adContent.status !== 'APPROVED') {
    return { title: '광고' };
  }

  return {
    title: adContent.title?.trim() || adContent.displayName || '광고',
    description: adContent.body.slice(0, 160),
  };
}

export default async function AdContentPage({ params }: AdContentPageProps) {
  const { adContentId } = await params;
  const adContent = await getAdContent(adContentId);

  if (!adContent || adContent.status !== 'APPROVED') {
    notFound();
  }

  const advertiserName = adContent.displayName || adContent.advertiser.name;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
        {adContent.thumbnailUrl ? (
          <div className="relative h-52 w-full sm:h-64">
            <Image
              src={adContent.thumbnailUrl}
              alt={adContent.title?.trim() ? `광고: ${adContent.title.trim()}` : '광고 이미지'}
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
            {adContent.categoryName ? (
              <span className="inline-flex items-center rounded-full border border-[#f1e0a5] bg-[#fff7d1] px-2 py-0.5 text-xs font-medium text-[#7a6000]">
                {adContent.categoryName}
              </span>
            ) : null}
            {adContent.cityName ? (
              <span className="inline-flex items-center rounded-full border border-[#e8e8e8] bg-[#f7f7f7] px-2 py-0.5 text-xs text-[#555]">
                {adContent.cityName}
              </span>
            ) : null}
          </div>

          {adContent.title?.trim() ? (
            <h1 className="text-xl font-bold sm:text-2xl">{adContent.title.trim()}</h1>
          ) : null}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#333] sm:text-base">
            {adContent.body}
          </p>

          <p className="text-sm text-[#888]">{advertiserName}</p>
        </div>
      </div>
    </main>
  );
}
