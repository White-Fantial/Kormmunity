'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { normalizeInternalPath } from '@/lib/posts/profile-city';

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeReturnTo(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return normalizeInternalPath(value) ?? fallback;
}

export async function savePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const returnTo = normalizeReturnTo(formData.get('returnTo'), '/posts');

  if (!postId) {
    redirect(returnTo);
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (!post || post.status === 'DELETED') {
    redirect(returnTo);
  }

  await prisma.savedPost.upsert({
    where: {
      userId_postId: {
        userId: user.id,
        postId: post.id,
      },
    },
    create: {
      userId: user.id,
      postId: post.id,
    },
    update: {},
  });

  revalidatePath('/posts');
  revalidatePath('/my/saved');
  revalidatePath(`/posts/${post.id}`);
  redirect(returnTo);
}

export async function unsavePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = normalizeText(formData.get('postId'));
  const returnTo = normalizeReturnTo(formData.get('returnTo'), '/my/saved');

  if (!postId) {
    redirect(returnTo);
  }

  await prisma.savedPost.deleteMany({
    where: {
      userId: user.id,
      postId,
    },
  });

  revalidatePath('/posts');
  revalidatePath('/my/saved');
  revalidatePath(`/posts/${postId}`);
  redirect(returnTo);
}
