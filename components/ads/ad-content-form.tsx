'use client';

import { useState } from 'react';

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

  const filteredProposals = selectedAdvertiserId
    ? negotiatedProposals.filter((p) => p.advertiserId === selectedAdvertiserId)
    : negotiatedProposals;

  return (
    <form action={createAction} className="grid gap-3 sm:grid-cols-2">
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
      <label className="space-y-1 text-sm">
        <span className="text-[#555]">썸네일 URL</span>
        <input type="url" name="thumbnailUrl" className={inputClass} />
      </label>
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
          className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          콘텐츠 등록
        </button>
      </div>
    </form>
  );
}
