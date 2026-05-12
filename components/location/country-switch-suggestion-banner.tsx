'use client';

import { useEffect, useMemo, useState } from 'react';

import { buildCountryDetectionUrl } from '@/lib/location/browser-country';
import { GEOLOCATION_TIMEOUT_MS } from '@/lib/location/constants';

type CountryInfo = {
  id: string;
  name: string;
};

type CountrySwitchSuggestionBannerProps = {
  selectedCountry: CountryInfo | null;
  dismissedCountryId: string | null;
  dismissedUntil: string | null;
  nowIso: string;
  switchAction: (formData: FormData) => void | Promise<void>;
  dismissAction: (formData: FormData) => void | Promise<void>;
};

type DetectionResponse = {
  country: CountryInfo | null;
};

export function CountrySwitchSuggestionBanner({
  selectedCountry,
  dismissedCountryId,
  dismissedUntil,
  nowIso,
  switchAction,
  dismissAction,
}: CountrySwitchSuggestionBannerProps) {
  const [detectedCountry, setDetectedCountry] = useState<CountryInfo | null>(null);
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const [geolocationUnavailable, setGeolocationUnavailable] = useState(false);
  const isDismissedBySnooze = useMemo(() => {
    if (!detectedCountry || !dismissedCountryId || dismissedCountryId !== detectedCountry.id || !dismissedUntil) {
      return false;
    }

    return dismissedUntil > nowIso;
  }, [detectedCountry, dismissedCountryId, dismissedUntil, nowIso]);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation || !selectedCountry) {
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

          const payload = (await response.json()) as DetectionResponse;
          if (!cancelled) {
            setDetectedCountry(payload.country);
          }
        } catch {
          // no-op
        }
      },
      () => setGeolocationUnavailable(true),
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );

    return () => {
      cancelled = true;
    };
  }, [selectedCountry]);

  if (!selectedCountry || !detectedCountry || dismissedLocally || geolocationUnavailable) {
    return null;
  }

  if (detectedCountry.id === selectedCountry.id || isDismissedBySnooze) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#fee500] bg-[#fffde7] p-3 text-sm text-[#3c1e1e]">
      <p>
        현재 위치가 <strong>{detectedCountry.name}</strong>(으)로 보여요. 서비스 국가를 변경할까요?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <form action={switchAction}>
          <input type="hidden" name="suggestedCountryId" value={detectedCountry.id} />
          <button
            type="submit"
            className="rounded-lg bg-[#fee500] px-3 py-2 font-semibold hover:bg-[#f5db00]"
          >
            {detectedCountry.name}로 변경
          </button>
        </form>
        <form action={dismissAction}>
          <input type="hidden" name="suggestedCountryId" value={detectedCountry.id} />
          <button
            type="submit"
            onClick={() => setDismissedLocally(true)}
            className="rounded-lg border border-[#dcdcdc] bg-white px-3 py-2 text-[#555] hover:bg-[#f9f9f9]"
          >
            {selectedCountry.name} 유지
          </button>
        </form>
      </div>
    </div>
  );
}
