export function buildCountryDetectionUrl(latitude: number, longitude: number) {
  return `/api/location/country?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`;
}
