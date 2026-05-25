import { createHash } from 'node:crypto';

import type { NotificationEventType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import {
  attemptKakaoMessageDelivery,
  getSiteBaseUrl,
  truncateText,
  type DeliveryRecipient,
} from '@/lib/kakao/message';

type PostCreatedEventPayload = {
  postId: string;
  title: string | null;
  body: string;
  authorDisplayName: string;
  imageUrl: string | null;
};

type CommentCreatedEventPayload = {
  postId: string;
  commentId: string;
  postTitle: string | null;
  postBody: string;
  postAuthorId: string;
  commentAuthorId: string;
  commenterDisplayName: string;
  commentBody: string;
};

type AdProposalSubmittedEventPayload = {
  proposalId: string;
  advertiserId: string;
  actorId: string;
};

type AdCampaignEventPayload = {
  campaignId: string;
  advertiserId: string;
  actorId: string;
};

const PREVIEW_LENGTH = 80;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function matchesAlertQuery(post: { title: string | null; body: string; authorDisplayName: string }, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return false;
  }

  const title = normalizeText(post.title ?? '');
  const body = normalizeText(post.body);
  const authorDisplayName = normalizeText(post.authorDisplayName);

  return (
    title.includes(normalizedQuery) ||
    body.includes(normalizedQuery) ||
    authorDisplayName.includes(normalizedQuery)
  );
}

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function truncateErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return truncateText(error.message, 500);
  }
  return '알 수 없는 오류';
}

function getTargetUrl(pathname: string) {
  const siteBaseUrl = getSiteBaseUrl();
  return siteBaseUrl ? `${siteBaseUrl}${pathname}` : null;
}

async function getAdsManagerRecipientIds() {
  const assignments = await prisma.staffAssignment.findMany({
    where: {
      isActive: true,
      role: { in: ['AD_MANAGER', 'ADMIN'] },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  return assignments.map((assignment) => assignment.userId);
}

async function getAdvertiserMemberRecipientIds(advertiserId: string) {
  const members = await prisma.advertiserMember.findMany({
    where: {
      advertiserId,
      isActive: true,
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  return members.map((member) => member.userId);
}

function uniqueRecipientIds(recipientIds: string[], excludeUserId?: string) {
  return [...new Set(recipientIds)].filter((recipientId) => recipientId && recipientId !== excludeUserId);
}

export async function enqueueNotificationEvent<TPayload extends object>(params: {
  eventType: NotificationEventType;
  payload: TPayload;
}) {
  return prisma.notificationEvent.create({
    data: {
      eventType: params.eventType,
      payload: params.payload as unknown as Record<string, unknown>,
    },
    select: { id: true },
  });
}

export async function enqueuePostCreatedNotificationEvent(payload: PostCreatedEventPayload) {
  return enqueueNotificationEvent({ eventType: 'POST_CREATED', payload });
}

export async function enqueueCommentCreatedNotificationEvent(payload: CommentCreatedEventPayload) {
  return enqueueNotificationEvent({ eventType: 'COMMENT_CREATED', payload });
}

export async function enqueueAdProposalSubmittedNotificationEvent(payload: AdProposalSubmittedEventPayload) {
  return enqueueNotificationEvent({ eventType: 'AD_PROPOSAL_SUBMITTED', payload });
}

export async function enqueueAdCampaignReviewRequestedNotificationEvent(payload: AdCampaignEventPayload) {
  return enqueueNotificationEvent({ eventType: 'AD_CAMPAIGN_REVIEW_REQUESTED', payload });
}

export async function enqueueAdCampaignApprovedNotificationEvent(payload: AdCampaignEventPayload) {
  return enqueueNotificationEvent({ eventType: 'AD_CAMPAIGN_APPROVED', payload });
}

export async function enqueueAdCampaignChangesRequestedNotificationEvent(payload: AdCampaignEventPayload) {
  return enqueueNotificationEvent({ eventType: 'AD_CAMPAIGN_CHANGES_REQUESTED', payload });
}

async function resolvePostCreatedEventIntents(eventId: string, payload: PostCreatedEventPayload) {
  const alerts = await prisma.searchAlert.findMany({
    where: {
      user: { notifyOnKakaoForSearchAlert: true },
    },
    select: {
      query: true,
      userId: true,
    },
  });

  const matchingAlerts = alerts.filter((alert) =>
    matchesAlertQuery(
      {
        title: payload.title,
        body: payload.body,
        authorDisplayName: payload.authorDisplayName,
      },
      alert.query,
    ),
  );

  if (matchingAlerts.length === 0) {
    return 0;
  }

  const postUrl = getTargetUrl(`/posts/${payload.postId}`);
  const previewSource = payload.title?.trim() || payload.body.trim();
  const preview = truncateText(previewSource, PREVIEW_LENGTH);
  const bodyPreview = truncateText(payload.body.trim(), PREVIEW_LENGTH);

  const messageLines = [
    `[검색 알림] ${preview}`,
    `작성자: ${payload.authorDisplayName}`,
    `내용: ${bodyPreview}`,
  ];
  if (postUrl) {
    messageLines.push(postUrl);
  }
  if (payload.imageUrl) {
    messageLines.push(`사진: ${payload.imageUrl}`);
  }

  const messageText = messageLines.join('\n');

  const result = await prisma.notificationDeliveryIntent.createMany({
    data: matchingAlerts.map((alert) => ({
      eventId,
      channel: 'KAKAO',
      recipientUserId: alert.userId,
      templateType: 'SEARCH_ALERT',
      messageText,
      targetUrl: postUrl,
      relatedPostId: payload.postId,
      searchQuery: alert.query,
      dedupeKey: `SEARCH_ALERT:${payload.postId}:${alert.userId}:${hashText(alert.query)}`,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

async function resolveCommentCreatedEventIntents(eventId: string, payload: CommentCreatedEventPayload) {
  if (payload.postAuthorId === payload.commentAuthorId) {
    return 0;
  }

  const recipient = await prisma.user.findUnique({
    where: { id: payload.postAuthorId },
    select: { id: true, notifyOnKakaoForComment: true },
  });

  if (!recipient?.notifyOnKakaoForComment) {
    return 0;
  }

  const postUrl = getTargetUrl(`/posts/${payload.postId}`);
  const postPreview = truncateText(payload.postTitle?.trim() || payload.postBody.trim(), PREVIEW_LENGTH);
  const commentPreview = truncateText(payload.commentBody.trim(), PREVIEW_LENGTH);

  const messageLines = [
    `[댓글 알림] "${postPreview}"에 새 댓글이 달렸어요.`,
    `작성자: ${payload.commenterDisplayName}`,
    `댓글: ${commentPreview}`,
  ];
  if (postUrl) {
    messageLines.push(postUrl);
  }

  const result = await prisma.notificationDeliveryIntent.createMany({
    data: [
      {
        eventId,
        channel: 'KAKAO',
        recipientUserId: recipient.id,
        templateType: 'COMMENT_NOTIFICATION',
        messageText: messageLines.join('\n'),
        targetUrl: postUrl,
        relatedPostId: payload.postId,
        dedupeKey: `COMMENT_CREATED:${payload.commentId}:${recipient.id}`,
      },
    ],
    skipDuplicates: true,
  });

  return result.count;
}

async function resolveAdProposalSubmittedEventIntents(
  eventId: string,
  payload: AdProposalSubmittedEventPayload,
) {
  const recipientIds = uniqueRecipientIds(await getAdsManagerRecipientIds(), payload.actorId);

  if (recipientIds.length === 0) {
    return 0;
  }

  const targetUrl = getTargetUrl(`/ads-manager/proposals?proposalId=${payload.proposalId}`);
  const messageLines = [
    '[광고 제안 알림] 새 광고 제안이 등록되었어요.',
    `제안 ID: ${payload.proposalId}`,
  ];
  if (targetUrl) {
    messageLines.push(targetUrl);
  }

  const result = await prisma.notificationDeliveryIntent.createMany({
    data: recipientIds.map((recipientUserId) => ({
      eventId,
      channel: 'KAKAO',
      recipientUserId,
      templateType: 'AD_PROPOSAL_SUBMITTED',
      messageText: messageLines.join('\n'),
      targetUrl,
      dedupeKey: `AD_EVENT:${payload.proposalId}:AD_PROPOSAL_SUBMITTED:${recipientUserId}`,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

async function resolveAdCampaignReviewRequestedEventIntents(
  eventId: string,
  payload: AdCampaignEventPayload,
) {
  const recipientIds = uniqueRecipientIds(
    await getAdvertiserMemberRecipientIds(payload.advertiserId),
    payload.actorId,
  );

  if (recipientIds.length === 0) {
    return 0;
  }

  const targetUrl = getTargetUrl(`/advertiser-member/campaigns?campaignId=${payload.campaignId}`);
  const messageLines = [
    '[광고 캠페인 알림] 캠페인 리뷰 요청이 도착했어요.',
    `캠페인 ID: ${payload.campaignId}`,
  ];
  if (targetUrl) {
    messageLines.push(targetUrl);
  }

  const result = await prisma.notificationDeliveryIntent.createMany({
    data: recipientIds.map((recipientUserId) => ({
      eventId,
      channel: 'KAKAO',
      recipientUserId,
      templateType: 'AD_CAMPAIGN_REVIEW_REQUESTED',
      messageText: messageLines.join('\n'),
      targetUrl,
      dedupeKey: `AD_EVENT:${payload.campaignId}:AD_CAMPAIGN_REVIEW_REQUESTED:${recipientUserId}`,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

async function resolveAdCampaignApprovedEventIntents(eventId: string, payload: AdCampaignEventPayload) {
  const recipientIds = uniqueRecipientIds(await getAdsManagerRecipientIds(), payload.actorId);

  if (recipientIds.length === 0) {
    return 0;
  }

  const targetUrl = getTargetUrl(`/ads-manager/campaigns?campaignId=${payload.campaignId}`);
  const messageLines = [
    '[광고 캠페인 알림] 캠페인이 승인되었어요.',
    `캠페인 ID: ${payload.campaignId}`,
  ];
  if (targetUrl) {
    messageLines.push(targetUrl);
  }

  const result = await prisma.notificationDeliveryIntent.createMany({
    data: recipientIds.map((recipientUserId) => ({
      eventId,
      channel: 'KAKAO',
      recipientUserId,
      templateType: 'AD_CAMPAIGN_APPROVED',
      messageText: messageLines.join('\n'),
      targetUrl,
      dedupeKey: `AD_EVENT:${payload.campaignId}:AD_CAMPAIGN_APPROVED:${recipientUserId}`,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

async function resolveAdCampaignChangesRequestedEventIntents(
  eventId: string,
  payload: AdCampaignEventPayload,
) {
  const recipientIds = uniqueRecipientIds(await getAdsManagerRecipientIds(), payload.actorId);

  if (recipientIds.length === 0) {
    return 0;
  }

  const targetUrl = getTargetUrl(`/ads-manager/campaigns?campaignId=${payload.campaignId}`);
  const messageLines = [
    '[광고 캠페인 알림] 캠페인 수정 요청이 도착했어요.',
    `캠페인 ID: ${payload.campaignId}`,
  ];
  if (targetUrl) {
    messageLines.push(targetUrl);
  }

  const result = await prisma.notificationDeliveryIntent.createMany({
    data: recipientIds.map((recipientUserId) => ({
      eventId,
      channel: 'KAKAO',
      recipientUserId,
      templateType: 'AD_CAMPAIGN_CHANGES_REQUESTED',
      messageText: messageLines.join('\n'),
      targetUrl,
      dedupeKey: `AD_EVENT:${payload.campaignId}:AD_CAMPAIGN_CHANGES_REQUESTED:${recipientUserId}`,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

async function resolveNotificationEvent(event: { id: string; eventType: NotificationEventType; payload: unknown }) {
  switch (event.eventType) {
    case 'POST_CREATED':
      return resolvePostCreatedEventIntents(event.id, event.payload as PostCreatedEventPayload);
    case 'COMMENT_CREATED':
      return resolveCommentCreatedEventIntents(event.id, event.payload as CommentCreatedEventPayload);
    case 'AD_PROPOSAL_SUBMITTED':
      return resolveAdProposalSubmittedEventIntents(
        event.id,
        event.payload as AdProposalSubmittedEventPayload,
      );
    case 'AD_CAMPAIGN_REVIEW_REQUESTED':
      return resolveAdCampaignReviewRequestedEventIntents(event.id, event.payload as AdCampaignEventPayload);
    case 'AD_CAMPAIGN_APPROVED':
      return resolveAdCampaignApprovedEventIntents(event.id, event.payload as AdCampaignEventPayload);
    case 'AD_CAMPAIGN_CHANGES_REQUESTED':
      return resolveAdCampaignChangesRequestedEventIntents(
        event.id,
        event.payload as AdCampaignEventPayload,
      );
    default:
      return 0;
  }
}

export async function resolvePendingNotificationEvents(limit = 100) {
  const pendingEvents = await prisma.notificationEvent.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      eventType: true,
      payload: true,
    },
  });

  let resolvedEventCount = 0;
  let failedEventCount = 0;
  let createdIntentCount = 0;

  for (const event of pendingEvents) {
    const marked = await prisma.notificationEvent.updateMany({
      where: { id: event.id, status: 'PENDING' },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
        errorMessage: null,
      },
    });

    if (marked.count === 0) {
      continue;
    }

    try {
      const count = await resolveNotificationEvent(event);
      createdIntentCount += count;
      resolvedEventCount += 1;

      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          failedAt: null,
          errorMessage: null,
        },
      });
    } catch (error) {
      failedEventCount += 1;

      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: truncateErrorMessage(error),
        },
      });
    }
  }

  return {
    processedEventCount: pendingEvents.length,
    resolvedEventCount,
    failedEventCount,
    createdIntentCount,
  };
}

export async function processPendingKakaoDeliveryIntents(limit = 100) {
  const pendingIntents = await prisma.notificationDeliveryIntent.findMany({
    where: {
      status: 'PENDING',
      channel: 'KAKAO',
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      templateType: true,
      recipientUserId: true,
      messageText: true,
      targetUrl: true,
      relatedPostId: true,
      searchQuery: true,
      recipientUser: {
        select: {
          id: true,
          kakaoAccessToken: true,
          kakaoRefreshToken: true,
          kakaoAccessTokenExpiresAt: true,
        },
      },
    },
  });

  let successCount = 0;
  let failedCount = 0;

  for (const intent of pendingIntents) {
    const marked = await prisma.notificationDeliveryIntent.updateMany({
      where: { id: intent.id, status: 'PENDING' },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
        errorMessage: null,
      },
    });

    if (marked.count === 0) {
      continue;
    }

    try {
      const delivery = await prisma.kakaoMessageDelivery.create({
        data: {
          deliveryType: intent.templateType,
          recipientUserId: intent.recipientUserId,
          messageText: intent.messageText,
          targetUrl: intent.targetUrl,
          relatedPostId: intent.relatedPostId,
          searchQuery: intent.searchQuery,
        },
        select: { id: true },
      });

      const result = await attemptKakaoMessageDelivery({
        deliveryId: delivery.id,
        recipient: intent.recipientUser as DeliveryRecipient,
        messageText: intent.messageText,
        targetUrl: intent.targetUrl,
      });

      if (result.ok) {
        successCount += 1;
        await prisma.notificationDeliveryIntent.update({
          where: { id: intent.id },
          data: {
            status: 'SUCCESS',
            attemptCount: { increment: 1 },
            sentAt: new Date(),
            failedAt: null,
            errorMessage: null,
            kakaoDeliveryId: delivery.id,
          },
        });
      } else {
        failedCount += 1;
        await prisma.notificationDeliveryIntent.update({
          where: { id: intent.id },
          data: {
            status: 'FAILED',
            attemptCount: { increment: 1 },
            failedAt: new Date(),
            errorMessage: result.errorMessage ?? '카카오 전송 실패',
            kakaoDeliveryId: delivery.id,
          },
        });
      }
    } catch (error) {
      failedCount += 1;
      await prisma.notificationDeliveryIntent.update({
        where: { id: intent.id },
        data: {
          status: 'FAILED',
          attemptCount: { increment: 1 },
          failedAt: new Date(),
          errorMessage: truncateErrorMessage(error),
        },
      });
    }
  }

  return {
    processedIntentCount: pendingIntents.length,
    successCount,
    failedCount,
  };
}
