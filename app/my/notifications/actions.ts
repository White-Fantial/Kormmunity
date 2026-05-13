'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/notifications';

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath('/my/notifications');
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser();
  await markNotificationRead(notificationId, user.id);
  revalidatePath('/my/notifications');
}
