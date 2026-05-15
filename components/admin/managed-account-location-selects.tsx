'use client';

import { useState } from 'react';

type CountryOption = { id: string; name: string };
type CityOption = { id: string; name: string; countryId: string };

type Props = {
  countries: CountryOption[];
  cities: CityOption[];
  defaultCountryId?: string | null;
  defaultCityId?: string | null;
};

export function ManagedAccountLocationSelects({ countries, cities, defaultCountryId, defaultCityId }: Props) {
  const [selectedCountryId, setSelectedCountryId] = useState(defaultCountryId ?? '');
  const [selectedCityId, setSelectedCityId] = useState(defaultCityId ?? '');

  const filteredCities = selectedCountryId ? cities.filter((c) => c.countryId === selectedCountryId) : [];

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCountryId(e.target.value);
    setSelectedCityId('');
  }

  return (
    <>
      <select
        name="countryId"
        required
        value={selectedCountryId}
        onChange={handleCountryChange}
        className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
      >
        <option value="" disabled>
          국가 선택 (필수)
        </option>
        {countries.map((country) => (
          <option key={country.id} value={country.id}>
            {country.name}
          </option>
        ))}
      </select>
      <select
        name="cityId"
        value={selectedCityId}
        onChange={(e) => setSelectedCityId(e.target.value)}
        disabled={!selectedCountryId}
        className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none disabled:bg-[#f5f5f5] disabled:text-[#aaa]"
      >
        <option value="">도시 미지정</option>
        {filteredCities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
    </>
  );
}
