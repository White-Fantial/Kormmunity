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
  canReportPost,
  canMarkPostAsSold,
  canMarkPostAsReserved,
  canMarkPostAsAvailable,
  canPostToCategory,
} from '@/lib/permissions';
import {
  MAX_UPLOAD_IMAGE_COUNT,
  deleteImageFromCloudinary,
  type PreUploadedImage,
} from '@/lib/upload/cloudinary';

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

function isProgressTrackCategoryType(type: CategoryType) {
  return type === CategoryType.SALE || type === CategoryType.RECRUIT;
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

async function validateCategoryAndPrice(categoryId: string, rawPrice: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, type: true, minRole: true, ignoreCity: true, supportsAllCities: true },
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

  return { ok: true as const, category, price };
}

async function resolveCityId(
  rawCityId: string,
  category: { ignoreCity: boolean; supportsAllCities: boolean },
  errorRedirectPath: string,
): Promise<string | null> {
  if (category.ignoreCity) {
    return null;
  }

  if (rawCityId === '') {
    if (category.supportsAllCities) {
      return null;
    }
    redirect(`${errorRedirectPath}?error=${encodeURIComponent('지역을 선택해 주세요.')}`);
  }

  const city = await prisma.city.findUnique({
    where: { id: rawCityId },
    select: { id: true },
  });

  if (!city) {
    redirect(`${errorRedirectPath}?error=${encodeURIComponent('지역을 선택해 주세요.')}`);
  }

  return city.id;
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();

  if (!canCreatePost(user)) {
    redirect('/posts/new?error=권한이 없습니다.');
  }

  const title = normalizeText(formData.get('title'));
  const body = normalizeText(formData.get('body'));
  const categoryId = normalizeText(formData.get('categoryId'));
  const rawCityId = normalizeText(formData.get('cityId'));
  const rawPrice = normalizeText(formData.get('price'));
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

  const categoryResult = await validateCategoryAndPrice(categoryId, rawPrice);

  if (!categoryResult.ok) {
    redirect(`/posts/new?error=${encodeURIComponent(categoryResult.message)}`);
  }

  if (!canPostToCategory(user, categoryResult.category)) {
    redirect('/posts/new?error=이 카테고리에 글을 작성할 권한이 없습니다.');
  }

  const resolvedCityId = await resolveCityId(
    rawCityId,
    categoryResult.category,
    '/posts/new',
  );

  const isSaleCategory = categoryResult.category.type === CategoryType.SALE;
  const isProgressTrackCategory = isProgressTrackCategoryType(categoryResult.category.type);

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
        price: categoryResult.price,
        status: 'PUBLISHED',
        saleStatus: isProgressTrackCategory ? 'AVAILABLE' : null,
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
    cityId: resolvedCityId,
    imageCount: uploadedImages.length,
    isSaleCategory,
  });

  revalidatePath('/posts');
  revalidatePath('/my/posts');
  redirect('/posts');
}

export async function updatePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, status: true, saleStatus: true },
  });

  if (!post || !canEditPost(user, post)) {
    redirect('/my/posts?error=권한이 없습니다.');
  }

  const title = normalizeText(formData.get('title'));
  const body = normalizeText(formData.get('body'));
  const categoryId = normalizeText(formData.get('categoryId'));
  const rawCityId = normalizeText(formData.get('cityId'));
  const rawPrice = normalizeText(formData.get('price'));
  const contactUrl = normalizeText(formData.get('contactUrl')) || null;
  const uploadedImages = getUploadedImages(formData);
  const deleteImageIds = formData.getAll('deleteImageIds').filter((v): v is string => typeof v === 'string');

  if (!body) {
    redirect(`/posts/${postId}/edit?error=글 내용을 입력해 주세요.`);
  }

  if (!categoryId) {
    redirect(`/posts/${postId}/edit?error=카테고리를 선택해 주세요.`);
  }

  const categoryResult = await validateCategoryAndPrice(categoryId, rawPrice);

  if (!categoryResult.ok) {
    redirect(
      `/posts/${postId}/edit?error=${encodeURIComponent(categoryResult.message)}`,
    );
  }

  if (!canPostToCategory(user, categoryResult.category)) {
    redirect(`/posts/${postId}/edit?error=이 카테고리에 글을 작성할 권한이 없습니다.`);
  }

  const resolvedCityId = await resolveCityId(
    rawCityId,
    categoryResult.category,
    `/posts/${postId}/edit`,
  );

  const isSaleCategory = categoryResult.category.type === CategoryType.SALE;
  const isProgressTrackCategory = isProgressTrackCategoryType(categoryResult.category.type);

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
        price: isSaleCategory ? categoryResult.price : null,
        saleStatus: isProgressTrackCategory
          ? post.saleStatus === 'SOLD'
            ? 'SOLD'
            : 'AVAILABLE'
          : null,
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
    select: { id: true, authorId: true, status: true, saleStatus: true },
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
      select: { id: true, authorId: true, status: true, saleStatus: true },
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

export async function markPostAsSoldAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      status: true,
      saleStatus: true,
      category: { select: { type: true } },
    },
  });

  if (!post || !canMarkPostAsSold(user, post)) {
    redirect('/my/posts?error=권한이 없습니다.');
  }

  if (!isProgressTrackCategoryType(post.category.type)) {
    redirect('/my/posts?error=이 카테고리는 완료 상태를 변경할 수 없어요.');
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      saleStatus: 'SOLD',
    },
  });

  revalidatePath('/posts');
  revalidatePath('/my/posts');
  revalidatePath(`/posts/${postId}`);
  redirect('/my/posts');
}

export async function markPostAsReservedAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      status: true,
      saleStatus: true,
      category: { select: { type: true } },
    },
  });

  if (!post || !canMarkPostAsReserved(user, post)) {
    redirect('/my/posts?error=권한이 없습니다.');
  }

  if (post.category.type !== CategoryType.SALE) {
    redirect('/my/posts?error=판매글만 예약중 처리할 수 있어요.');
  }

  if (post.saleStatus !== 'AVAILABLE') {
    redirect('/my/posts?error=판매중 상태인 글만 예약중으로 변경할 수 있어요.');
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      saleStatus: 'RESERVED',
    },
  });

  revalidatePath('/posts');
  revalidatePath('/my/posts');
  revalidatePath(`/posts/${postId}`);
  redirect('/my/posts');
}

export async function markPostAsAvailableAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      status: true,
      saleStatus: true,
      category: { select: { type: true } },
    },
  });

  if (!post || !canMarkPostAsAvailable(user, post)) {
    redirect('/my/posts?error=권한이 없습니다.');
  }

  if (!isProgressTrackCategoryType(post.category.type)) {
    redirect('/my/posts?error=이 카테고리는 상태를 변경할 수 없어요.');
  }

  if (post.saleStatus === 'AVAILABLE') {
    redirect(
      `/my/posts?error=${encodeURIComponent(
        post.category.type === CategoryType.RECRUIT ? '이미 진행중 상태예요.' : '이미 판매중 상태예요.',
      )}`,
    );
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      saleStatus: 'AVAILABLE',
    },
  });

  revalidatePath('/posts');
  revalidatePath('/my/posts');
  revalidatePath(`/posts/${postId}`);
  redirect('/my/posts');
}
