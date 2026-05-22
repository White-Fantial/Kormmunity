import { prisma } from '@/lib/db/prisma';
import { shouldShowOperatorBadge } from '@/lib/account-type';
import type { AdFeedItem, AdLayout, AdSize, AdPlacementType } from './types';

const BODY_PREVIEW_LENGTH = 220;

type RawCampaign = {
  id: string;
  postId: string | null;
  adContentId: string | null;
  landingUrl: string | null;
  priority: number;
  advertiser: {
    name: string;
  } | null;
  adProduct: {
    placementType: string;
    size: string;
    layout: string;
  };
  adContent: {
    id: string;
    status: string;
    title: string | null;
    body: string;
    thumbnailUrl: string | null;
    landingUrl: string | null;
    displayName: string | null;
    categoryName: string | null;
    cityName: string | null;
    createdAt: Date;
  } | null;
  post: {
    id: string;
    title: string | null;
    body: string;
    status: string;
    createdAt: Date;
    images: { url: string }[];
    category: { name: string; type: string; color: string | null };
    city: { name: string } | null;
    author: {
      displayName: string;
      profileImageUrl: string | null;
      accountType: 'REAL_USER' | 'PERSONA' | 'OPERATOR' | 'SYSTEM';
      neighbourWarmth: number;
    };
  } | null;
};

function toAdFeedItem(campaign: RawCampaign): AdFeedItem {
  const title = campaign.adContent?.title ?? campaign.post?.title ?? null;
  const body = campaign.adContent?.body ?? campaign.post?.body ?? '';
  const fallbackHref = campaign.adContent
    ? `/ads/${campaign.adContent.id}`
    : campaign.post
      ? `/posts/${campaign.post.id}`
      : '/posts';
  const href = campaign.landingUrl ?? campaign.adContent?.landingUrl ?? fallbackHref;
  const createdAt =
    campaign.adContent?.createdAt ??
    campaign.post?.createdAt ??
    new Date();
  const authorDisplayName =
    campaign.adContent?.displayName ??
    campaign.advertiser?.name ??
    campaign.post?.author.displayName ??
    '광고';
  const category = campaign.adContent?.categoryName
    ? { name: campaign.adContent.categoryName }
    : campaign.post?.category ?? null;
  const city = campaign.adContent?.cityName
    ? { name: campaign.adContent.cityName }
    : campaign.post?.city ?? null;
  const thumbnailUrl =
    campaign.adContent?.thumbnailUrl ??
    campaign.post?.images[0]?.url ??
    null;

  return {
    id: campaign.adContent?.id ?? campaign.post?.id ?? campaign.id,
    title,
    bodyPreview: body.slice(0, BODY_PREVIEW_LENGTH),
    href,
    createdAt: createdAt.toISOString(),
    thumbnailUrl,
    category,
    city,
    author: {
      displayName: authorDisplayName,
      profileImageUrl: campaign.post?.author.profileImageUrl ?? null,
      isOperator: campaign.post?.author
        ? shouldShowOperatorBadge(campaign.post.author)
        : false,
    },
    isAd: true,
    adCampaignId: campaign.id,
    adContentId: campaign.adContent?.id ?? null,
    adPostId: campaign.post?.id ?? null,
    adLayout: campaign.adProduct.layout as AdLayout,
    adSize: campaign.adProduct.size as AdSize,
    adPlacementType: campaign.adProduct.placementType as AdPlacementType,
  };
}

export type ActiveAdSlots = {
  topFixed: AdFeedItem[];
  inline: AdFeedItem[];
};

export async function fetchActiveAdSlots(options: {
  countryId: string | null;
  cityId: string | null;
}): Promise<ActiveAdSlots> {
  const now = new Date();
  let campaigns: RawCampaign[] = [];

  try {
    campaigns = (await prisma.adCampaign.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [
          { OR: [{ endAt: null }, { endAt: { gt: now } }] },
          {
            OR: [
              { targetCountryId: null },
              ...(options.countryId ? [{ targetCountryId: options.countryId }] : []),
            ],
          },
          {
            OR: [
              { targetCityId: null },
              ...(options.cityId ? [{ targetCityId: options.cityId }] : []),
            ],
          },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        postId: true,
        adContentId: true,
        landingUrl: true,
        priority: true,
        advertiser: {
          select: { name: true },
        },
        adProduct: {
          select: {
            placementType: true,
            size: true,
            layout: true,
          },
        },
        adContent: {
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
            createdAt: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            body: true,
            status: true,
            createdAt: true,
            images: {
              select: { url: true },
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
            category: { select: { name: true, type: true, color: true } },
            city: { select: { name: true } },
            author: {
              select: {
                displayName: true,
                profileImageUrl: true,
                accountType: true,
                neighbourWarmth: true,
              },
            },
          },
        },
      },
    })) as RawCampaign[];
  } catch (error) {
    if (isMissingAdSchemaError(error)) {
      return { topFixed: [], inline: [] };
    }

    throw error;
  }

  // Only show ads for published posts
  const activeCampaigns = campaigns.filter(
    (c) =>
      (c.adContent && c.adContent.status === 'APPROVED') ||
      (c.post && c.post.status === 'PUBLISHED'),
  ) as RawCampaign[];

  const campaignsByPriority = sortByPriorityWithRandomTies(activeCampaigns);

  const topFixedCampaigns = campaignsByPriority.filter(
    (c) => c.adProduct.placementType === 'TOP_FIXED',
  );
  const inlineCampaigns = campaignsByPriority.filter(
    (c) => c.adProduct.placementType === 'FEED_INLINE',
  );

  return {
    topFixed: topFixedCampaigns.slice(0, 3).map(toAdFeedItem),
    inline: inlineCampaigns.map(toAdFeedItem),
  };
}

function sortByPriorityWithRandomTies(campaigns: RawCampaign[]): RawCampaign[] {
  const groupedByPriority = new Map<number, RawCampaign[]>();

  for (const campaign of campaigns) {
    const samePriority = groupedByPriority.get(campaign.priority) ?? [];
    samePriority.push(campaign);
    groupedByPriority.set(campaign.priority, samePriority);
  }

  const priorities = [...groupedByPriority.keys()].sort((a, b) => b - a);
  const sorted: RawCampaign[] = [];

  for (const priority of priorities) {
    const bucket = groupedByPriority.get(priority);
    if (!bucket) continue;

    shuffleInPlace(bucket);
    sorted.push(...bucket);
  }

  return sorted;
}

function shuffleInPlace<T>(items: T[]): void {
  for (let index = items.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }
}

export type InlinePlacementRule = {
  insertAfter: number;
  repeatInterval: number;
  maxPerPage: number;
};

const DEFAULT_INLINE_RULE: InlinePlacementRule = {
  insertAfter: 5,
  repeatInterval: 10,
  maxPerPage: 2,
};

const AD_SCHEMA_TOKENS = [
  'AdCampaign',
  'AdContent',
  'AdProposal',
  'Advertiser',
  'AdvertiserMember',
  'AdAuditLog',
  'AdProduct',
  'AdPlacementRule',
  'AdImpression',
  'AdClick',
  'AdDailyStat',
];

function isMissingAdSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const knownError = error as {
    code?: unknown;
    meta?: unknown;
    message?: unknown;
  };
  const code = typeof knownError.code === 'string' ? knownError.code : '';

  if (code !== 'P2021' && code !== 'P2022') {
    return false;
  }

  const meta =
    knownError.meta && typeof knownError.meta === 'object'
      ? (knownError.meta as Record<string, unknown>)
      : undefined;
  const tableName = typeof meta?.table === 'string' ? meta.table : '';
  const columnName = typeof meta?.column === 'string' ? meta.column : '';
  const message = typeof knownError.message === 'string' ? knownError.message : '';
  const details = `${tableName} ${columnName} ${message}`;

  return AD_SCHEMA_TOKENS.some((token) => details.includes(token));
}

export async function getInlinePlacementRule(): Promise<InlinePlacementRule> {
  let rule: {
    insertAfter: number;
    repeatInterval: number;
    maxPerPage: number;
    isActive: boolean;
  } | null = null;

  try {
    rule = await prisma.adPlacementRule.findUnique({
      where: { placementType: 'FEED_INLINE' },
      select: { insertAfter: true, repeatInterval: true, maxPerPage: true, isActive: true },
    });
  } catch (error) {
    if (!isMissingAdSchemaError(error)) {
      throw error;
    }
  }

  if (!rule || !rule.isActive) {
    return DEFAULT_INLINE_RULE;
  }

  return {
    insertAfter: rule.insertAfter,
    repeatInterval: rule.repeatInterval,
    maxPerPage: rule.maxPerPage,
  };
}

/**
 * Insert ad items into a post feed at positions defined by the placement rule.
 *
 * @param posts        Array of post items (each has at minimum `id`)
 * @param ads          Top-fixed and inline ads to insert
 * @param rule         Where to insert inline ads
 * @param isFirstPage  True when showing the first page (no cursor) — shows top-fixed ad
 */
export function insertAdsIntoFeed<T>(
  posts: T[],
  ads: ActiveAdSlots,
  rule: InlinePlacementRule,
  isFirstPage: boolean,
): (T | AdFeedItem)[] {
  const result: (T | AdFeedItem)[] = [];

  if (isFirstPage && ads.topFixed.length > 0) {
    result.push(...ads.topFixed);
  }

  if (ads.inline.length === 0) {
    return [...result, ...posts];
  }

  let adsInserted = 0;
  let inlineAdIndex = 0;

  for (let i = 0; i < posts.length; i++) {
    result.push(posts[i]);

    const postPosition = i + 1; // 1-indexed
    const isAfterFirstSlot = postPosition === rule.insertAfter;
    const isAtRepeatSlot =
      postPosition > rule.insertAfter &&
      (postPosition - rule.insertAfter) % rule.repeatInterval === 0;

    if (
      adsInserted < rule.maxPerPage &&
      (isAfterFirstSlot || isAtRepeatSlot)
    ) {
      result.push(ads.inline[inlineAdIndex % ads.inline.length]);
      inlineAdIndex++;
      adsInserted++;
    }
  }

  return result;
}
