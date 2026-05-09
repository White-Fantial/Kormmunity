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

const URL_REGEX = /https?:\/\/[^\s]+/gi;
const REPEATED_CHAR_REGEX = /(.)\1{8,}/;

export function assertNoSpamText(text: string, message: string) {
  const normalized = text.trim().toLowerCase();

  if (normalized.length === 0) {
    return;
  }

  const urlMatches = normalized.match(URL_REGEX);

  if (urlMatches && urlMatches.length >= 3) {
    throw new Error(message);
  }

  if (REPEATED_CHAR_REGEX.test(normalized)) {
    throw new Error(message);
  }

  if (SPAM_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    throw new Error(message);
  }
}
