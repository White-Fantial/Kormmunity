'use client';

import Image from 'next/image';
import { useRef, useMemo, useState, useTransition } from 'react';
import {
  validateClientImageFiles,
  uploadImagesToCloudinary,
  MAX_CLIENT_IMAGES,
} from '@/lib/upload/cloudinary-client';

const SALE_CATEGORY_TYPE = 'SALE';
const DISABLED_STATE_CLASSES = 'disabled:cursor-not-allowed disabled:opacity-60';

type Option = {
  id: string;
  label: string;
};

type CategoryOption = Option & {
  type: string;
  ignoreCity: boolean;
  supportsAllCities: boolean;
};

type PostFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: CategoryOption[];
  cities: { id: string; name: string }[];
  cityLabel: string;
  defaultCityId: string | null;
  canSelectAllCities: boolean;
  submitLabel: string;
  defaultValues?: {
    postId?: string;
    title?: string | null;
    body?: string;
    categoryId?: string;
    cityId?: string | null;
    price?: string | null;
    contactUrl?: string | null;
    images?: {
      id: string;
      url: string;
    }[];
  };
  errorMessage?: string;
};

export function PostForm({
  action,
  categories,
  cities,
  cityLabel,
  defaultCityId,
  canSelectAllCities,
  submitLabel,
  defaultValues,
  errorMessage,
}: PostFormProps) {
  const [isPending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? '');
  const [selectedCityId, setSelectedCityId] = useState(defaultValues?.cityId ?? '');
  const [deletedImageIds, setDeletedImageIds] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitting = isPending || isUploading;

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
    // Remove the raw file entries – images are uploaded directly to Cloudinary
    // from the browser so no file bytes should pass through the Next.js server.
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

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );

  const shouldShowPrice = selectedCategory?.type === SALE_CATEGORY_TYPE;
  const isCityIgnored = selectedCategory?.ignoreCity ?? false;
  // Show a city selector only when the category permits all-city posts AND the user
  // has at least coordinator privileges (coordinators choose the target city per post).
  const showCitySelector =
    !isCityIgnored && (selectedCategory?.supportsAllCities ?? false) && canSelectAllCities;

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
        <label htmlFor="categoryId" className="text-sm font-medium">
          카테고리 선택
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
        >
          <option value="">카테고리를 선택해 주세요.</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-medium">지역</span>
        {isCityIgnored ? (
          <>
            <div className="rounded-lg border border-[#e8e8e8] bg-[#f9f9f9] px-3 py-2 text-sm text-[#888]">
              전 지역 공개
            </div>
            <input type="hidden" name="cityId" value="" />
          </>
        ) : showCitySelector ? (
          <select
            name="cityId"
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          >
            <option value="">전 지역</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        ) : (
          <>
            <div className="rounded-lg border border-[#e8e8e8] bg-[#f9f9f9] px-3 py-2 text-sm">{cityLabel}</div>
            <input type="hidden" name="cityId" value={defaultCityId ?? ''} />
          </>
        )}
      </div>

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
        <input
          id="contactUrl"
          name="contactUrl"
          type="url"
          defaultValue={defaultValues?.contactUrl ?? ''}
          placeholder="https://open.kakao.com/o/..."
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
        disabled={isSubmitting || !!fileError}
        aria-busy={isSubmitting}
        className={`w-full rounded-xl bg-[#fee500] px-4 py-3 text-base font-bold text-[#3c1e1e] hover:bg-[#f5db00] ${DISABLED_STATE_CLASSES}`}
      >
        {submitButtonLabel}
      </button>
    </form>
  );
}
