import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { detectCountryFromNames } from '@/lib/location/country-detection';

type ReverseGeoResponse = {
  address?: {
    country?: string;
    country_code?: string;
  };
};

const NOMINATIM_MIN_INTERVAL_MS = 1_000;
const COUNTRY_CACHE_TTL_MS = 5 * 60 * 1_000;
let lastNominatimRequestAt = 0;
const countryDetectionCache = new Map<
  string,
  { country: { id: string; name: string } | null; expiresAt: number }
>();

function parseCoordinate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  const lat = parseCoordinate(request.nextUrl.searchParams.get('lat'));
  const lng = parseCoordinate(request.nextUrl.searchParams.get('lng'));

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ country: null }, { status: 400 });
  }

  const cacheKey = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = countryDetectionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ country: cached.country });
  }

  if (Date.now() - lastNominatimRequestAt < NOMINATIM_MIN_INTERVAL_MS) {
    return NextResponse.json({ country: null });
  }

  try {
    lastNominatimRequestAt = Date.now();
    const reverseGeoResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&zoom=3&addressdetails=1&accept-language=en`,
      {
        headers: {
          'User-Agent': 'kakao-community-location-detector/1.0',
        },
        cache: 'no-store',
      },
    );

    if (!reverseGeoResponse.ok) {
      return NextResponse.json({ country: null });
    }

    const reverseGeoData = (await reverseGeoResponse.json()) as ReverseGeoResponse;
    const countryName = reverseGeoData.address?.country ?? null;
    const countryCode = reverseGeoData.address?.country_code ?? null;

    if (!countryName && !countryCode) {
      return NextResponse.json({ country: null });
    }

    const countries = await prisma.country.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    });

    const detectedCountry = detectCountryFromNames(countries, countryName, countryCode);
    const countryPayload = detectedCountry
      ? {
          id: detectedCountry.id,
          name: detectedCountry.name,
        }
      : null;

    countryDetectionCache.set(cacheKey, {
      country: countryPayload,
      expiresAt: Date.now() + COUNTRY_CACHE_TTL_MS,
    });

    return NextResponse.json({ country: countryPayload });
  } catch {
    return NextResponse.json({ country: null });
  }
}
