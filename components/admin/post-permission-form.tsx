'use client';

import { useMemo, useState } from 'react';

import { FormSubmitButton } from '@/components/ui/form-submit-button';

type UserOption = {
  id: string;
  displayName: string;
};

type RoleOption = {
  value: string;
  label: string;
};

type CountryOption = {
  id: string;
  name: string;
};

type CityOption = {
  id: string;
  name: string;
  countryId: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
  visibilityMode: 'NORMAL' | 'ALWAYS_INCLUDED' | 'HIDDEN';
};

type PostPermissionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  users: UserOption[];
  roles: RoleOption[];
  countries: CountryOption[];
  cities: CityOption[];
  categories: CategoryOption[];
};

function getCategoryLabel(category: CategoryOption) {
  if (category.visibilityMode === 'ALWAYS_INCLUDED') {
    return `${category.name} · 항상 포함`;
  }

  if (category.visibilityMode === 'HIDDEN') {
    return `${category.name} · 숨김`;
  }

  return category.name;
}

export function PostPermissionForm({
  action,
  users,
  roles,
  countries,
  cities,
  categories,
}: PostPermissionFormProps) {
  const [subjectType, setSubjectType] = useState<'USER' | 'ROLE'>('USER');
  const [userQuery, setUserQuery] = useState('');
  const [countryId, setCountryId] = useState('');
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) => user.displayName.toLowerCase().includes(normalizedQuery));
  }, [userQuery, users]);

  const cityOptions = useMemo(() => {
    if (!countryId) {
      return [];
    }

    return cities.filter((city) => city.countryId === countryId);
  }, [cities, countryId]);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="subjectType" className="text-xs font-medium text-[#555]">
          권한 주체
        </label>
        <select
          id="subjectType"
          name="subjectType"
          value={subjectType}
          onChange={(event) => setSubjectType(event.target.value as 'USER' | 'ROLE')}
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
        >
          <option value="USER">사용자</option>
          <option value="ROLE">역할</option>
        </select>
      </div>

      {subjectType === 'USER' ? (
        <div className="space-y-2">
          <label htmlFor="userQuery" className="text-xs font-medium text-[#555]">
            사용자 검색
          </label>
          <input
            id="userQuery"
            type="search"
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
            placeholder="닉네임 검색"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
          />
          <select
            name="userId"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
          >
            {filteredUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
          <input type="hidden" name="role" value="" />
        </div>
      ) : (
        <div className="space-y-1">
          <label htmlFor="role" className="text-xs font-medium text-[#555]">
            역할 선택
          </label>
          <select
            id="role"
            name="role"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <input type="hidden" name="userId" value="" />
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="countryId" className="text-xs font-medium text-[#555]">
          국가
        </label>
        <select
          id="countryId"
          name="countryId"
          value={countryId}
          onChange={(event) => {
            setCountryId(event.target.value);
            setCityId('');
          }}
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
        >
          <option value="">모든 국가</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
        {!countryId ? (
          <p className="rounded-md bg-[#fff7d6] px-2 py-1 text-xs text-[#7a6000]">
            모든 국가는 와일드카드 권한입니다.
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="cityId" className="text-xs font-medium text-[#555]">
          도시
        </label>
        <select
          id="cityId"
          name="cityId"
          value={cityId}
          onChange={(event) => setCityId(event.target.value)}
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
        >
          <option value="">모든 도시</option>
          {cityOptions.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        {!cityId ? (
          <p className="rounded-md bg-[#fff7d6] px-2 py-1 text-xs text-[#7a6000]">
            모든 도시는 와일드카드 권한입니다.
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="categoryId" className="text-xs font-medium text-[#555]">
          카테고리
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
        >
          <option value="">모든 카테고리</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {getCategoryLabel(category)}
            </option>
          ))}
        </select>
        {!categoryId ? (
          <p className="rounded-md bg-[#fff7d6] px-2 py-1 text-xs text-[#7a6000]">
            모든 카테고리는 와일드카드 권한입니다.
          </p>
        ) : null}
      </div>

      <FormSubmitButton
        idleLabel="권한 추가"
        pendingLabel="저장 중..."
        className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
      />
    </form>
  );
}
