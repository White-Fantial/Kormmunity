'use server';

import { requireUser } from '@/lib/auth/session';
import { generatePostDraft } from '@/lib/ai/generate-post-draft';
import { getManagedAuthorContext } from '@/lib/ai/managed-author';
import { prisma } from '@/lib/db/prisma';
import { canUseAutoContentGeneration } from '@/lib/permissions';

type GeneratePostDraftInput = {
  authorUserIdOverride: string;
  countryId: string | null;
  cityId: string | null;
  categoryId: string;
  postTagOptionIds: string[];
  currentTitle: string;
  currentBody: string;
  additionalInstructions: string;
};

export type GeneratePostDraftResult =
  | { ok: true; title: string; body: string; message: string }
  | { ok: false; message: string };

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeIdArray(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  );
}

async function logAiGenerationAction(
  actorId: string,
  actionType: string,
  reason: string,
) {
  await prisma.moderationAction.create({
    data: {
      actorId,
      targetType: 'AI_GENERATION',
      targetId: actorId,
      actionType,
      reason,
    },
  });
}

export async function generatePostDraftAction(
  rawInput: GeneratePostDraftInput,
): Promise<GeneratePostDraftResult> {
  const user = await requireUser();
  if (!canUseAutoContentGeneration(user)) {
    return { ok: false, message: '자동 생성 기능을 사용할 권한이 없습니다.' };
  }

  const authorUserIdOverride = normalizeText(rawInput.authorUserIdOverride);
  const categoryId = normalizeText(rawInput.categoryId);
  const countryId = normalizeText(rawInput.countryId) || null;
  const cityId = normalizeText(rawInput.cityId) || null;
  const postTagOptionIds = normalizeIdArray(rawInput.postTagOptionIds);
  const currentTitle = normalizeText(rawInput.currentTitle);
  const currentBody = normalizeText(rawInput.currentBody);
  const additionalInstructions = normalizeText(rawInput.additionalInstructions);

  if (!authorUserIdOverride) {
    return { ok: false, message: '자동 생성을 위해 운영 계정을 선택해 주세요.' };
  }

  if (!categoryId) {
    return { ok: false, message: '카테고리를 선택해 주세요.' };
  }

  const [author, category, country, city, selectedTags] = await Promise.all([
    getManagedAuthorContext(authorUserIdOverride),
    prisma.category.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true, name: true, type: true },
    }),
    countryId
      ? prisma.country.findFirst({
          where: { id: countryId, isActive: true },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    cityId
      ? prisma.city.findFirst({
          where: { id: cityId, isActive: true },
          select: { id: true, name: true, countryId: true },
        })
      : Promise.resolve(null),
    postTagOptionIds.length > 0
      ? prisma.postTagOption.findMany({
          where: { id: { in: postTagOptionIds }, isActive: true },
          select: { id: true, label: true, categoryType: true },
        })
      : Promise.resolve([]),
  ]);

  if (!author) {
    return { ok: false, message: '선택한 운영 계정을 사용할 수 없어요.' };
  }

  if (!category) {
    return { ok: false, message: '카테고리를 올바르게 선택해 주세요.' };
  }

  if (cityId && (!city || city.countryId !== countryId)) {
    return { ok: false, message: '지역 정보를 확인해 주세요.' };
  }

  if (postTagOptionIds.length > 0) {
    const selectedTagIds = new Set(selectedTags.map((tag) => tag.id));
    const allCategoryMatched = selectedTags.every((tag) => tag.categoryType === category.type);
    if (selectedTagIds.size !== postTagOptionIds.length || !allCategoryMatched) {
      return { ok: false, message: '선택한 태그 정보가 카테고리와 일치하지 않아요.' };
    }
  }

  const reasonContext = JSON.stringify({
    authorUserIdOverride,
    categoryId,
    countryId,
    cityId,
    tagCount: selectedTags.length,
  });

  try {
    const draft = await generatePostDraft({
      author,
      categoryName: category.name,
      categoryType: category.type,
      countryName: country?.name ?? null,
      cityName: city?.name ?? null,
      tags: selectedTags.map((tag) => tag.label),
      currentTitle,
      currentBody,
      additionalInstructions,
    });

    await logAiGenerationAction(user.id, 'POST_DRAFT_GENERATED', reasonContext);

    return {
      ok: true,
      title: draft.title,
      body: draft.body,
      message: '자동 초안이 생성되었어요. 확인 후 수정해서 올려주세요.',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    await logAiGenerationAction(
      user.id,
      'POST_DRAFT_GENERATION_FAILED',
      JSON.stringify({ ...JSON.parse(reasonContext), errorMessage }),
    );
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : '자동 초안 생성에 실패했어요. 잠시 후 다시 시도해 주세요.',
    };
  }
}
