import { SPAM_KEYWORDS } from '@/lib/abuse/config';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  message: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalBuckets = globalThis as typeof globalThis & {
  __kakaoRateLimitBuckets?: Map<string, RateLimitBucket>;
};

function getBuckets() {
  if (!globalBuckets.__kakaoRateLimitBuckets) {
    globalBuckets.__kakaoRateLimitBuckets = new Map<string, RateLimitBucket>();
  }

  return globalBuckets.__kakaoRateLimitBuckets;
}

export function enforceRateLimit({
  key,
  limit,
  windowMs,
  message,
}: RateLimitOptions) {
  const now = Date.now();
  const buckets = getBuckets();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (current.count >= limit) {
    throw new Error(message);
  }

  current.count += 1;
  buckets.set(key, current);
}

const URL_REGEX = /https?:\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi;
const MAX_REPEATED_CHAR_COUNT = 8;
const REPEATED_CHAR_REGEX = new RegExp(`(.)\\1{${MAX_REPEATED_CHAR_COUNT},}`);

export function assertNoSpamText(text: string) {
  const normalized = text.trim().toLowerCase();

  if (normalized.length === 0) {
    return;
  }

  const urlMatches = normalized.match(URL_REGEX);

  if (urlMatches && urlMatches.length >= 3) {
    throw new Error('링크가 너무 많아요. 링크 수를 줄이고 다시 시도해 주세요.');
  }

  if (REPEATED_CHAR_REGEX.test(normalized)) {
    throw new Error('같은 문자를 너무 많이 반복했어요. 내용을 수정하고 다시 시도해 주세요.');
  }

  if (SPAM_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    throw new Error('검토가 필요한 표현이 포함됐어요. 내용을 수정하고 다시 시도해 주세요.');
  }
}
