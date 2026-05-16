'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  validateClientImageFiles,
  uploadImagesToCloudinary,
  MAX_CLIENT_IMAGES,
} from '@/lib/upload/cloudinary-client';
import { INVALID_KAKAO_OPEN_LINK_MESSAGE_KO } from '@/lib/kakao-open-link';
import { KakaoOpenLinkInput } from '@/components/ui/kakao-open-link-input';
import type { AuthorAccountOption } from '@/lib/posts/author-account-options';

const SALE_CATEGORY_TYPE = 'SALE';
const DISABLED_STATE_CLASSES = 'disabled:cursor-not-allowed disabled:opacity-60';
const ALL_COUNTRIES_VALUE = '__ALL_COUNTRIES__';
const ALL_CITIES_VALUE = '__ALL_CITIES__';
const FIELD_CLASS =
  'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';

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
  requireCommentBeforeContactDefault: boolean;
  contactSectionDefaultExpanded: boolean;
  postTagOptions: {
    id: string;
    label: string;
    slug: string;
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
  canSelectAuthorAccount?: boolean;
  authorAccountOptions?: AuthorAccountOption[];
  defaultAuthorUserIdOverride?: string | null;
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
    requireCommentBeforeContact?: boolean;
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
  canSelectAuthorAccount,
  authorAccountOptions,
  defaultAuthorUserIdOverride,
  defaultValues,
  errorMessage,
}: PostFormProps) {
  const router = useRouter();
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
  const [commentGateCategoryId, setCommentGateCategoryId] = useState<string | null>(
    defaultValues?.categoryId ?? null,
  );
  const [commentGateOverride, setCommentGateOverride] = useState<boolean | null>(
    defaultValues?.postId ? (defaultValues.requireCommentBeforeContact ?? false) : null,
  );
  const [authorUserIdOverride, setAuthorUserIdOverride] = useState(defaultAuthorUserIdOverride ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isSubmitting = isPending || isUploading;
  const authorAccountOptionsById = useMemo(
    () => new Map((authorAccountOptions ?? []).map((authorAccount) => [authorAccount.id, authorAccount])),
    [authorAccountOptions],
  );

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
  const selectedCategoryTagOptions = useMemo(
    () => selectedCategory?.postTagOptions ?? [],
    [selectedCategory],
  );
  const selectedCategoryTagOptionIdSet = useMemo(
    () => new Set(selectedCategoryTagOptions.map((option) => option.id)),
    [selectedCategoryTagOptions],
  );
  const validatedSelectedPostTagOptionIds = selectedPostTagOptionIds.filter((id) =>
    selectedCategoryTagOptionIdSet.has(id),
  );

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

  function handleRemoveSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
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
  const requireCommentBeforeContact =
    commentGateCategoryId === selectedCategoryId && commentGateOverride !== null
      ? commentGateOverride
      : defaultValues?.postId && selectedCategoryId === defaultValues.categoryId
        ? (defaultValues.requireCommentBeforeContact ?? false)
        : (selectedCategory?.requireCommentBeforeContactDefault ?? false);
  const [contactSectionExpandedOverride, setContactSectionExpandedOverride] = useState<
    boolean | null
  >(null);
  const isContactSectionExpanded =
    contactSectionExpandedOverride ?? (selectedCategory?.contactSectionDefaultExpanded ?? false);
  const selectedFilePreviews = useMemo(
    () =>
      selectedFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [selectedFiles],
  );
  const activeExistingImageCount =
    defaultValues?.images?.filter((image) => !deletedImageIds.has(image.id)).length ?? 0;
  const imageTotalCount = activeExistingImageCount + selectedFiles.length;
  const cancelHref = defaultValues?.postId ? `/posts/${defaultValues.postId}` : '/posts';

  useEffect(() => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 220)}px`;
  }, [defaultValues?.body]);

  useEffect(
    () => () => {
      selectedFilePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [selectedFilePreviews],
  );

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      aria-label="게시글 작성 양식"
      className="mx-auto w-full max-w-[820px] space-y-4 rounded-2xl border border-[#e8e8e8] bg-white p-4 shadow-sm sm:p-6"
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

      <div className="space-y-3 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
        <p className="text-sm font-semibold text-[#333]">게시 위치</p>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-xs font-medium text-[#666]">국가</label>
            {showCountrySelector ? (
              <select
                value={selectedCountryValue}
                onChange={(event) => setCountryValue(event.target.value)}
                className={FIELD_CLASS}
              >
                {countryOptions.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className={`${FIELD_CLASS} bg-[#f5f5f5]`}>{selectedCountryLabel}</div>
            )}
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-xs font-medium text-[#666]">도시</label>
            {showCitySelector ? (
              <select
                value={selectedCityValue}
                onChange={(event) => setCityValue(event.target.value)}
                className={FIELD_CLASS}
              >
                {cityOptions.map((city) => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className={`${FIELD_CLASS} bg-[#f5f5f5]`}>{selectedCityLabel}</div>
            )}
          </div>
          <div className="min-w-[140px] flex-[1.2] space-y-1">
            <label htmlFor="categoryId" className="text-xs font-medium text-[#666]">
              카테고리
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={selectedCategoryId}
              onChange={(event) => {
                const nextCategoryId = event.target.value;
                setCategoryId(nextCategoryId);
                setContactSectionExpandedOverride(null);
                setCommentGateCategoryId(nextCategoryId);
                setCommentGateOverride(
                  defaultValues?.postId && nextCategoryId === defaultValues.categoryId
                    ? (defaultValues.requireCommentBeforeContact ?? false)
                    : null,
                );
                const nextCategory = categories.find((category) => category.id === nextCategoryId);
                const validIds = new Set((nextCategory?.postTagOptions ?? []).map((option) => option.id));
                setSelectedPostTagOptionIds((prev) => prev.filter((id) => validIds.has(id)));
              }}
              required
              className={FIELD_CLASS}
            >
              {categoryOptions.length === 0 ? (
                <option value="">선택 가능한 카테고리가 없어요</option>
              ) : null}
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-[#888]">
          {selectedCountryLabel} › {selectedCityLabel} › {selectedCategory?.label ?? '카테고리 선택'}
        </p>
      </div>

      <input type="hidden" name="countryId" value={selectedCountryId ?? ''} />
      <input type="hidden" name="cityId" value={selectedCityId ?? ''} />

      {canSelectAuthorAccount ? (
        <div className="space-y-1">
          <label htmlFor="authorUserIdOverride" className="text-sm font-medium text-[#555]">
            작성 계정
          </label>
          <select
            id="authorUserIdOverride"
            name="authorUserIdOverride"
            value={authorUserIdOverride}
            onChange={(e) => {
              const nextAuthorUserIdOverride = e.target.value;
              setAuthorUserIdOverride(nextAuthorUserIdOverride);

              if (!nextAuthorUserIdOverride) {
                setCountryValue(toCountryValue(defaultCountryId));
                setCityValue(toCityValue(defaultCityId));
                return;
              }

              const selectedAuthor = authorAccountOptionsById.get(nextAuthorUserIdOverride);
              if (!selectedAuthor) {
                return;
              }

              setCountryValue(toCountryValue(selectedAuthor.countryId));
              setCityValue(toCityValue(selectedAuthor.cityId));
            }}
            className={FIELD_CLASS}
          >
            <option value="">내 계정으로 작성</option>
            {(authorAccountOptions ?? []).map((authorAccount) => (
              <option key={authorAccount.id} value={authorAccount.id}>
                [{authorAccount.accountType}] {authorAccount.displayName}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#888]">
            관리자/코디네이터는 운영 계정으로 작성할 수 있어요.
          </p>
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium text-[#555]">
          제목 (선택)
        </label>
        <input
          id="title"
          name="title"
          defaultValue={defaultValues?.title ?? ''}
          placeholder="짧은 제목을 추가할 수 있어요"
          className={`${FIELD_CLASS} py-2`}
          maxLength={100}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="body" className="text-sm font-semibold">
          본문
        </label>
        <textarea
          id="body"
          name="body"
          ref={bodyTextareaRef}
          defaultValue={defaultValues?.body ?? ''}
          required
          rows={10}
          placeholder="무슨 이야기를 나누고 싶나요?"
          onInput={(event) => {
            event.currentTarget.style.height = 'auto';
            event.currentTarget.style.height = `${Math.max(event.currentTarget.scrollHeight, 220)}px`;
          }}
          className={`${FIELD_CLASS} min-h-[220px] resize-none leading-relaxed`}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">사진</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-[#e0e0e0] bg-white px-4 py-2 text-sm font-medium hover:border-[#fee500] hover:bg-[#fffde7]"
          >
            + 사진 추가
          </button>
        </div>
        <input
          ref={fileInputRef}
          id="images"
          name="images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="sr-only"
        />
        {defaultValues?.images?.length || selectedFilePreviews.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {defaultValues?.images?.map((image, index) => (
              <div
                key={image.id}
                className={`relative aspect-square overflow-hidden rounded-lg border ${
                  deletedImageIds.has(image.id) ? 'border-red-400 opacity-40' : 'border-[#e8e8e8]'
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
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  {deletedImageIds.has(image.id) ? '↩' : '×'}
                </button>
              </div>
            ))}
            {selectedFilePreviews.map((preview, index) => (
              <div key={preview.url} className="relative aspect-square overflow-hidden rounded-lg border border-[#e8e8e8]">
                <Image
                  src={preview.url}
                  alt={`새 이미지 ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 33vw, 120px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSelectedFile(index)}
                  aria-label="새 사진 삭제"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#d7d7d7] bg-white px-4 py-8 text-center text-sm text-[#777]">
            사진을 추가하면 미리보기가 여기에 표시돼요.
          </div>
        )}
        {Array.from(deletedImageIds).map((id) => (
          <input key={id} type="hidden" name="deleteImageIds" value={id} />
        ))}
        {fileError ? <p className="text-xs text-red-600">{fileError}</p> : null}
        <p className="text-xs text-[#888]">
          최대 {MAX_CLIENT_IMAGES}장, 각 10MB 이하 · 현재 {imageTotalCount}장 선택됨
        </p>
      </div>

      {selectedCategoryTagOptions.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold">추천 태그</p>
          <div
            role="group"
            aria-label="태그 선택"
            className="flex flex-wrap gap-2 rounded-lg border border-[#e8e8e8] p-3"
          >
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
                    onChange={() =>
                      setSelectedPostTagOptionIds((prev) =>
                        prev.includes(option.id)
                          ? prev.filter((id) => id !== option.id)
                          : [...prev, option.id],
                      )
                    }
                    className="accent-[#fee500]"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
            {validatedSelectedPostTagOptionIds.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedPostTagOptionIds([])}
                aria-label="태그 선택 해제"
                className="rounded-full border border-[#e8e8e8] px-3 py-1.5 text-sm text-[#666] hover:border-[#fee500] hover:bg-[#fffde7] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
              >
                전체 해제
              </button>
            ) : null}
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

      <div className="space-y-2 rounded-xl border border-[#e8e8e8] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">연락 방법 (선택)</p>
          <button
            type="button"
            onClick={() =>
              setContactSectionExpandedOverride((prev) => {
                const current =
                  prev ?? (selectedCategory?.contactSectionDefaultExpanded ?? false);
                return !current;
              })
            }
            className="text-xs font-medium text-[#666] hover:text-[#222]"
          >
            {isContactSectionExpanded ? '▲ 접기' : '▼ 펼치기'}
          </button>
        </div>
        <input
          type="hidden"
          name="requireCommentBeforeContact"
          value={requireCommentBeforeContact ? 'true' : 'false'}
        />
        {!isContactSectionExpanded ? (
          <p className="text-xs text-[#888]">필요할 때 펼쳐서 연락 링크와 옵션을 설정할 수 있어요.</p>
        ) : null}
        <div className={isContactSectionExpanded ? 'space-y-3 pt-1' : 'hidden'}>
          <div className="space-y-1">
            <label htmlFor="contactUrl" className="text-sm font-medium">
              카카오 오픈채팅 링크
            </label>
            <KakaoOpenLinkInput
              id="contactUrl"
              name="contactUrl"
              defaultValue={defaultValues?.contactUrl ?? ''}
              placeholder="https://open.kakao.com/o/..."
              invalidMessage={INVALID_KAKAO_OPEN_LINK_MESSAGE_KO}
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-[#f0f0f0] p-3">
            <div className="space-y-1">
              <label htmlFor="requireCommentBeforeContact" className="text-sm font-medium">
                댓글 작성 후 연락 허용
              </label>
              <p className="text-xs text-[#888]">
                사용자가 댓글을 남긴 뒤 카카오 연락이 가능합니다.
              </p>
            </div>
            <input
              id="requireCommentBeforeContact"
              type="checkbox"
              checked={requireCommentBeforeContact}
              onChange={(event) => {
                setCommentGateCategoryId(selectedCategoryId);
                setCommentGateOverride(event.target.checked);
              }}
              className="mt-1 h-5 w-5 rounded border-[#d8d8d8] accent-[#fee500]"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push(cancelHref)}
          className="flex-1 rounded-xl border border-[#e8e8e8] bg-white px-4 py-3 text-base font-semibold text-[#555] hover:bg-[#f9f9f9]"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !!fileError || categoryOptions.length === 0}
          aria-busy={isSubmitting}
          className={`flex-1 rounded-xl bg-[#fee500] px-4 py-3 text-base font-bold text-[#3c1e1e] hover:bg-[#f5db00] ${DISABLED_STATE_CLASSES}`}
        >
          {submitButtonLabel}
        </button>
      </div>
    </form>
  );
}
