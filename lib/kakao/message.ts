import { prisma } from '@/lib/db/prisma';
import { refreshKakaoAccessToken } from '@/lib/kakao/oauth';

const KAKAO_MEMO_SEND_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';
const PREVIEW_LENGTH = 80;
const TOKEN_REFRESH_BUFFER_MS = 60_000;

type NotifyPostInput = {
  id: string;
  title: string | null;
  body: string;
  authorDisplayName: string;
  imageUrl: string | null;
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

function getSiteBaseUrl() {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicitSiteUrl) {
    return explicitSiteUrl.replace(/\/$/, '');
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
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

async function ensureValidAccessToken(user: {
  id: string;
  kakaoAccessToken: string | null;
  kakaoRefreshToken: string | null;
  kakaoAccessTokenExpiresAt: Date | null;
}) {
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
    throw new Error(`Kakao memo send failed: ${response.status}`);
  }
}

export async function notifySearchAlertsForPost(post: NotifyPostInput) {
  const alerts = await prisma.searchAlert.findMany({
    where: {
      isActive: true,
      notifyOnKakao: true,
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

  const siteBaseUrl = getSiteBaseUrl();
  if (!siteBaseUrl) {
    console.error('[kakao/message] site base URL is not configured');
    return;
  }

  const postUrl = `${siteBaseUrl}/posts/${post.id}`;
  const previewSource = post.title?.trim() || post.body.trim();
  const preview = truncateText(previewSource, PREVIEW_LENGTH);
  const bodyPreview = truncateText(post.body.trim(), PREVIEW_LENGTH);

  for (const alert of alerts) {
    if (!matchesAlertQuery(post, alert.query)) {
      continue;
    }

    try {
      const accessToken = await ensureValidAccessToken(alert.user);
      if (!accessToken) {
        continue;
      }

      const messageLines = [
        `[검색 알림] ${preview}`,
        `작성자: ${post.authorDisplayName}`,
        `내용: ${bodyPreview}`,
        `링크: ${postUrl}`,
      ];

      if (post.imageUrl) {
        messageLines.push(`사진: ${post.imageUrl}`);
      }

      await sendKakaoMemo(accessToken, messageLines.join('\n'), postUrl);
    } catch (error) {
      console.error('[kakao/message] failed to send alert', error);
    }
  }
}
