import { prisma } from '@/lib/db/prisma';
import { refreshKakaoAccessToken } from '@/lib/kakao/oauth';

const KAKAO_MEMO_SEND_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';
const PREVIEW_LENGTH = 80;
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const MAX_ERROR_MESSAGE_LENGTH = 500;
const MAX_RESPONSE_ERROR_LENGTH = 200;

type NotifyPostInput = {
  id: string;
  title: string | null;
  body: string;
  authorDisplayName: string;
  imageUrl: string | null;
};

type NotifyCommentInput = {
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

async function ensureValidAccessToken(user: DeliveryRecipient) {
  if (!user.kakaoAccessToken) {
    return null;
  }

  const shouldRefresh =
    user.kakaoAccessTokenExpiresAt &&
    user.kakaoAccessTokenExpiresAt.getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS;

  if (!shouldRefresh) {
    return user.kakaoAccessToken;
  }

  if (!user.kakaoRefreshToken) {
    return null;
  }

  const refreshed = await refreshKakaoAccessToken(user.kakaoRefreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      kakaoAccessToken: refreshed.accessToken,
      kakaoRefreshToken: refreshed.refreshToken ?? undefined,
      kakaoAccessTokenExpiresAt: refreshed.accessTokenExpiresAt,
    },
  });

  return refreshed.accessToken;
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
    throw new Error(
      `Kakao memo send failed: ${response.status}${responseText ? ` (${responseText})` : ''}`,
    );
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
        '카카오 액세스 토큰이 없거나 만료되어 메시지를 전송할 수 없습니다. 사용자의 카카오 연동 상태를 확인해주세요.',
      );
    }

    await sendKakaoMemo(accessToken, params.messageText, params.targetUrl);

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

export async function notifySearchAlertsForPost(post: NotifyPostInput) {
  const alerts = await prisma.searchAlert.findMany({
    where: {
      user: { notifyOnKakaoForSearchAlert: true },
    },
    select: {
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
    return;
  }

  const matchingAlerts = alerts.filter((alert) => matchesAlertQuery(post, alert.query));
  if (matchingAlerts.length === 0) {
    return;
  }

  const siteBaseUrl = getSiteBaseUrl();
  const postUrl = siteBaseUrl ? `${siteBaseUrl}/posts/${post.id}` : null;
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

  const message = messageLines.join('\n');

  const results = await Promise.allSettled(
    matchingAlerts.map(async (alert) => {
      const delivery = await prisma.kakaoMessageDelivery.create({
        data: {
          deliveryType: 'SEARCH_ALERT',
          recipientUserId: alert.user.id,
          messageText: message,
          targetUrl: postUrl,
          relatedPostId: post.id,
          searchQuery: alert.query,
        },
        select: { id: true },
      });

      return attemptKakaoMessageDelivery({
        deliveryId: delivery.id,
        recipient: alert.user,
        messageText: message,
        targetUrl: postUrl,
      });
    }),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[kakao/message] failed to create or attempt search alert delivery', result.reason);
    }
  }
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
    const delivery = await prisma.kakaoMessageDelivery.create({
      data: {
        deliveryType: 'COMMENT_NOTIFICATION',
        recipientUserId: post.author.id,
        messageText: message,
        targetUrl: postUrl,
        relatedPostId: input.postId,
      },
      select: { id: true },
    });

    await attemptKakaoMessageDelivery({
      deliveryId: delivery.id,
      recipient: post.author,
      messageText: message,
      targetUrl: postUrl,
    });
  } catch (error) {
    console.error('[kakao/message] failed to send comment notification', error);
  }
}

export async function retryKakaoMessageDelivery(deliveryId: string, adminUserId: string) {
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
    return { ok: false as const, message: '이미 전송이 완료된 메시지입니다.' };
  }

  const result = await attemptKakaoMessageDelivery({
    deliveryId: delivery.id,
    recipient: delivery.recipientUser,
    messageText: delivery.messageText,
    targetUrl: delivery.targetUrl,
    retriedByAdminId: adminUserId,
  });

  if (!result.ok) {
    return {
      ok: false as const,
      message: `재발송에 실패했습니다: ${result.errorMessage ?? '알 수 없는 오류'}`,
    };
  }

  return { ok: true as const, message: '카카오 메시지를 다시 발송했습니다.' };
}
