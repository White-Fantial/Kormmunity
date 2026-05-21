import type { AdBillingUnit, AdPlacementType, AdPricingModel, Prisma } from '@prisma/client';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const PRICING_VERSION = 1;

export const DEFAULT_COUNTRY_MULTIPLIER = 1;
export const DEFAULT_CITY_MULTIPLIER = 1;
export const DEFAULT_PLACEMENT_MULTIPLIERS: Record<AdPlacementType, number> = {
  TOP_FIXED: 1.5,
  FEED_INLINE: 1,
};

export type GeoMultiplierResult = {
  multiplier: number;
  source: 'city' | 'country' | 'default';
  pricingId?: string;
};

export type PlacementMultiplierResult = {
  multiplier: number;
  source: 'placement' | 'default';
  pricingId?: string;
};

type PricingQueryClient = Pick<
  Prisma.TransactionClient,
  'adGeoPricing' | 'adPlacementPricing'
>;

export function getBillingUnitForPricingModel(pricingModel: AdPricingModel): AdBillingUnit {
  return pricingModel === 'CPM' ? 'IMPRESSION_1000' : 'DAY';
}

export function roundToCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateBillableDays(startAt: Date | null, endAt: Date | null): number {
  if (!startAt || !endAt) {
    return 1;
  }

  const diffMs = endAt.getTime() - startAt.getTime();
  if (diffMs <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(diffMs / ONE_DAY_MS));
}

export function calculateEstimatedAmount(input: {
  pricingModel: AdPricingModel;
  basePrice: number;
  geoMultiplier: number;
  placementMultiplier: number;
  startAt: Date | null;
  endAt: Date | null;
  impressions: number;
}): { amount: number; billableDays: number | null } {
  const shared = input.basePrice * input.geoMultiplier * input.placementMultiplier;

  if (input.pricingModel === 'FIXED') {
    const billableDays = calculateBillableDays(input.startAt, input.endAt);
    return {
      amount: roundToCurrency(shared * billableDays),
      billableDays,
    };
  }

  const impressions = Math.max(0, input.impressions);
  return {
    amount: roundToCurrency((impressions / 1000) * shared),
    billableDays: null,
  };
}

export function calculateFinalAmount(input: {
  pricingModel: AdPricingModel;
  basePrice: number;
  geoMultiplier: number;
  placementMultiplier: number;
  startAt: Date | null;
  endAt: Date | null;
  impressions: number;
}): { amount: number; billableDays: number | null } {
  return calculateEstimatedAmount(input);
}

export async function resolveGeoMultiplier(
  client: PricingQueryClient,
  input: {
    targetCityId: string | null;
    targetCountryId: string | null;
    at: Date;
  },
): Promise<GeoMultiplierResult> {
  const effectiveWhere = {
    isActive: true,
    OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: input.at } }],
    AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.at } }] }],
  } satisfies Prisma.AdGeoPricingWhereInput;

  if (input.targetCityId) {
    const cityPricing = await client.adGeoPricing.findFirst({
      where: {
        ...effectiveWhere,
        cityId: input.targetCityId,
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, multiplier: true },
    });

    if (cityPricing) {
      return {
        multiplier: Number(cityPricing.multiplier),
        source: 'city',
        pricingId: cityPricing.id,
      };
    }

    return { multiplier: DEFAULT_CITY_MULTIPLIER, source: 'default' };
  }

  if (input.targetCountryId) {
    const countryPricing = await client.adGeoPricing.findFirst({
      where: {
        ...effectiveWhere,
        countryId: input.targetCountryId,
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, multiplier: true },
    });

    if (countryPricing) {
      return {
        multiplier: Number(countryPricing.multiplier),
        source: 'country',
        pricingId: countryPricing.id,
      };
    }

    return { multiplier: DEFAULT_COUNTRY_MULTIPLIER, source: 'default' };
  }

  return { multiplier: 1, source: 'default' };
}

export async function resolvePlacementMultiplier(
  client: PricingQueryClient,
  input: {
    placementType: AdPlacementType;
    at: Date;
  },
): Promise<PlacementMultiplierResult> {
  const placementPricing = await client.adPlacementPricing.findFirst({
    where: {
      placementType: input.placementType,
      isActive: true,
      OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: input.at } }],
      AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.at } }] }],
    },
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, multiplier: true },
  });

  if (placementPricing) {
    return {
      multiplier: Number(placementPricing.multiplier),
      source: 'placement',
      pricingId: placementPricing.id,
    };
  }

  return {
    multiplier: DEFAULT_PLACEMENT_MULTIPLIERS[input.placementType],
    source: 'default',
  };
}

export function buildPricingSnapshot(input: {
  pricingModel: AdPricingModel;
  billingUnit: AdBillingUnit;
  currency: string;
  basePrice: number;
  geoMultiplier: GeoMultiplierResult;
  placementMultiplier: PlacementMultiplierResult;
  startAt: Date | null;
  endAt: Date | null;
  maxImpressions: number | null;
  estimatedAmount: number;
  billableDays: number | null;
}): Prisma.InputJsonValue {
  return {
    version: PRICING_VERSION,
    pricingModel: input.pricingModel,
    billingUnit: input.billingUnit,
    currency: input.currency,
    basePrice: input.basePrice,
    geoMultiplier: input.geoMultiplier.multiplier,
    geoMultiplierSource: input.geoMultiplier.source,
    geoPricingId: input.geoMultiplier.pricingId ?? null,
    placementMultiplier: input.placementMultiplier.multiplier,
    placementMultiplierSource: input.placementMultiplier.source,
    placementPricingId: input.placementMultiplier.pricingId ?? null,
    startAt: input.startAt?.toISOString() ?? null,
    endAt: input.endAt?.toISOString() ?? null,
    maxImpressions: input.maxImpressions,
    billableDays: input.billableDays,
    estimatedAmount: input.estimatedAmount,
    rounded: 'round(2)',
  };
}
