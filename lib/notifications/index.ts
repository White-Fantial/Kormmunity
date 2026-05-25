import type {
  NotificationTargetType,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

const NOTIFICATIONS_PER_PAGE = 30;

export type CreateNotificationParams = {
  recipientId: string;
  type: NotificationType;
  relatedPostId?: string;
  relatedCommentId?: string;
  targetType?: NotificationTargetType;
  targetId?: string;
  targetUrl?: string;
  metadata?: Prisma.InputJsonValue;
  actorId?: string;
  dedupeWindowSeconds?: number;
};

export type NotificationLinkTarget = {
  targetUrl?: string | null;
  relatedPostId: string | null;
  relatedCommentId: string | null;
};

export function getNotificationHref(notification: NotificationLinkTarget): string | null {
  if (notification.targetUrl?.startsWith('/')) {
    return notification.targetUrl;
  }
  if (!notification.relatedPostId) return null;
  if (notification.relatedCommentId) {
    return `/posts/${notification.relatedPostId}#comment-${notification.relatedCommentId}`;
  }
  return `/posts/${notification.relatedPostId}`;
}

export async function createNotification(params: CreateNotificationParams) {
  const targetType: NotificationTargetType =
    params.targetType ??
    (params.relatedCommentId ? 'COMMENT' : params.relatedPostId ? 'POST' : 'SYSTEM');

  if (params.dedupeWindowSeconds && params.dedupeWindowSeconds > 0) {
    const threshold = new Date(Date.now() - params.dedupeWindowSeconds * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        recipientId: params.recipientId,
        type: params.type,
        targetType,
        targetId: params.targetId ?? null,
        targetUrl: params.targetUrl ?? null,
        createdAt: { gte: threshold },
      },
      select: { id: true },
    });

    if (existing) {
      return;
    }
  }

  await prisma.notification.create({
    data: {
      recipientId: params.recipientId,
      type: params.type,
      relatedPostId: params.relatedPostId ?? null,
      relatedCommentId: params.relatedCommentId ?? null,
      targetType,
      targetId: params.targetId ?? null,
      targetUrl: params.targetUrl ?? null,
      metadata: params.metadata,
      actorId: params.actorId ?? null,
    },
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { recipientId: userId, isRead: false },
  });
}

export async function getNotifications(userId: string, cursor?: string) {
  return prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: 'desc' },
    take: NOTIFICATIONS_PER_PAGE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      type: true,
      isRead: true,
      relatedPostId: true,
      relatedCommentId: true,
      targetType: true,
      targetId: true,
      targetUrl: true,
      metadata: true,
      actorId: true,
      createdAt: true,
    },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { recipientId: userId, isRead: false },
    data: { isRead: true },
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: userId },
    data: { isRead: true },
  });
}

export async function openNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipientId: userId },
    select: {
      targetType: true,
      targetId: true,
      targetUrl: true,
      relatedPostId: true,
      relatedCommentId: true,
      isRead: true,
    },
  });

  if (!notification) {
    return { href: null, error: null };
  }

  if (!notification.isRead) {
    await prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }

  const href = getNotificationHref(notification);
  if (!href) {
    return { href: null, error: null };
  }

  const canOpen = await canOpenNotificationHref(userId, href);
  if (!canOpen) {
    return {
      href: null,
      error: '접근 권한이 없거나 대상을 찾을 수 없어요.',
    };
  }

  return { href, error: null };
}

export async function archiveNotification(notificationId: string, userId: string) {
  await prisma.notification.deleteMany({
    where: { id: notificationId, recipientId: userId },
  });
}

export async function archiveAllNotifications(userId: string) {
  await prisma.notification.deleteMany({
    where: { recipientId: userId },
  });
}

async function canOpenNotificationHref(userId: string, href: string) {
  if (!href.startsWith('/')) {
    return false;
  }

  const parsed = new URL(href, 'https://kormmunity.local');

  if (parsed.pathname.startsWith('/ads-manager')) {
    return hasAdManagerAccess(userId);
  }

  if (parsed.pathname.startsWith('/advertiser-member/campaigns')) {
    const campaignId = parsed.searchParams.get('campaignId');
    if (!campaignId) {
      return canAccessAdvertiserMemberArea(userId);
    }
    return canAccessAdvertiserCampaign(userId, campaignId);
  }

  if (parsed.pathname.startsWith('/advertiser-member/proposals')) {
    const proposalId = parsed.searchParams.get('proposalId');
    if (!proposalId) {
      return canAccessAdvertiserMemberArea(userId);
    }
    return canAccessAdvertiserProposal(userId, proposalId);
  }

  return true;
}

async function hasAdManagerAccess(userId: string) {
  const count = await prisma.staffAssignment.count({
    where: {
      userId,
      isActive: true,
      role: { in: ['AD_MANAGER', 'ADMIN'] },
    },
  });

  return count > 0;
}

async function canAccessAdvertiserMemberArea(userId: string) {
  if (await hasAdManagerAccess(userId)) {
    return true;
  }

  const membershipCount = await prisma.advertiserMember.count({
    where: { userId, isActive: true },
  });
  return membershipCount > 0;
}

async function canAccessAdvertiserCampaign(userId: string, campaignId: string) {
  if (await hasAdManagerAccess(userId)) {
    return true;
  }

  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    select: { advertiserId: true },
  });

  if (!campaign?.advertiserId) {
    return false;
  }

  const membershipCount = await prisma.advertiserMember.count({
    where: {
      userId,
      advertiserId: campaign.advertiserId,
      isActive: true,
    },
  });
  return membershipCount > 0;
}

async function canAccessAdvertiserProposal(userId: string, proposalId: string) {
  if (await hasAdManagerAccess(userId)) {
    return true;
  }

  const proposal = await prisma.adProposal.findUnique({
    where: { id: proposalId },
    select: { advertiserId: true },
  });

  if (!proposal) {
    return false;
  }

  const membershipCount = await prisma.advertiserMember.count({
    where: {
      userId,
      advertiserId: proposal.advertiserId,
      isActive: true,
    },
  });
  return membershipCount > 0;
}
