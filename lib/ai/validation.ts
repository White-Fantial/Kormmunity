import type { CategoryType } from '@prisma/client';

import { assertNoSpamText } from '@/lib/abuse/guard';

const MAX_TITLE_LENGTH = 100;
const MAX_POST_BODY_LENGTH = 4_000;
const MAX_COMMENT_BODY_LENGTH = 500;

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasExcessiveRepetition(value: string) {
  if (/(.)\1{8,}/u.test(value)) {
    return true;
  }

  const words = value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 80);
  if (words.length < 6) {
    return false;
  }

  let repeatCount = 1;
  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) {
      repeatCount += 1;
      if (repeatCount >= 6) {
        return true;
      }
      continue;
    }
    repeatCount = 1;
  }

  return false;
}

function looksIncompatibleWithCategory(categoryType: CategoryType, text: string) {
  const normalized = text.toLowerCase();

  if (categoryType === 'SALE' && /무료|나눔/.test(normalized)) {
    return true;
  }

  if (categoryType === 'GIVEAWAY' && /판매|가격|nz\$|달러|원/.test(normalized)) {
    return true;
  }

  return false;
}

export function validateGeneratedPostDraft(
  input: { title: unknown; body: unknown },
  categoryType: CategoryType,
) {
  const title = normalizeText(input.title);
  const body = normalizeText(input.body);

  if (!title) {
    throw new Error('생성된 제목이 비어 있어요.');
  }

  if (!body) {
    throw new Error('생성된 본문이 비어 있어요.');
  }

  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`생성된 제목이 너무 길어요. (${MAX_TITLE_LENGTH}자 초과)`);
  }

  if (body.length > MAX_POST_BODY_LENGTH) {
    throw new Error(`생성된 본문이 너무 길어요. (${MAX_POST_BODY_LENGTH}자 초과)`);
  }

  if (looksIncompatibleWithCategory(categoryType, `${title}\n${body}`)) {
    throw new Error('카테고리 성격과 맞지 않는 내용이 감지되었어요.');
  }

  if (hasExcessiveRepetition(`${title}\n${body}`)) {
    throw new Error('반복 표현이 과도해 자동 초안을 사용할 수 없어요.');
  }

  assertNoSpamText(`${title}\n${body}`);

  return { title, body };
}

export function validateGeneratedCommentBody(value: unknown) {
  const body = normalizeText(value);
  if (!body) {
    throw new Error('생성된 댓글이 비어 있어요.');
  }

  if (body.length > MAX_COMMENT_BODY_LENGTH) {
    throw new Error(`생성된 댓글이 너무 길어요. (${MAX_COMMENT_BODY_LENGTH}자 초과)`);
  }

  if (hasExcessiveRepetition(body)) {
    throw new Error('반복 표현이 과도한 댓글은 사용할 수 없어요.');
  }

  assertNoSpamText(body);
  return body;
}
