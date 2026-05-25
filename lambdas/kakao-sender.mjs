import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const KAKAO_MEMO_SEND_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const MAX_ERROR_MESSAGE_LENGTH = 500;
const MAX_RESPONSE_ERROR_LENGTH = 200;

class KakaoAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'KakaoAuthError';
  }
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

function formatErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return truncateText(error.message, MAX_ERROR_MESSAGE_LENGTH);
  }
  return '알 수 없는 카카오 전송 오류가 발생했습니다.';
}

async function refreshKakaoAccessToken(refreshToken) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.KAKAO_CLIENT_ID ?? '',
    refresh_token: refreshToken,
  });

  if (process.env.KAKAO_CLIENT_SECRET) {
    params.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
  }

  const response = await fetch(KAKAO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Kakao token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const expiresIn = typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    accessTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
  };
}

async function refreshAndPersistKakaoToken(userId, refreshToken) {
  try {
    const refreshed = await refreshKakaoAccessToken(refreshToken);
    await prisma.user.update({
      where: { id: userId },
      data: {
        kakaoAccessToken: refreshed.accessToken,
        kakaoRefreshToken: refreshed.refreshToken,
        kakaoAccessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      },
    });

    return refreshed.accessToken;
  } catch (error) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        kakaoAccessToken: null,
        kakaoRefreshToken: null,
        kakaoAccessTokenExpiresAt: null,
      },
    });
    throw error;
  }
}

async function ensureValidAccessToken(user) {
  if (!user.kakaoAccessToken) {
    return null;
  }

  const expiresAt = user.kakaoAccessTokenExpiresAt?.getTime() ?? null;
  const shouldRefresh = expiresAt === null || expiresAt <= Date.now() + TOKEN_REFRESH_BUFFER_MS;

  if (!shouldRefresh) {
    return user.kakaoAccessToken;
  }

  if (!user.kakaoRefreshToken) {
    return null;
  }

  return refreshAndPersistKakaoToken(user.id, user.kakaoRefreshToken);
}

async function sendKakaoMemo(accessToken, text, url) {
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
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }).toString(),
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

async function attemptDelivery(delivery) {
  const attemptedAt = new Date();

  if (!delivery.targetUrl) {
    const errorMessage =
      '사이트 URL이 설정되지 않아 카카오 메시지를 전송할 수 없습니다. 환경 변수를 확인해주세요.';

    await prisma.kakaoMessageDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        errorMessage,
        attemptCount: { increment: 1 },
        lastAttemptAt: attemptedAt,
      },
    });
    return;
  }

  try {
    const accessToken = await ensureValidAccessToken(delivery.recipientUser);
    if (!accessToken) {
      throw new Error('카카오 액세스 토큰이 없거나 만료되었습니다. 카카오 재연동이 필요합니다.');
    }

    try {
      await sendKakaoMemo(accessToken, delivery.messageText, delivery.targetUrl);
    } catch (error) {
      if (error instanceof KakaoAuthError && delivery.recipientUser.kakaoRefreshToken) {
        const freshToken = await refreshAndPersistKakaoToken(
          delivery.recipientUser.id,
          delivery.recipientUser.kakaoRefreshToken,
        );
        await sendKakaoMemo(freshToken, delivery.messageText, delivery.targetUrl);
      } else {
        throw error;
      }
    }

    await prisma.kakaoMessageDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'SUCCESS',
        errorMessage: null,
        attemptCount: { increment: 1 },
        lastAttemptAt: attemptedAt,
        sentAt: attemptedAt,
      },
    });
  } catch (error) {
    await prisma.kakaoMessageDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        errorMessage: formatErrorMessage(error),
        attemptCount: { increment: 1 },
        lastAttemptAt: attemptedAt,
      },
    });
    throw error;
  }
}

async function processDeliveryId(deliveryId) {
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

  if (!delivery || delivery.status === 'SUCCESS') {
    return;
  }

  await attemptDelivery(delivery);
}

export async function handler(event) {
  const records = event?.Records ?? [];

  for (const record of records) {
    const payload = JSON.parse(record.body);
    if (payload?.eventType !== 'DELIVERY_CREATED' || !payload?.deliveryId) {
      continue;
    }

    await processDeliveryId(payload.deliveryId);
  }
}
