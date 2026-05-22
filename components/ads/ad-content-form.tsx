'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  uploadImagesToCloudinary,
  validateClientImageFiles,
} from '@/lib/upload/cloudinary-client';

type Advertiser = {
  id: string;
  name: string;
};

type NegotiatedProposal = {
  id: string;
  title: string;
  advertiserId: string;
  advertiserName: string;
};

type AdContentCreateFormProps = {
  advertisers: Advertiser[];
  negotiatedProposals: NegotiatedProposal[];
  createAction: (formData: FormData) => Promise<void>;
  inputClass: string;
  selectClass: string;
  submitLabel?: string;
  pendingLabel?: string;
};

export function AdContentCreateForm({
  advertisers,
  negotiatedProposals,
  createAction,
  inputClass,
  selectClass,
}: AdContentCreateFormProps) {
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState('');
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProposals = selectedAdvertiserId
    ? negotiatedProposals.filter((p) => p.advertiserId === selectedAdvertiserId)
    : negotiatedProposals;

  const isSubmitting = isUploading || isPending;

  useEffect(
    () => () => {
      if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
      }
    },
    [thumbnailPreviewUrl],
  );

  function handleThumbnailChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedThumbnailFile(null);
      setThumbnailPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    const validation = validateClientImageFiles([file]);
    if (!validation.ok) {
      setUploadError(validation.message);
      event.target.value = '';
      return;
    }

    setSelectedThumbnailFile(file);
    setThumbnailPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    formData.delete('thumbnailFile');
    setUploadError(null);

    if (selectedThumbnailFile) {
      setIsUploading(true);
      try {
        const [uploaded] = await uploadImagesToCloudinary([selectedThumbnailFile]);
        formData.set('thumbnailUrl', uploaded?.url ?? '');
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? error.message
            : '썸네일 이미지 업로드 중 오류가 발생했습니다.',
        );
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    } else {
      formData.set('thumbnailUrl', '');
    }

    startTransition(() => {
      void createAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span className="text-[#555]">광고주</span>
        <select
          name="advertiserId"
          className={selectClass}
          value={selectedAdvertiserId}
          onChange={(e) => setSelectedAdvertiserId(e.target.value)}
        >
          <option value="">광고주 선택</option>
          {advertisers.map((advertiser) => (
            <option key={advertiser.id} value={advertiser.id}>
              {advertiser.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-[#555]">연결 제안 (선택 — Negotiated 상태만 표시)</span>
        <select name="proposalId" className={selectClass}>
          <option value="">제안 연결 안 함</option>
          {filteredProposals.map((proposal) => (
            <option key={proposal.id} value={proposal.id}>
              {proposal.title} — {proposal.advertiserName}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm sm:col-span-2">
        <span className="text-[#555]">제목</span>
        <input type="text" name="title" className={inputClass} />
      </label>
      <label className="space-y-1 text-sm sm:col-span-2">
        <span className="text-[#555]">본문 <span className="text-red-500">*</span></span>
        <textarea name="body" rows={4} required className={inputClass} />
      </label>
      <div className="space-y-2 text-sm sm:col-span-2">
        <span className="text-[#555]">썸네일 이미지</span>
        <input type="hidden" name="thumbnailUrl" value="" />
        <input
          ref={fileInputRef}
          type="file"
          name="thumbnailFile"
          accept="image/*"
          onChange={handleThumbnailChange}
          className="sr-only"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm hover:bg-[#f9f9f9]"
          >
            이미지 선택
          </button>
          {selectedThumbnailFile ? (
            <span className="text-xs text-[#666]">{selectedThumbnailFile.name}</span>
          ) : (
            <span className="text-xs text-[#888]">선택된 이미지가 없습니다.</span>
          )}
        </div>
        {thumbnailPreviewUrl ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-[#e8e8e8]">
            <Image
              src={thumbnailPreviewUrl}
              alt="선택한 썸네일 미리보기"
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
        ) : null}
        {uploadError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {uploadError}
          </p>
        ) : null}
      </div>
      <label className="space-y-1 text-sm">
        <span className="text-[#555]">랜딩 URL</span>
        <input type="url" name="landingUrl" className={inputClass} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-[#555]">
          노출 작성자명{' '}
          <span className="text-xs text-[#888]">(빈칸이면 광고주 이름이 표시됩니다)</span>
        </span>
        <input type="text" name="displayName" className={inputClass} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-[#555]">카테고리명</span>
        <input type="text" name="categoryName" className={inputClass} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-[#555]">도시명</span>
        <input type="text" name="cityName" className={inputClass} />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? '이미지 업로드 중...' : isPending ? '등록 중...' : '콘텐츠 등록'}
        </button>
      </div>
    </form>
  );
}
