'use client';

import Image from 'next/image';
import { useMemo, useRef, useState, useTransition } from 'react';
import {
  validateClientImageFiles,
  uploadImagesToCloudinary,
  MAX_CLIENT_IMAGES,
} from '@/lib/upload/cloudinary-client';
import { INVALID_KAKAO_OPEN_LINK_MESSAGE_KO } from '@/lib/kakao-open-link';
import { KakaoOpenLinkInput } from '@/components/ui/kakao-open-link-input';

const SALE_CATEGORY_TYPE = 'SALE';
const DISABLED_STATE_CLASSES = 'disabled:cursor-not-allowed disabled:opacity-60';
const ALL_COUNTRIES_VALUE = '__ALL_COUNTRIES__';
const ALL_CITIES_VALUE = '__ALL_CITIES__';

type CountryOption = {
  id: string;
  label: string;
};

type CityOption = {
  id: string;
  label: string;
  countryId: string | null;
};

type CategoryOption = {
  id: string;
  label: string;
  type: string;
  visibilityMode: 'NORMAL' | 'ALWAYS_INCLUDED' | 'HIDDEN';
  postTagOptions: {
    id: string;
    label: string;
    slug: string;
    color: string | null;
  }[];
};

type AllowedTarget = {
  countryId: string | null;
  cityId: string | null;
  categoryId: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type PostFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  countries: CountryOption[];
  cities: CityOption[];
  categories: CategoryOption[];
  allowedTargets: AllowedTarget[];
  defaultCountryId: string | null;
  defaultCityId: string | null;
  submitLabel: string;
  defaultValues?: {
    postId?: string;
    title?: string | null;
    body?: string;
    countryId?: string | null;
    cityId?: string | null;
      categoryId?: string;
      postTagOptionIds?: string[];
      price?: string | null;
      contactUrl?: string | null;
    images?: {
      id: string;
      url: string;
    }[];
  };
  errorMessage?: string;
};

function toCountryValue(countryId: string | null) {
  return countryId ?? ALL_COUNTRIES_VALUE;
}

function toCityValue(cityId: string | null) {
  return cityId ?? ALL_CITIES_VALUE;
}

function fromCountryValue(value: string) {
  return value === ALL_COUNTRIES_VALUE ? null : value;
}

function fromCityValue(value: string) {
  return value === ALL_CITIES_VALUE ? null : value;
}

function buildCountryOptions(
  countries: CountryOption[],
  allowedTargets: AllowedTarget[],
): SelectOption[] {
  const allowedCountryIds = new Set(allowedTargets.map((target) => target.countryId));
  const options: SelectOption[] = [];

  if (allowedCountryIds.has(null)) {
    options.push({ value: ALL_COUNTRIES_VALUE, label: '전체 국가' });
  }

  for (const country of countries) {
    if (allowedCountryIds.has(country.id)) {
      options.push({ value: country.id, label: country.label });
    }
  }

  return options;
}

function buildCityOptions(
  cities: CityOption[],
  allowedTargets: AllowedTarget[],
  countryId: string | null,
): SelectOption[] {
  const matchingTargets = allowedTargets.filter((target) => target.countryId === countryId);
  const allowedCityIds = new Set(matchingTargets.map((target) => target.cityId));
  const options: SelectOption[] = [];

  if (allowedCityIds.has(null)) {
    options.push({ value: ALL_CITIES_VALUE, label: '전체 도시' });
  }

  for (const city of cities) {
    if (city.countryId === countryId && allowedCityIds.has(city.id)) {
      options.push({ value: city.id, label: city.label });
    }
  }

  return options;
}

function buildCategoryOptions(
  categories: CategoryOption[],
  allowedTargets: AllowedTarget[],
  countryId: string | null,
  cityId: string | null,
): CategoryOption[] {
  const allowedCategoryIds = new Set(
    allowedTargets
      .filter((target) => target.countryId === countryId && target.cityId === cityId)
      .map((target) => target.categoryId),
  );

  return categories.filter((category) => allowedCategoryIds.has(category.id));
}

function getCategoryLabel(category: CategoryOption) {
  if (category.visibilityMode === 'ALWAYS_INCLUDED') {
    return `${category.label} · 항상 포함`;
  }

  if (category.visibilityMode === 'HIDDEN') {
    return `${category.label} · 숨김`;
  }

  return category.label;
}

// Keep the current selection when it is still valid for the filtered option set.
function getValidatedSelection<T extends { value?: string; id?: string }>(
  options: T[],
  currentValue: string,
  fallbackValue: string,
) {
  const optionExists = options.some((option) => (option.value ?? option.id) === currentValue);
  if (optionExists) {
    return currentValue;
  }

  if (options.length === 0) {
    return fallbackValue;
  }

  return options[0].value ?? options[0].id ?? fallbackValue;
}

export function PostForm({
  action,
  countries,
  cities,
  categories,
  allowedTargets,
  defaultCountryId,
  defaultCityId,
  submitLabel,
  defaultValues,
  errorMessage,
}: PostFormProps) {
  const [isPending, startTransition] = useTransition();
  const [countryValue, setCountryValue] = useState(
    toCountryValue(defaultValues?.countryId ?? defaultCountryId),
  );
  const [cityValue, setCityValue] = useState(toCityValue(defaultValues?.cityId ?? defaultCityId));
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? '');
  const [selectedPostTagOptionIds, setSelectedPostTagOptionIds] = useState<string[]>(
    defaultValues?.postTagOptionIds ?? [],
  );
  const [deletedImageIds, setDeletedImageIds] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitting = isPending || isUploading;

  const countryOptions = useMemo(
    () => buildCountryOptions(countries, allowedTargets),
    [countries, allowedTargets],
  );
  const selectedCountryValue = getValidatedSelection(
    countryOptions,
    countryValue,
    ALL_COUNTRIES_VALUE,
  );
  const selectedCountryId = fromCountryValue(selectedCountryValue);
  const cityOptions = useMemo(
    () => buildCityOptions(cities, allowedTargets, selectedCountryId),
    [cities, allowedTargets, selectedCountryId],
  );
  const selectedCityValue = getValidatedSelection(
    cityOptions,
    cityValue,
    ALL_CITIES_VALUE,
  );
  const selectedCityId = fromCityValue(selectedCityValue);
  const categoryOptions = useMemo(
    () => buildCategoryOptions(categories, allowedTargets, selectedCountryId, selectedCityId),
    [categories, allowedTargets, selectedCountryId, selectedCityId],
  );
  const selectedCategoryId = getValidatedSelection(categoryOptions, categoryId, '');

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );
  const selectedCategoryTagOptions = selectedCategory?.postTagOptions ?? [];
  const selectedCategoryTagOptionIdSet = useMemo(
    () => new Set(selectedCategoryTagOptions.map((option) => option.id)),
    [selectedCategoryTagOptions],
  );
  const validatedSelectedPostTagOptionIds = selectedPostTagOptionIds.filter((optionId) =>
    selectedCategoryTagOptionIdSet.has(optionId),
  );

  function togglePostTagOption(optionId: string) {
    setSelectedPostTagOptionIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    );
  }

  function toggleDeleteImage(id: string) {
    setDeletedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    setUploadError(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      setSelectedFiles([]);
      return;
    }
    const validation = validateClientImageFiles(files);
    if (!validation.ok) {
      setFileError(validation.message);
      setSelectedFiles([]);
      e.target.value = '';
    } else {
      setSelectedFiles(files);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    setUploadError(null);

    const formData = new FormData(e.currentTarget);
    formData.delete('images');

    if (selectedFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploaded = await uploadImagesToCloudinary(selectedFiles);
        formData.append('uploadedImages', JSON.stringify(uploaded));
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : '이미지 업로드 중 오류가 발생했어요.',
        );
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    startTransition(() => action(formData));
  }

  const shouldShowPrice = selectedCategory?.type === SALE_CATEGORY_TYPE;
  const showCountrySelector = countryOptions.length > 1;
  const showCitySelector = cityOptions.length > 1;
  const selectedCountryLabel =
    countryOptions.find((option) => option.value === selectedCountryValue)?.label ?? '전체 국가';
  const selectedCityLabel =
    cityOptions.find((option) => option.value === selectedCityValue)?.label ?? '전체 도시';

  const submitButtonLabel = isUploading
    ? '이미지 업로드 중...'
    : isPending
      ? '처리 중...'
      : submitLabel;

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      aria-label="게시글 작성 양식"
      className="space-y-4 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm"
    >
      {defaultValues?.postId ? (
        <input type="hidden" name="postId" value={defaultValues.postId} />
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {uploadError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">
          제목 추가하기
        </label>
        <input
          id="title"
          name="title"
          defaultValue={defaultValues?.title ?? ''}
          placeholder="제목은 선택사항이에요"
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          maxLength={100}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="body" className="text-sm font-medium">
          무슨 이야기를 나누고 싶나요?
        </label>
        <textarea
          id="body"
          name="body"
          defaultValue={defaultValues?.body ?? ''}
          required
          rows={8}
          placeholder="마크다운으로 작성할 수 있어요."
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
        />
        <p className="text-xs text-[#888]">
          본문은 마크다운으로 저장되며, 게시글 보기 화면에서 서식이 적용됩니다.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">국가</label>
        {showCountrySelector ? (
          <select
            value={selectedCountryValue}
            onChange={(event) => setCountryValue(event.target.value)}
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          >
            {countryOptions.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-lg border border-[#e8e8e8] bg-[#f9f9f9] px-3 py-2 text-sm">
            {selectedCountryLabel}
          </div>
        )}
      </div>

      <input type="hidden" name="countryId" value={selectedCountryId ?? ''} />

      <div className="space-y-1">
        <label className="text-sm font-medium">도시</label>
        {showCitySelector ? (
          <select
            value={selectedCityValue}
            onChange={(event) => setCityValue(event.target.value)}
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          >
            {cityOptions.map((city) => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-lg border border-[#e8e8e8] bg-[#f9f9f9] px-3 py-2 text-sm">
            {selectedCityLabel}
          </div>
        )}
      </div>

      <input type="hidden" name="cityId" value={selectedCityId ?? ''} />

      <div className="space-y-1">
        <label htmlFor="categoryId" className="text-sm font-medium">
          카테고리 선택
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={selectedCategoryId}
          onChange={(event) => {
            const nextCategoryId = event.target.value;
            setCategoryId(nextCategoryId);
            const nextCategory = categories.find((category) => category.id === nextCategoryId);
            const validIds = new Set((nextCategory?.postTagOptions ?? []).map((option) => option.id));
            setSelectedPostTagOptionIds((prev) => prev.filter((id) => validIds.has(id)));
          }}
          required
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
        >
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {getCategoryLabel(category)}
            </option>
          ))}
        </select>
      </div>

      {selectedCategoryTagOptions.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">태그 (선택, 0개 이상)</p>
          <div className="flex flex-wrap gap-2 rounded-lg border border-[#e8e8e8] p-3">
            {selectedCategoryTagOptions.map((option) => {
              const checked = validatedSelectedPostTagOptionIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                    checked
                      ? 'border-[#fee500] bg-[#fffde7]'
                      : 'border-[#e8e8e8] hover:border-[#fee500] hover:bg-[#fffde7]'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="postTagOptionIds"
                    value={option.id}
                    checked={checked}
                    onChange={() => togglePostTagOption(option.id)}
                    className="accent-[#fee500]"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <input type="hidden" name="postTagOptionIds" value="" />
      )}

      {shouldShowPrice ? (
        <div className="space-y-1">
          <label htmlFor="price" className="text-sm font-medium">
            가격
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={defaultValues?.price ?? ''}
            required
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
        </div>
      ) : (
        <input type="hidden" name="price" value="" />
      )}

      <div className="space-y-1">
        <label htmlFor="contactUrl" className="text-sm font-medium">
          연락처 링크 (선택)
        </label>
        <KakaoOpenLinkInput
          id="contactUrl"
          name="contactUrl"
          defaultValue={defaultValues?.contactUrl ?? ''}
          placeholder="https://open.kakao.com/o/..."
          invalidMessage={INVALID_KAKAO_OPEN_LINK_MESSAGE_KO}
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
        />
        <p className="text-xs text-[#888]">
          이 글에서만 사용할 카카오 오픈채팅 링크를 입력하세요. 비워두면 프로필 링크가 사용됩니다.
        </p>
      </div>

      {defaultValues?.images?.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">기존 사진</p>
          <div className="grid grid-cols-3 gap-2">
            {defaultValues.images.map((image, index) => (
              <div
                key={image.id}
                className={`relative h-24 overflow-hidden rounded-lg border ${
                  deletedImageIds.has(image.id)
                    ? 'border-red-400 opacity-40'
                    : 'border-[#e8e8e8]'
                }`}
              >
                <Image
                  src={image.url}
                  alt={`기존 게시글 이미지 ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 33vw, 120px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => toggleDeleteImage(image.id)}
                  aria-label={deletedImageIds.has(image.id) ? '삭제 취소' : '사진 삭제'}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  {deletedImageIds.has(image.id) ? '↩' : '×'}
                </button>
              </div>
            ))}
          </div>
          {Array.from(deletedImageIds).map((id) => (
            <input key={id} type="hidden" name="deleteImageIds" value={id} />
          ))}
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="images" className="text-sm font-medium">
          사진 추가
        </label>
        <input
          ref={fileInputRef}
          id="images"
          name="images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#fee500] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#3c1e1e]"
        />
        {fileError ? (
          <p className="text-xs text-red-600">{fileError}</p>
        ) : (
          <p className="text-xs text-[#888]">
            최대 {MAX_CLIENT_IMAGES}장, 각 10MB 이하 이미지를 올릴 수 있어요.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !!fileError || categoryOptions.length === 0}
        aria-busy={isSubmitting}
        className={`w-full rounded-xl bg-[#fee500] px-4 py-3 text-base font-bold text-[#3c1e1e] hover:bg-[#f5db00] ${DISABLED_STATE_CLASSES}`}
      >
        {submitButtonLabel}
      </button>
    </form>
  );
}
