'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const openChatUrl = normalizeText(formData.get('openChatUrl')) || null;

  await prisma.user.update({
    where: { id: user.id },
    data: { openChatUrl },
  });

  revalidatePath('/my/profile');
  redirect('/my/profile?success=1');
}
