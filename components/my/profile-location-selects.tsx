'use client';

import { useState } from 'react';

type CountryOption = {
  id: string;
  name: string;
};

type CityOption = {
  id: string;
  name: string;
  countryId: string | null;
};

type ProfileLocationSelectsProps = {
  countries: CountryOption[];
  cities: CityOption[];
  defaultCountryId: string | null;
  defaultCityId: string | null;
  disabled?: boolean;
  showCooldownNote?: boolean;
};

const SELECT_CLASS =
  'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40 disabled:cursor-not-allowed disabled:opacity-50';

export function ProfileLocationSelects({
  countries,
  cities,
  defaultCountryId,
  defaultCityId,
  disabled,
  showCooldownNote,
}: ProfileLocationSelectsProps) {
  const [selectedCountryId, setSelectedCountryId] = useState(defaultCountryId ?? '');
  const [selectedCityId, setSelectedCityId] = useState(defaultCityId ?? '');
  const isCityDisabled = Boolean(disabled);

  const filteredCities = selectedCountryId
    ? cities.filter((c) => c.countryId === selectedCountryId)
    : [];

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextCountryId = e.target.value;
    setSelectedCountryId(nextCountryId);

    if (!selectedCityId) {
      return;
    }

    const isCityInNextCountry = cities.some(
      (city) => city.id === selectedCityId && city.countryId === nextCountryId,
    );

    if (!isCityInNextCountry) {
      setSelectedCityId('');
    }
  }

  return (
    <>
      <div className="space-y-1">
        <label htmlFor="countryId" className="text-sm font-medium">
          서비스 국가
        </label>
        <select
          id="countryId"
          name="countryId"
          value={selectedCountryId}
          onChange={handleCountryChange}
          disabled={disabled}
          className={SELECT_CLASS}
        >
          <option value="">국가를 선택해 주세요.</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#888]">
          국가를 바꾸면 기본 지역이 초기화되고 다시 선택해야 합니다.
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor="cityId" className="text-sm font-medium">
          기본 지역
        </label>
        <select
          id="cityId"
          name="cityId"
          value={selectedCityId}
          onChange={(e) => setSelectedCityId(e.target.value)}
          disabled={isCityDisabled}
          className={SELECT_CLASS}
        >
          <option value="">선택 안 함</option>
          {filteredCities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#888]">
          글쓰기는 여기에서 설정한 지역으로만 등록돼요.{' '}
          {showCooldownNote ? '기본 지역은 7일마다 한 번만 변경할 수 있어요.' : null}
        </p>
      </div>
    </>
  );
}
