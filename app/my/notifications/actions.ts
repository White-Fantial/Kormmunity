'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import {
  archiveAllNotifications,
  archiveNotification,
  markAllNotificationsRead,
  markNotificationRead,
  openNotification,
} from '@/lib/notifications';

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath('/my/notifications');
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = String(formData.get('notificationId') ?? '').trim();
  if (!notificationId) {
    return;
  }

  const user = await requireUser();
  await markNotificationRead(notificationId, user.id);
  revalidatePath('/my/notifications');
}

export async function openNotificationAction(formData: FormData) {
  const notificationId = String(formData.get('notificationId') ?? '').trim();
  if (!notificationId) {
    redirect('/my/notifications');
  }

  const user = await requireUser();
  const result = await openNotification(notificationId, user.id);
  revalidatePath('/my/notifications');
  if (result.href) {
    redirect(result.href);
  }

  if (result.error) {
    redirect(`/my/notifications?error=${encodeURIComponent(result.error)}`);
  }

  redirect('/my/notifications');
}

export async function archiveNotificationAction(formData: FormData) {
  const notificationId = String(formData.get('notificationId') ?? '').trim();
  if (!notificationId) {
    return;
  }

  const user = await requireUser();
  await archiveNotification(notificationId, user.id);
  revalidatePath('/my/notifications');
}

export async function archiveAllNotificationsAction() {
  const user = await requireUser();
  await archiveAllNotifications(user.id);
  revalidatePath('/my/notifications');
}
