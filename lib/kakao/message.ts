import type { KakaoMessageDeliveryType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { refreshKakaoAccessToken } from '@/lib/kakao/oauth';
import {
  enqueueKakaoSendDelivery,
  enqueueSearchMatchPostCreated,
  isKakaoQueuePipelineEnabled,
  isSearchMatcherLambdaEnabled,
} from '@/lib/kakao/queue';

class KakaoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KakaoAuthError';
  }
}

const KAKAO_MEMO_SEND_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';
const PREVIEW_LENGTH = 80;
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const MAX_ERROR_MESSAGE_LENGTH = 500;
const MAX_RESPONSE_ERROR_LENGTH = 200;

export type NotifyPostInput = {
  id: string;
  title: string | null;
  body: string;
  authorDisplayName: string;
  imageUrl: string | null;
};

export type NotifyCommentInput = {
  commentId: string;
  postId: string;
  postTitle: string | null;
  postBody: string;
  commenterDisplayName: string;
  commentBody: string;
};

type DeliveryRecipient = {
  id: string;
  kakaoAccessToken: string | null;
  kakaoRefreshToken: string | null;
  kakaoAccessTokenExpiresAt: Date | null;
};

type DeliveryAttemptResult = {
  ok: boolean;
  errorMessage?: string;
};

type ExistingOrCreatedDelivery = {
  id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created: boolean;
};

export type AdKakaoNotificationInput = {
  deliveryType:
    | 'AD_PROPOSAL_SUBMITTED'
    | 'AD_CAMPAIGN_REVIEW_REQUESTED'
    | 'AD_CAMPAIGN_APPROVED'
    | 'AD_CAMPAIGN_CHANGES_REQUESTED';
  recipientUserIds: string[];
  excludeUserId?: string;
  dedupeScopeId: string;
  messageText: string;
  targetUrl?: string | null;
  relatedPostId?: string | null;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return truncateText(error.message, MAX_ERROR_MESSAGE_LENGTH);
  }
  return '알 수 없는 카카오 전송 오류가 발생했습니다.';
}

function normalizeSiteUrl(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/$/, '');
  }
}

function getSiteBaseUrl() {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicitSiteUrl) {
    return normalizeSiteUrl(explicitSiteUrl);
  }

  if (process.env.NEXTAUTH_URL) {
    return normalizeSiteUrl(process.env.NEXTAUTH_URL);
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return null;
}

function matchesAlertQuery(post: NotifyPostInput, query: string) {
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

async function refreshAndPersistKakaoToken(userId: string, refreshToken: string): Promise<string> {
  try {
    const refreshed = await refreshKakaoAccessToken(refreshToken);
    await prisma.user.update({
      where: { id: userId },
      data: {
        kakaoAccessToken: refreshed.accessToken,
        kakaoRefreshToken: refreshed.refreshToken ?? undefined,
        kakaoAccessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      },
    });
    return refreshed.accessToken;
  } catch (error) {
    console.error('[kakao/message] token refresh failed; clearing stored kakao tokens', error);
    await prisma.user.update({
      where: { id: userId },
      data: {
        kakaoAccessToken: null,
        kakaoRefreshToken: null,
        kakaoAccessTokenExpiresAt: null,
      },
    });
    throw new Error('카카오 리프레시 토큰이 만료되었습니다. 카카오 재연동이 필요합니다.');
  }
}

async function ensureValidAccessToken(user: DeliveryRecipient) {
  if (!user.kakaoAccessToken) {
    return null;
  }

  const expiresAt = user.kakaoAccessTokenExpiresAt?.getTime() ?? null;
  const shouldRefresh =
    expiresAt === null || expiresAt <= Date.now() + TOKEN_REFRESH_BUFFER_MS;

  if (!shouldRefresh) {
    return user.kakaoAccessToken;
  }

  if (!user.kakaoRefreshToken) {
    return null;
  }

  return refreshAndPersistKakaoToken(user.id, user.kakaoRefreshToken);
}

async function sendKakaoMemo(accessToken: string, text: string, url: string) {
  const templateObject = {
    object_type: 'text',
    text,
    link: {
      web_url: url,
      mobile_web_url: url,
    },
    button_title: '게시글 보기',
  };

  const response = await fetch(KAKAO_MEMO_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      template_object: JSON.stringify(templateObject),
    }).toString(),
  });

  if (!response.ok) {
    const responseText = truncateText(await response.text(), MAX_RESPONSE_ERROR_LENGTH);
    const message = `Kakao memo send failed: ${response.status}${responseText ? ` (${responseText})` : ''}`;
    if (response.status === 401) {
      throw new KakaoAuthError(message);
    }
    throw new Error(message);
  }
}

async function attemptKakaoMessageDelivery(params: {
  deliveryId: string;
  recipient: DeliveryRecipient;
  messageText: string;
  targetUrl: string | null;
  retriedByAdminId?: string;
}): Promise<DeliveryAttemptResult> {
  const attemptedAt = new Date();

  if (!params.targetUrl) {
    const errorMessage =
      '사이트 URL이 설정되지 않아 카카오 메시지를 전송할 수 없습니다. 환경 변수를 확인해주세요.';
    await prisma.kakaoMessageDelivery.update({
      where: { id: params.deliveryId },
      data: {
        status: 'FAILED',
        errorMessage,
        attemptCount: { increment: 1 },
        lastAttemptAt: attemptedAt,
        retriedByAdminId: params.retriedByAdminId,
      },
    });
    return { ok: false, errorMessage };
  }

  try {
    const accessToken = await ensureValidAccessToken(params.recipient);
    if (!accessToken) {
      throw new Error(
        '카카오 액세스 토큰이 없거나 만료되었습니다. 카카오 재연동이 필요합니다.',
      );
    }

    try {
      await sendKakaoMemo(accessToken, params.messageText, params.targetUrl);
    } catch (sendError) {
      if (sendError instanceof KakaoAuthError && params.recipient.kakaoRefreshToken) {
        const freshToken = await refreshAndPersistKakaoToken(
          params.recipient.id,
          params.recipient.kakaoRefreshToken,
        );
        await sendKakaoMemo(freshToken, params.messageText, params.targetUrl);
      } else {
        throw sendError;
      }
    }

    await prisma.kakaoMessageDelivery.update({
      where: { id: params.deliveryId },
      data: {
        status: 'SUCCESS',
        errorMessage: null,
        attemptCount: { increment: 1 },
        lastAttemptAt: attemptedAt,
        sentAt: attemptedAt,
        retriedByAdminId: params.retriedByAdminId,
      },
    });
    return { ok: true };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    await prisma.kakaoMessageDelivery.update({
      where: { id: params.deliveryId },
      data: {
        status: 'FAILED',
        errorMessage,
        attemptCount: { increment: 1 },
        lastAttemptAt: attemptedAt,
        retriedByAdminId: params.retriedByAdminId,
      },
    });
    return { ok: false, errorMessage };
  }
}

async function findOrCreateDeliveryByDedupeKey(params: {
  dedupeKey: string;
  deliveryType: KakaoMessageDeliveryType;
  recipientUserId: string;
  messageText: string;
  targetUrl: string | null;
  relatedPostId?: string | null;
  searchQuery?: string | null;
}): Promise<ExistingOrCreatedDelivery> {
  const existing = await prisma.kakaoMessageDelivery.findUnique({
    where: { dedupeKey: params.dedupeKey },
    select: { id: true, status: true },
  });

  if (existing) {
    return { ...existing, created: false };
  }

  try {
    const created = await prisma.kakaoMessageDelivery.create({
      data: {
        dedupeKey: params.dedupeKey,
        deliveryType: params.deliveryType,
        recipientUserId: params.recipientUserId,
        messageText: params.messageText,
        targetUrl: params.targetUrl,
        relatedPostId: params.relatedPostId ?? null,
        searchQuery: params.searchQuery ?? null,
      },
      select: { id: true, status: true },
    });

    return { ...created, created: true };
  } catch {
    const raced = await prisma.kakaoMessageDelivery.findUnique({
      where: { dedupeKey: params.dedupeKey },
      select: { id: true, status: true },
    });

    if (!raced) {
      throw new Error('카카오 전송 로그 생성에 실패했습니다.');
    }

    return { ...raced, created: false };
  }
}

async function maybeQueueOrSendDelivery(params: {
  deliveryId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  recipient: DeliveryRecipient;
  messageText: string;
  targetUrl: string | null;
}) {
  if (params.status === 'SUCCESS') {
    return;
  }

  if (isKakaoQueuePipelineEnabled()) {
    const enqueuedAt = new Date();
    try {
      const { messageId } = await enqueueKakaoSendDelivery(params.deliveryId);
      console.log('[kakao/queue] SQS enqueue success', {
        deliveryId: params.deliveryId,
        sqsMessageId: messageId ?? null,
        queuedAt: enqueuedAt.toISOString(),
      });
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      console.error('[kakao/queue] SQS enqueue failed', {
        deliveryId: params.deliveryId,
        error: errorMessage,
      });
      await prisma.kakaoMessageDelivery.update({
        where: { id: params.deliveryId },
        data: {
          status: 'FAILED',
          errorMessage,
          lastAttemptAt: enqueuedAt,
        },
      });
    }
    return;
  }

  await attemptKakaoMessageDelivery({
    deliveryId: params.deliveryId,
    recipient: params.recipient,
    messageText: params.messageText,
    targetUrl: params.targetUrl,
  });
}

function buildSearchAlertMessage(post: NotifyPostInput, postUrl: string | null) {
  const previewSource = post.title?.trim() || post.body.trim();
  const preview = truncateText(previewSource, PREVIEW_LENGTH);
  const bodyPreview = truncateText(post.body.trim(), PREVIEW_LENGTH);

  const messageLines = [`[검색 알림] ${preview}`, `작성자: ${post.authorDisplayName}`, `내용: ${bodyPreview}`];
  if (postUrl) {
    messageLines.push(postUrl);
  }
  if (post.imageUrl) {
    messageLines.push(`사진: ${post.imageUrl}`);
  }

  return messageLines.join('\n');
}

export async function processSearchMatchPostCreatedEvent(post: NotifyPostInput) {
  const siteBaseUrl = getSiteBaseUrl();
  const postUrl = siteBaseUrl ? `${siteBaseUrl}/posts/${post.id}` : null;
  const message = buildSearchAlertMessage(post, postUrl);

  const pageSize = 200;
  let cursorId: string | null = null;

  while (true) {
    const alerts: Array<{
      id: string;
      query: string;
      user: DeliveryRecipient;
    }> = await prisma.searchAlert.findMany({
      where: {
        user: { notifyOnKakaoForSearchAlert: true },
      },
      orderBy: { id: 'asc' },
      take: pageSize,
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        query: true,
        user: {
          select: {
            id: true,
            kakaoAccessToken: true,
            kakaoRefreshToken: true,
            kakaoAccessTokenExpiresAt: true,
          },
        },
      },
    });

    if (alerts.length === 0) {
      break;
    }

    const matchingAlerts = alerts.filter((alert: { query: string }) =>
      matchesAlertQuery(post, alert.query),
    );
    const results = await Promise.allSettled(
      matchingAlerts.map(async (alert: { query: string; user: DeliveryRecipient }) => {
        const dedupeKey = `SEARCH_ALERT:${post.id}:${alert.user.id}:${normalizeText(alert.query)}`;
        const delivery = await findOrCreateDeliveryByDedupeKey({
          dedupeKey,
          deliveryType: 'SEARCH_ALERT',
          recipientUserId: alert.user.id,
          messageText: message,
          targetUrl: postUrl,
          relatedPostId: post.id,
          searchQuery: alert.query,
        });

        await maybeQueueOrSendDelivery({
          deliveryId: delivery.id,
          status: delivery.status,
          recipient: alert.user,
          messageText: message,
          targetUrl: postUrl,
        });
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[kakao/message] failed to create or process search alert delivery', result.reason);
      }
    }

    cursorId = alerts[alerts.length - 1]?.id ?? null;
  }
}

export async function notifySearchAlertsForPost(post: NotifyPostInput) {
  if (isKakaoQueuePipelineEnabled() && isSearchMatcherLambdaEnabled()) {
    await enqueueSearchMatchPostCreated(post);
    return;
  }

  await processSearchMatchPostCreatedEvent(post);
}

export async function notifyCommentForPost(input: NotifyCommentInput) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: {
      author: {
        select: {
          id: true,
          notifyOnKakaoForComment: true,
          kakaoAccessToken: true,
          kakaoRefreshToken: true,
          kakaoAccessTokenExpiresAt: true,
        },
      },
    },
  });

  if (!post?.author.notifyOnKakaoForComment) {
    return;
  }

  try {
    const siteBaseUrl = getSiteBaseUrl();
    const postUrl = siteBaseUrl ? `${siteBaseUrl}/posts/${input.postId}` : null;
    const postPreview = truncateText(
      input.postTitle?.trim() || input.postBody.trim(),
      PREVIEW_LENGTH,
    );
    const commentPreview = truncateText(input.commentBody.trim(), PREVIEW_LENGTH);

    const messageLines = [
      `[댓글 알림] "${postPreview}"에 새 댓글이 달렸어요.`,
      `작성자: ${input.commenterDisplayName}`,
      `댓글: ${commentPreview}`,
    ];
    if (postUrl) {
      messageLines.push(postUrl);
    }

    const message = messageLines.join('\n');
    const dedupeKey = `COMMENT_NOTIFICATION:${input.commentId}`;

    const delivery = await findOrCreateDeliveryByDedupeKey({
      dedupeKey,
      deliveryType: 'COMMENT_NOTIFICATION',
      recipientUserId: post.author.id,
      messageText: message,
      targetUrl: postUrl,
      relatedPostId: input.postId,
    });

    await maybeQueueOrSendDelivery({
      deliveryId: delivery.id,
      status: delivery.status,
      recipient: post.author,
      messageText: message,
      targetUrl: postUrl,
    });
  } catch (error) {
    console.error('[kakao/message] failed to send comment notification', error);
  }
}

export async function notifyAdEventViaKakao(input: AdKakaoNotificationInput) {
  const uniqueRecipientIds = [...new Set(input.recipientUserIds)].filter(
    (recipientId) => recipientId && recipientId !== input.excludeUserId,
  );

  if (uniqueRecipientIds.length === 0) {
    return;
  }

  const recipients = await prisma.user.findMany({
    where: { id: { in: uniqueRecipientIds } },
    select: {
      id: true,
      kakaoAccessToken: true,
      kakaoRefreshToken: true,
      kakaoAccessTokenExpiresAt: true,
    },
  });

  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));

  await Promise.allSettled(
    uniqueRecipientIds.map(async (recipientId) => {
      const recipient = recipientsById.get(recipientId);
      if (!recipient) {
        return;
      }

      const dedupeKey = `${input.deliveryType}:${input.dedupeScopeId}:${recipientId}`;
      const delivery = await findOrCreateDeliveryByDedupeKey({
        dedupeKey,
        deliveryType: input.deliveryType,
        recipientUserId: recipientId,
        messageText: input.messageText,
        targetUrl: input.targetUrl ?? null,
        relatedPostId: input.relatedPostId ?? null,
      });

      await maybeQueueOrSendDelivery({
        deliveryId: delivery.id,
        status: delivery.status,
        recipient,
        messageText: input.messageText,
        targetUrl: input.targetUrl ?? null,
      });
    }),
  );
}

export async function processKakaoDeliveryById(deliveryId: string, retriedByAdminId?: string) {
  const delivery = await prisma.kakaoMessageDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      status: true,
      messageText: true,
      targetUrl: true,
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

  if (!delivery) {
    return { ok: false as const, message: '카카오 전송 로그를 찾을 수 없습니다.' };
  }

  if (delivery.status === 'SUCCESS') {
    return { ok: true as const, message: '이미 전송이 완료된 메시지입니다.' };
  }

  const result = await attemptKakaoMessageDelivery({
    deliveryId: delivery.id,
    recipient: delivery.recipientUser,
    messageText: delivery.messageText,
    targetUrl: delivery.targetUrl,
    retriedByAdminId,
  });

  if (!result.ok) {
    return {
      ok: false as const,
      message: `카카오 메시지 발송에 실패했습니다: ${result.errorMessage ?? '알 수 없는 오류'}`,
    };
  }

  return { ok: true as const, message: '카카오 메시지를 발송했습니다.' };
}

export async function retryKakaoMessageDelivery(deliveryId: string, adminUserId: string) {
  const result = await processKakaoDeliveryById(deliveryId, adminUserId);

  if (!result.ok) {
    return {
      ok: false as const,
      message: result.message.replace('카카오 메시지 발송에 실패했습니다: ', '재발송에 실패했습니다: '),
    };
  }

  if (result.message === '이미 전송이 완료된 메시지입니다.') {
    return { ok: false as const, message: result.message };
  }

  return { ok: true as const, message: '카카오 메시지를 다시 발송했습니다.' };
}
