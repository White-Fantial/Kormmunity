'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { SALE_CATEGORY_SLUG } from '@/lib/posts/constants';

type Option = {
  id: string;
  label: string;
};

type CategoryOption = Option & {
  slug: string;
};

type PostFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: CategoryOption[];
  cities: Option[];
  submitLabel: string;
  defaultValues?: {
    postId?: string;
    title?: string | null;
    body?: string;
    categoryId?: string;
    cityId?: string;
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
  submitLabel,
  defaultValues,
  errorMessage,
}: PostFormProps) {
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? '');

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );

  const shouldShowPrice = selectedCategory?.slug === SALE_CATEGORY_SLUG;

  return (
    <form
      action={action}
      encType="multipart/form-data"
      aria-label="게시글 작성 양식"
      className="space-y-4 rounded-lg border bg-white p-4"
    >
      {defaultValues?.postId ? (
        <input type="hidden" name="postId" value={defaultValues.postId} />
      ) : null}

      {errorMessage ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">
          {errorMessage}
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
          className="w-full rounded-md border px-3 py-2"
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
          className="w-full rounded-md border px-3 py-2"
        />
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
          className="w-full rounded-md border px-3 py-2"
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
        <label htmlFor="cityId" className="text-sm font-medium">
          지역 선택
        </label>
        <select
          id="cityId"
          name="cityId"
          defaultValue={defaultValues?.cityId ?? ''}
          required
          className="w-full rounded-md border px-3 py-2"
        >
          <option value="">지역을 선택해 주세요.</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.label}
            </option>
          ))}
        </select>
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
            className="w-full rounded-md border px-3 py-2"
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
          className="w-full rounded-md border px-3 py-2"
        />
        <p className="text-xs text-zinc-500">
          이 글에서만 사용할 카카오 오픈채팅 링크를 입력하세요. 비워두면 프로필 링크가 사용됩니다.
        </p>
      </div>

      {defaultValues?.images?.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">기존 사진</p>
          <div className="grid grid-cols-3 gap-2">
            {defaultValues.images.map((image, index) => (
              <div key={image.id} className="relative h-24 overflow-hidden rounded-md border">
                <Image
                  src={image.url}
                  alt={`기존 게시글 이미지 ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="images" className="text-sm font-medium">
          사진 추가
        </label>
        <input
          id="images"
          name="images"
          type="file"
          accept="image/*"
          multiple
          className="w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2"
        />
        <p className="text-xs text-zinc-500">
          최대 5장, 각 8MB 이하 이미지를 올릴 수 있어요.
        </p>
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-black px-4 py-2 text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
