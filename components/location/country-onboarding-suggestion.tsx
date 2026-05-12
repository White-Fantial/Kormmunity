'use client';

import { useEffect, useState } from 'react';

import { buildCountryDetectionUrl } from '@/lib/location/browser-country';

type DetectedCountry = {
  id: string;
  name: string;
};

type CountryOnboardingSuggestionProps = {
  action: (formData: FormData) => void | Promise<void>;
  returnTo: string;
};

export function CountryOnboardingSuggestion({
  action,
  returnTo,
}: CountryOnboardingSuggestionProps) {
  const [detectedCountry, setDetectedCountry] = useState<DetectedCountry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelled) {
          return;
        }

        try {
          const response = await fetch(
            buildCountryDetectionUrl(
              position.coords.latitude,
              position.coords.longitude,
            ),
            { cache: 'no-store' },
          );

          if (!response.ok) {
            return;
          }

          const payload = (await response.json()) as { country: DetectedCountry | null };
          if (!cancelled) {
            setDetectedCountry(payload.country);
          }
        } catch {
          if (!cancelled) {
            setError('위치 기반 국가 추천을 불러오지 못했어요.');
          }
        }
      },
      () => {
        if (!cancelled) {
          setError('위치 권한이 없어 직접 국가를 선택해 주세요.');
        }
      },
      {
        timeout: 10_000,
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || !detectedCountry) {
    return error ? (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>
    ) : null;
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#fee500] bg-[#fffde7] p-4">
      <p className="text-sm text-[#3c1e1e]">
        현재 위치가 <strong>{detectedCountry.name}</strong>(으)로 보여요. 서비스 국가로 설정할까요?
      </p>
      <div className="flex gap-2">
        <form action={action}>
          <input type="hidden" name="countryId" value={detectedCountry.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="rounded-lg bg-[#fee500] px-3 py-2 text-sm font-semibold text-[#3c1e1e] hover:bg-[#f5db00]"
          >
            {detectedCountry.name}로 설정
          </button>
        </form>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg border border-[#dcdcdc] bg-white px-3 py-2 text-sm text-[#555] hover:bg-[#f9f9f9]"
        >
          직접 선택
        </button>
      </div>
    </div>
  );
}
