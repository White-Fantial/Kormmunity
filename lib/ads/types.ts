export type AdLayout = 'TEXT' | 'THUMBNAIL' | 'IMAGE' | 'FEATURED';
export type AdSize = 'S' | 'M' | 'L';
export type AdPlacementType = 'TOP_FIXED' | 'FEED_INLINE';
export type AdCampaignStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'REQUEST_CHANGES'
  | 'ACTIVE'
  | 'PAUSED'
  | 'ENDED'
  | 'CANCELLED';
export type AdBillingStatus = 'DRAFT' | 'ESTIMATED' | 'INVOICED' | 'PAID' | 'WAIVED' | 'CANCELLED';
export type AdBillingUnit = 'DAY' | 'WEEK' | 'MONTH' | 'IMPRESSION_1000';

export const AD_LAYOUT_LABELS: Record<AdLayout, string> = {
  TEXT: '텍스트형',
  THUMBNAIL: '썸네일형',
  IMAGE: '이미지형',
  FEATURED: '강조형',
};

export const AD_SIZE_LABELS: Record<AdSize, string> = {
  S: '소형 (S)',
  M: '중형 (M)',
  L: '대형 (L)',
};

export const AD_PLACEMENT_TYPE_LABELS: Record<AdPlacementType, string> = {
  TOP_FIXED: '상단 고정',
  FEED_INLINE: '피드 중간 삽입',
};

export const AD_CAMPAIGN_STATUS_LABELS: Record<AdCampaignStatus, string> = {
  DRAFT: '초안',
  REVIEW: '리뷰 대기',
  APPROVED: '승인됨',
  REQUEST_CHANGES: '수정 요청',
  ACTIVE: '집행 중',
  PAUSED: '일시정지',
  ENDED: '종료',
  CANCELLED: '취소',
};

export const AD_BILLING_STATUS_LABELS: Record<AdBillingStatus, string> = {
  DRAFT: '초안',
  ESTIMATED: '견적 완료',
  INVOICED: '청구 완료',
  PAID: '입금 완료',
  WAIVED: '면제',
  CANCELLED: '취소',
};

export const AD_BILLING_UNIT_LABELS: Record<AdBillingUnit, string> = {
  DAY: '일',
  WEEK: '주',
  MONTH: '월',
  IMPRESSION_1000: '1,000회 노출',
};

export type AdFeedItem = {
  id: string;
  title: string | null;
  bodyPreview: string;
  href: string;
  createdAt: string;
  thumbnailUrl: string | null;
  category: { name: string; type?: string; color?: string | null } | null;
  city: { name: string } | null;
  author: {
    displayName: string;
    profileImageUrl: string | null;
    isOperator: boolean;
  } | null;
  isAd: true;
  adCampaignId: string;
  adContentId: string;
  adLayout: AdLayout;
  adSize: AdSize;
  adPlacementType: AdPlacementType;
};
