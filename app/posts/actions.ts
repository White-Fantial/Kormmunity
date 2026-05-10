'use server';

import { Decimal } from '@prisma/client/runtime/library';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { trackServerEvent } from '@/lib/analytics/server';
import { assertNoSpamText, enforceRateLimit } from '@/lib/abuse/guard';
import { prisma } from '@/lib/db/prisma';
import {
  canCreatePost,
  canDeletePost,
  canEditPost,
  canMarkPostAsSold,
} from '@/lib/permissions';
import { getProfileCityRequiredHref } from '@/lib/posts/profile-city';
import { SALE_CATEGORY_SLUG } from '@/lib/posts/constants';
import {
  MAX_UPLOAD_IMAGE_COUNT,
  uploadImageToCloudinary,
  validateImageFiles,
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

function getImageFiles(formData: FormData) {
  return formData
    .getAll('images')
    .filter(
      (entry): entry is File =>
        entry instanceof File && entry.size > 0 && entry.name.length > 0,
    );
}

async function validateCategoryAndPrice(categoryId: string, rawPrice: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, slug: true, type: true },
  });

  if (!category) {
    return { ok: false as const, message: '카테고리를 선택해 주세요.' };
  }

  const { value: price, invalid } = parsePrice(rawPrice);
  const isSaleCategory = category.slug === SALE_CATEGORY_SLUG;

  if (invalid) {
    return { ok: false as const, message: '가격을 올바르게 입력해 주세요.' };
  }

  if (isSaleCategory && !price) {
    return { ok: false as const, message: '판매글은 가격을 입력해 주세요.' };
  }

  return { ok: true as const, category, price };
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();

  if (!canCreatePost(user)) {
    redirect('/posts/new?error=권한이 없습니다.');
  }

  const title = normalizeText(formData.get('title'));
  const body = normalizeText(formData.get('body'));
  const categoryId = normalizeText(formData.get('categoryId'));
  const rawPrice = normalizeText(formData.get('price'));
  const contactUrl = normalizeText(formData.get('contactUrl')) || null;
  const imageFiles = getImageFiles(formData);

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

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      cityId: true,
      city: {
        select: { id: true },
      },
    },
  });

  if (!dbUser?.cityId || !dbUser.city) {
    redirect(getProfileCityRequiredHref('/posts/new'));
  }

  const profileCityId = dbUser.cityId;

  const categoryResult = await validateCategoryAndPrice(categoryId, rawPrice);

  if (!categoryResult.ok) {
    redirect(`/posts/new?error=${encodeURIComponent(categoryResult.message)}`);
  }

  const isSaleCategory = categoryResult.category.slug === SALE_CATEGORY_SLUG;

  const imageValidationResult = validateImageFiles(imageFiles);

  if (!imageValidationResult.ok) {
    redirect(`/posts/new?error=${encodeURIComponent(imageValidationResult.message)}`);
  }

  let uploadedImages: Awaited<ReturnType<typeof uploadImageToCloudinary>>[] = [];

  if (imageFiles.length > 0) {
    try {
      uploadedImages = await Promise.all(
        imageFiles.map((imageFile) => uploadImageToCloudinary(imageFile)),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했어요.';
      redirect(`/posts/new?error=${encodeURIComponent(message)}`);
    }
  }

  const postId = await prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        authorId: user.id,
        title: title || null,
        body,
        categoryId,
        cityId: profileCityId,
        price: categoryResult.price,
        status: 'PUBLISHED',
        saleStatus: isSaleCategory ? 'AVAILABLE' : null,
        contactUrl,
      },
    });

    if (uploadedImages.length > 0) {
      await tx.postImage.createMany({
        data: uploadedImages.map((image, index) => ({
          postId: post.id,
          url: image.url,
          provider: image.provider,
          providerPublicId: image.providerPublicId,
          width: image.width,
          height: image.height,
          sortOrder: index,
        })),
      });
    }

    return post.id;
  });

  trackServerEvent('post_created', {
    userId: user.id,
    postId,
    categoryId,
    cityId: profileCityId,
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
  const cityId = normalizeText(formData.get('cityId'));
  const rawPrice = normalizeText(formData.get('price'));
  const contactUrl = normalizeText(formData.get('contactUrl')) || null;
  const imageFiles = getImageFiles(formData);

  if (!body) {
    redirect(`/posts/${postId}/edit?error=글 내용을 입력해 주세요.`);
  }

  if (!categoryId) {
    redirect(`/posts/${postId}/edit?error=카테고리를 선택해 주세요.`);
  }

  if (!cityId) {
    redirect(`/posts/${postId}/edit?error=지역을 선택해 주세요.`);
  }

  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { id: true },
  });

  if (!city) {
    redirect(`/posts/${postId}/edit?error=지역을 선택해 주세요.`);
  }

  const categoryResult = await validateCategoryAndPrice(categoryId, rawPrice);

  if (!categoryResult.ok) {
    redirect(
      `/posts/${postId}/edit?error=${encodeURIComponent(categoryResult.message)}`,
    );
  }

  const isSaleCategory = categoryResult.category.slug === SALE_CATEGORY_SLUG;

  const existingImageCount = await prisma.postImage.count({
    where: { postId },
  });

  const imageValidationResult = validateImageFiles(imageFiles);

  if (!imageValidationResult.ok) {
    redirect(
      `/posts/${postId}/edit?error=${encodeURIComponent(imageValidationResult.message)}`,
    );
  }

  if (existingImageCount + imageFiles.length > MAX_UPLOAD_IMAGE_COUNT) {
    redirect(
      `/posts/${postId}/edit?error=${encodeURIComponent(`기존 이미지 포함 최대 ${MAX_UPLOAD_IMAGE_COUNT}장까지 업로드할 수 있어요.`)}`,
    );
  }

  let uploadedImages: Awaited<ReturnType<typeof uploadImageToCloudinary>>[] = [];

  if (imageFiles.length > 0) {
    try {
      uploadedImages = await Promise.all(
        imageFiles.map((imageFile) => uploadImageToCloudinary(imageFile)),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했어요.';
      redirect(`/posts/${postId}/edit?error=${encodeURIComponent(message)}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        title: title || null,
        body,
        categoryId,
        cityId,
        price: isSaleCategory ? categoryResult.price : null,
        saleStatus: isSaleCategory ? post.saleStatus ?? 'AVAILABLE' : null,
        status: 'PUBLISHED',
        contactUrl,
      },
    });

    if (uploadedImages.length > 0) {
      await tx.postImage.createMany({
        data: uploadedImages.map((image, index) => ({
          postId,
          url: image.url,
          provider: image.provider,
          providerPublicId: image.providerPublicId,
          width: image.width,
          height: image.height,
          sortOrder: existingImageCount + index,
        })),
      });
    }
  });

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
      category: { select: { slug: true } },
    },
  });

  if (!post || !canMarkPostAsSold(user, post)) {
    redirect('/my/posts?error=권한이 없습니다.');
  }

  if (post.category.slug !== SALE_CATEGORY_SLUG) {
    redirect('/my/posts?error=판매글만 판매완료 처리할 수 있어요.');
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
