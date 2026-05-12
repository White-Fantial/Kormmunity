'use server';

import { CategoryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { trackServerEvent } from '@/lib/analytics/server';
import { assertNoSpamText, enforceRateLimit } from '@/lib/abuse/guard';
import { prisma } from '@/lib/db/prisma';
import { notifySearchAlertsForPost } from '@/lib/kakao/message';
import {
  canCreatePost,
  canDeletePost,
  canEditPost,
  isPostScopeValid,
  canReportPost,
} from '@/lib/permissions';
import {
  MAX_UPLOAD_IMAGE_COUNT,
  deleteImageFromCloudinary,
  type PreUploadedImage,
} from '@/lib/upload/cloudinary';
import { getProfileCityRequiredHref, hasValidProfileCity } from '@/lib/posts/profile-city';

const CREATE_POST_RATE_LIMIT = {
  limit: 5,
  windowMs: 60_000,
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePrice(rawPrice: string) {
  if (!rawPrice) {
    return { value: null as Decimal | null, invalid: false };
  }

  const parsed = Number(rawPrice);
  if (Number.isNaN(parsed) || parsed < 0.01) {
    return { value: null as Decimal | null, invalid: true };
  }

  return { value: new Decimal(rawPrice), invalid: false };
}

function getUploadedImages(formData: FormData): PreUploadedImage[] {
  const raw = formData.get('uploadedImages');
  if (typeof raw !== 'string' || !raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (item): item is PreUploadedImage =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).url === 'string' &&
      // Accept only Cloudinary-hosted URLs as a basic server-side safety check.
      ((item as Record<string, unknown>).url as string).startsWith('https://res.cloudinary.com/'),
  );
}

async function validateCategoryPriceAndTag(
  categoryId: string,
  rawPrice: string,
  rawPostTagOptionId: string,
) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      type: true,
      visibilityMode: true,
      postTagOptions: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, isDefault: true },
      },
    },
  });

  if (!category) {
    return { ok: false as const, message: '카테고리를 선택해 주세요.' };
  }

  const { value: price, invalid } = parsePrice(rawPrice);
  const isSaleCategory = category.type === CategoryType.SALE;

  if (invalid) {
    return { ok: false as const, message: '가격을 올바르게 입력해 주세요.' };
  }

  if (isSaleCategory && !price) {
    return { ok: false as const, message: '판매글은 가격을 입력해 주세요.' };
  }

  const selectedTagOptionId = rawPostTagOptionId || null;
  if (selectedTagOptionId) {
    const matched = category.postTagOptions.some((option) => option.id === selectedTagOptionId);
    if (!matched) {
      return { ok: false as const, message: '카테고리에 맞는 활성 태그를 선택해 주세요.' };
    }
  }

  const defaultTagOptionId =
    category.postTagOptions.find((option) => option.isDefault)?.id ??
    category.postTagOptions[0]?.id ??
    null;

  return {
    ok: true as const,
    category,
    price,
    postTagOptionId: selectedTagOptionId ?? defaultTagOptionId,
  };
}

async function resolvePostScope(
  rawCountryId: string,
  rawCityId: string,
  errorRedirectPath: string,
): Promise<{ countryId: string | null; cityId: string | null }> {
  const countryId = rawCountryId || null;
  const cityId = rawCityId || null;

  if (!isPostScopeValid(countryId, cityId)) {
    redirect(`${errorRedirectPath}?error=${encodeURIComponent('도시를 선택하려면 국가를 먼저 선택해 주세요.')}`);
  }

  const [country, city] = await Promise.all([
    countryId
      ? prisma.country.findFirst({
          where: { id: countryId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    cityId
      ? prisma.city.findFirst({
          where: { id: cityId, isActive: true },
          select: { id: true, countryId: true },
        })
      : Promise.resolve(null),
  ]);

  if (countryId && !country) {
    redirect(`${errorRedirectPath}?error=${encodeURIComponent('국가를 올바르게 선택해 주세요.')}`);
  }

  if (cityId && (!city || city.countryId !== countryId)) {
    redirect(`${errorRedirectPath}?error=${encodeURIComponent('도시를 올바르게 선택해 주세요.')}`);
  }

  return {
    countryId,
    cityId,
  };
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();
  const hasCity = await hasValidProfileCity(user.id);

  if (!hasCity) {
    redirect(getProfileCityRequiredHref('/posts/new'));
  }

  const title = normalizeText(formData.get('title'));
  const body = normalizeText(formData.get('body'));
  const categoryId = normalizeText(formData.get('categoryId'));
  const rawCountryId = normalizeText(formData.get('countryId'));
  const rawCityId = normalizeText(formData.get('cityId'));
  const rawPrice = normalizeText(formData.get('price'));
  const rawPostTagOptionId = normalizeText(formData.get('postTagOptionId'));
  const contactUrl = normalizeText(formData.get('contactUrl')) || null;
  const uploadedImages = getUploadedImages(formData);

  try {
    enforceRateLimit({
      key: `create-post:${user.id}`,
      limit: CREATE_POST_RATE_LIMIT.limit,
      windowMs: CREATE_POST_RATE_LIMIT.windowMs,
      message: '요청이 너무 빨라요. 잠시 후 다시 시도해 주세요.',
    });

    assertNoSpamText(
      [title, body, contactUrl].filter(Boolean).join(' '),
      '광고/도배로 보이는 내용은 등록할 수 없어요.',
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '게시글을 등록할 수 없어요. 잠시 후 다시 시도해 주세요.';
    redirect(`/posts/new?error=${encodeURIComponent(message)}`);
  }

  if (!body) {
    redirect('/posts/new?error=글 내용을 입력해 주세요.');
  }

  if (!categoryId) {
    redirect('/posts/new?error=카테고리를 선택해 주세요.');
  }

  const categoryResult = await validateCategoryPriceAndTag(categoryId, rawPrice, rawPostTagOptionId);

  if (!categoryResult.ok) {
    redirect(`/posts/new?error=${encodeURIComponent(categoryResult.message)}`);
  }

  const { countryId: resolvedCountryId, cityId: resolvedCityId } = await resolvePostScope(
    rawCountryId,
    rawCityId,
    '/posts/new',
  );

  const canWriteToScope = await canCreatePost(
    user,
    resolvedCountryId,
    resolvedCityId,
    categoryResult.category.id,
  );
  if (!canWriteToScope) {
    redirect('/posts/new?error=이 카테고리/지역에 글을 작성할 권한이 없습니다.');
  }

  const isPostInSaleCategory = categoryResult.category.type === CategoryType.SALE;

  if (uploadedImages.length > MAX_UPLOAD_IMAGE_COUNT) {
    redirect(`/posts/new?error=${encodeURIComponent(`이미지는 최대 ${MAX_UPLOAD_IMAGE_COUNT}장까지 업로드할 수 있어요.`)}`);
  }

  const postId = await prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        authorId: user.id,
        title: title || null,
        body,
        categoryId,
        cityId: resolvedCityId,
        countryId: resolvedCountryId,
        price: categoryResult.price,
        status: 'PUBLISHED',
        postTagOptionId: categoryResult.postTagOptionId,
        contactUrl,
      },
    });

    if (uploadedImages.length > 0) {
      await tx.postImage.createMany({
        data: uploadedImages.map((image, index) => ({
          postId: post.id,
          url: image.url,
          provider: 'cloudinary',
          providerPublicId: image.publicId,
          width: image.width,
          height: image.height,
          sortOrder: index,
        })),
      });
    }

    return post.id;
  });

  await notifySearchAlertsForPost({
    id: postId,
    title: title || null,
    body,
    authorDisplayName: user.displayName,
    imageUrl: uploadedImages[0]?.url ?? null,
  });

  trackServerEvent('post_created', {
    userId: user.id,
    postId,
    categoryId,
    countryId: resolvedCountryId,
    cityId: resolvedCityId,
    imageCount: uploadedImages.length,
    isPostInSaleCategory,
  });

  revalidatePath('/posts');
  revalidatePath('/my/posts');
  redirect('/posts');
}

export async function updatePostAction(formData: FormData) {
  const user = await requireUser();
  const hasCity = await hasValidProfileCity(user.id);
  if (!hasCity) {
    redirect(getProfileCityRequiredHref('/posts'));
  }

  const postId = normalizeText(formData.get('postId'));

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, status: true },
  });

  if (!post || !canEditPost(user, post)) {
    redirect('/my/posts?error=권한이 없습니다.');
  }

  const title = normalizeText(formData.get('title'));
  const body = normalizeText(formData.get('body'));
  const categoryId = normalizeText(formData.get('categoryId'));
  const rawCountryId = normalizeText(formData.get('countryId'));
  const rawCityId = normalizeText(formData.get('cityId'));
  const rawPrice = normalizeText(formData.get('price'));
  const rawPostTagOptionId = normalizeText(formData.get('postTagOptionId'));
  const contactUrl = normalizeText(formData.get('contactUrl')) || null;
  const uploadedImages = getUploadedImages(formData);
  const deleteImageIds = formData.getAll('deleteImageIds').filter((v): v is string => typeof v === 'string');

  if (!body) {
    redirect(`/posts/${postId}/edit?error=글 내용을 입력해 주세요.`);
  }

  if (!categoryId) {
    redirect(`/posts/${postId}/edit?error=카테고리를 선택해 주세요.`);
  }

  const categoryResult = await validateCategoryPriceAndTag(categoryId, rawPrice, rawPostTagOptionId);

  if (!categoryResult.ok) {
    redirect(
      `/posts/${postId}/edit?error=${encodeURIComponent(categoryResult.message)}`,
    );
  }

  const { countryId: resolvedCountryId, cityId: resolvedCityId } = await resolvePostScope(
    rawCountryId,
    rawCityId,
    `/posts/${postId}/edit`,
  );

  const canWriteToScope = await canCreatePost(
    user,
    resolvedCountryId,
    resolvedCityId,
    categoryResult.category.id,
  );
  if (!canWriteToScope) {
    redirect(`/posts/${postId}/edit?error=이 카테고리/지역에 글을 작성할 권한이 없습니다.`);
  }
  const isPostInSaleCategory = categoryResult.category.type === CategoryType.SALE;

  const existingImageCount = await prisma.postImage.count({
    where: { postId },
  });

  const remainingImageCount = existingImageCount - deleteImageIds.length;

  if (uploadedImages.length > MAX_UPLOAD_IMAGE_COUNT) {
    redirect(
      `/posts/${postId}/edit?error=${encodeURIComponent(`이미지는 최대 ${MAX_UPLOAD_IMAGE_COUNT}장까지 업로드할 수 있어요.`)}`,
    );
  }

  if (remainingImageCount + uploadedImages.length > MAX_UPLOAD_IMAGE_COUNT) {
    redirect(
      `/posts/${postId}/edit?error=${encodeURIComponent(`기존 이미지 포함 최대 ${MAX_UPLOAD_IMAGE_COUNT}장까지 업로드할 수 있어요.`)}`,
    );
  }

  let cloudinaryPublicIdsToDelete: string[] = [];

  if (deleteImageIds.length > 0) {
    const imagesToDelete = await prisma.postImage.findMany({
      where: { id: { in: deleteImageIds }, postId },
      select: { providerPublicId: true },
    });
    cloudinaryPublicIdsToDelete = imagesToDelete
      .filter((img): img is { providerPublicId: string } => img.providerPublicId !== null)
      .map((img) => img.providerPublicId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        title: title || null,
        body,
        categoryId,
        cityId: resolvedCityId,
        countryId: resolvedCountryId,
        price: isPostInSaleCategory ? categoryResult.price : null,
        postTagOptionId: categoryResult.postTagOptionId,
        status: 'PUBLISHED',
        contactUrl,
      },
    });

    if (deleteImageIds.length > 0) {
      await tx.postImage.deleteMany({
        where: { id: { in: deleteImageIds }, postId },
      });
    }

    if (uploadedImages.length > 0) {
      await tx.postImage.createMany({
        data: uploadedImages.map((image, index) => ({
          postId,
          url: image.url,
          provider: 'cloudinary',
          providerPublicId: image.publicId,
          width: image.width,
          height: image.height,
          sortOrder: remainingImageCount + index,
        })),
      });
    }
  });

  // Best-effort: delete removed images from Cloudinary after the DB transaction succeeds.
  if (cloudinaryPublicIdsToDelete.length > 0) {
    await Promise.allSettled(
      cloudinaryPublicIdsToDelete.map((id) => deleteImageFromCloudinary(id)),
    );
  }

  revalidatePath('/posts');
  revalidatePath('/my/posts');
  revalidatePath(`/posts/${postId}`);
  redirect('/my/posts');
}

export async function deletePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, status: true },
  });

  if (!post || !canDeletePost(user, post)) {
    redirect('/my/posts?error=권한이 없습니다.');
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      deletedReason: 'USER_DELETED',
    },
  });

  revalidatePath('/posts');
  revalidatePath('/my/posts');
  redirect('/my/posts');
}

export async function reportPostAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const optionId = normalizeText(formData.get('optionId'));
  const additionalReason = normalizeText(formData.get('additionalReason'));

  if (!postId) {
    redirect('/posts?error=게시글 정보가 없습니다.');
  }

  if (!optionId) {
    redirect(`/posts/${postId}?error=${encodeURIComponent('신고 사유를 선택해 주세요.')}`);
  }

  if (additionalReason && additionalReason.length > 500) {
    redirect(`/posts/${postId}?error=${encodeURIComponent('추가 사유는 500자 이내로 입력해 주세요.')}`);
  }

  const [post, option] = await Promise.all([
    prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, status: true },
    }),
    prisma.reportOption.findFirst({
      where: { id: optionId, isActive: true },
      select: { id: true },
    }),
  ]);

  if (!post || !canReportPost(user, post)) {
    redirect(`/posts/${postId}?error=${encodeURIComponent('신고할 수 없는 게시글입니다.')}`);
  }

  if (!option) {
    redirect(`/posts/${postId}?error=${encodeURIComponent('유효한 신고 사유를 선택해 주세요.')}`);
  }

  await prisma.postReport.upsert({
    where: {
      postId_reporterId: {
        postId,
        reporterId: user.id,
      },
    },
    update: {
      optionId: option.id,
      additionalReason: additionalReason || null,
    },
    create: {
      postId,
      reporterId: user.id,
      optionId: option.id,
      additionalReason: additionalReason || null,
    },
  });

  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  revalidatePath('/admin/reports');
  redirect(`/posts/${postId}?success=${encodeURIComponent('신고가 접수되었어요.')}`);
}

export async function changePostTagOptionAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const postTagOptionId = normalizeText(formData.get('postTagOptionId'));

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      status: true,
      categoryId: true,
    },
  });

  if (!post || !canEditPost(user, post)) {
    redirect(`/posts/${postId}?error=권한이 없습니다.`);
  }

  const selectedOption = await prisma.postTagOption.findFirst({
    where: {
      id: postTagOptionId,
      categoryId: post.categoryId,
      isActive: true,
    },
    select: { id: true, label: true },
  });

  if (!selectedOption) {
    redirect(`/posts/${postId}?error=${encodeURIComponent('유효한 활성 태그를 선택해 주세요.')}`);
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      postTagOptionId: selectedOption.id,
    },
  });

  if (user.role === 'ADMIN' && user.id !== post.authorId) {
    await prisma.moderationAction.create({
      data: {
        actorId: user.id,
        targetType: 'POST',
        targetId: post.id,
        actionType: 'POST_TAG_CHANGED',
        reason: selectedOption.label,
      },
    });
  }

  revalidatePath('/posts');
  revalidatePath('/my/posts');
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}?success=${encodeURIComponent('태그가 변경되었어요.')}`);
}
