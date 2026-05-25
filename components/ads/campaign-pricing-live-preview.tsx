'use client';

import { useEffect, useMemo, useState } from 'react';

const DEFAULT_COUNTRY_MULTIPLIER = 1.5;

type Product = {
  id: string;
  code: string;
  name: string;
  placementType: 'TOP_FIXED' | 'FEED_INLINE';
  billingUnit: 'DAY' | 'WEEK' | 'MONTH' | 'IMPRESSION_1000';
  currency: string;
  basePrice: number;
  isActive: boolean;
};

type GeoPricing = {
  id: string;
  countryId: string | null;
  cityId: string | null;
  multiplier: number;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

type CampaignPricingLivePreviewProps = {
  formId: string;
  adProducts: Product[];
  adGeoPricings: GeoPricing[];
  savedEstimatedAmount?: number | null;
  savedProposedAmount?: number | null;
};

type PreviewState = {
  amount: number;
  billableDays: number | null;
  billableQuantity: number;
  currency: string;
  basePrice: number;
  geoMultiplier: number;
  geoSource: 'city' | 'country' | 'default';
};

function roundToCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateBillableDays(startAt: Date | null, endAt: Date | null): number {
  if (!startAt || !endAt) {
    return 1;
  }

  const startLocalDay = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate());
  const endLocalDay = new Date(endAt.getFullYear(), endAt.getMonth(), endAt.getDate());
  const diffMs = endLocalDay.getTime() - startLocalDay.getTime();

  if (diffMs < 0) {
    return 1;
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor(diffMs / ONE_DAY_MS) + 1);
}

function resolveDurationUnitSizeDays(unit: Product['billingUnit']): number {
  if (unit === 'WEEK') return 7;
  if (unit === 'MONTH') return 30;
  return 1;
}

function isEffective(
  at: Date,
  effectiveFrom: string | null,
  effectiveTo: string | null,
): boolean {
  const from = effectiveFrom ? new Date(effectiveFrom) : null;
  const to = effectiveTo ? new Date(effectiveTo) : null;

  if (from && from > at) {
    return false;
  }

  if (to && to <= at) {
    return false;
  }

  return true;
}

function pickLatest<T extends { effectiveFrom: string | null }>(entries: T[]): T | null {
  if (entries.length === 0) {
    return null;
  }

  return entries
    .slice()
    .sort((a, b) => {
      const aTime = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : Number.MIN_SAFE_INTEGER;
      const bTime = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : Number.MIN_SAFE_INTEGER;
      return bTime - aTime;
    })[0] ?? null;
}

function calculatePreview(input: {
  product: Product;
  startAt: Date | null;
  endAt: Date | null;
  targetCountryId: string | null;
  targetCityId: string | null;
  impressions: number;
  adGeoPricings: GeoPricing[];
}): PreviewState {
  const at = input.startAt ?? new Date();

  const activeGeo = input.adGeoPricings.filter(
    (entry) => entry.isActive && isEffective(at, entry.effectiveFrom, entry.effectiveTo),
  );
  let geoMultiplier = 1;
  let geoSource: 'city' | 'country' | 'default' = 'default';

  if (input.targetCityId) {
    const selected = pickLatest(activeGeo.filter((entry) => entry.cityId === input.targetCityId));
    if (selected) {
      geoMultiplier = selected.multiplier;
      geoSource = 'city';
    }
  } else if (input.targetCountryId) {
    geoMultiplier = DEFAULT_COUNTRY_MULTIPLIER;
    const selected = pickLatest(
      activeGeo.filter((entry) => entry.countryId === input.targetCountryId && entry.cityId == null),
    );
    if (selected) {
      geoMultiplier = selected.multiplier;
      geoSource = 'country';
    }
  }

  const shared = input.product.basePrice * geoMultiplier;

  if (input.product.billingUnit === 'IMPRESSION_1000') {
    const billableQuantity = Math.max(0, input.impressions) / 1000;
    return {
      amount: roundToCurrency(billableQuantity * shared),
      billableDays: null,
      billableQuantity,
      currency: input.product.currency,
      basePrice: input.product.basePrice,
      geoMultiplier,
      geoSource,
    };
  }

  const billableDays = calculateBillableDays(input.startAt, input.endAt);
  const unitDays = resolveDurationUnitSizeDays(input.product.billingUnit);
  const billableQuantity = Math.max(1, Math.ceil(billableDays / unitDays));

  return {
    amount: roundToCurrency(shared * billableQuantity),
    billableDays,
    billableQuantity,
    currency: input.product.currency,
    basePrice: input.product.basePrice,
    geoMultiplier,
    geoSource,
  };
}

export function CampaignPricingLivePreview({
  formId,
  adProducts,
  adGeoPricings,
  savedEstimatedAmount = null,
  savedProposedAmount = null,
}: CampaignPricingLivePreviewProps) {
  const [formState, setFormState] = useState({
    adProductId: '',
    startAt: '',
    endAt: '',
    maxImpressions: '',
    proposedAmount: '',
    targetCountryId: '',
    targetCityId: '',
  });

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const readFormState = () => {
      const data = new FormData(form);
      setFormState({
        adProductId: String(data.get('adProductId') ?? ''),
        startAt: String(data.get('startAt') ?? ''),
        endAt: String(data.get('endAt') ?? ''),
        maxImpressions: String(data.get('maxImpressions') ?? ''),
        proposedAmount: String(data.get('proposedAmount') ?? ''),
        targetCountryId: String(data.get('targetCountryId') ?? ''),
        targetCityId: String(data.get('targetCityId') ?? ''),
      });
    };

    readFormState();
    form.addEventListener('input', readFormState);
    form.addEventListener('change', readFormState);

    return () => {
      form.removeEventListener('input', readFormState);
      form.removeEventListener('change', readFormState);
    };
  }, [formId]);

  const preview = useMemo(() => {
    const product = adProducts.find((candidate) => candidate.id === formState.adProductId);
    if (!product) {
      return null;
    }

    const startAt = formState.startAt ? new Date(`${formState.startAt}T00:00:00`) : null;
    const endAt = formState.endAt ? new Date(`${formState.endAt}T00:00:00`) : null;
    const impressions = Number.isNaN(Number(formState.maxImpressions))
      ? 0
      : Math.max(0, Number(formState.maxImpressions));

    return calculatePreview({
      product,
      startAt,
      endAt,
      targetCountryId: formState.targetCountryId || null,
      targetCityId: formState.targetCityId || null,
      impressions,
      adGeoPricings,
    });
  }, [adGeoPricings, adProducts, formState]);

  const proposedAmount = Number.isNaN(Number(formState.proposedAmount))
    ? null
    : formState.proposedAmount.trim() === ''
      ? null
      : Number(formState.proposedAmount);
  const proposalDelta = preview && proposedAmount != null ? proposedAmount - preview.amount : null;

  return (
    <div className="space-y-2 rounded-lg border border-[#e8e8e8] bg-[#fafafa] px-3 py-3 text-xs text-[#666] sm:col-span-2">
      <p className="font-semibold text-[#444]">예상 견적 미리보기</p>
      {preview ? (
        <>
          <p className="text-sm font-semibold text-[#3c1e1e]">
            총액: {preview.currency} {preview.amount.toFixed(2)}
          </p>
          <p>
            기준가: {preview.currency} {preview.basePrice.toFixed(2)} · 지역계수 {preview.geoMultiplier.toFixed(4)} ({preview.geoSource})
          </p>
          <p>
            과금 수량: {preview.billableQuantity.toFixed(4)}
            {preview.billableDays != null ? ` · 과금 일수: ${preview.billableDays}일` : ' · 노출 기준 과금'}
          </p>
          <p>
            저장된 이전 견적:{' '}
            {savedEstimatedAmount != null ? `${preview.currency} ${savedEstimatedAmount.toFixed(2)}` : '-'}
          </p>
          <p>
            현재 입력 제안 금액:{' '}
            {proposedAmount != null ? `${preview.currency} ${proposedAmount.toFixed(2)}` : '-'}
            {proposalDelta != null ? ` · 자동 계산 대비 ${proposalDelta.toFixed(2)}` : ''}
          </p>
          <p>
            저장된 이전 제안 금액:{' '}
            {savedProposedAmount != null ? `${preview.currency} ${savedProposedAmount.toFixed(2)}` : '-'}
          </p>
        </>
      ) : (
        <p>상품을 선택하면 입력값 기준 예상 견적이 표시됩니다.</p>
      )}
    </div>
  );
}
