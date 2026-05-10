const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';

export function getKakaoAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.KAKAO_CLIENT_ID ?? '',
    redirect_uri: process.env.KAKAO_REDIRECT_URI ?? '',
    response_type: 'code',
    state,
  });
  return `${KAKAO_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.KAKAO_CLIENT_ID ?? '',
    redirect_uri: process.env.KAKAO_REDIRECT_URI ?? '',
    code,
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
    throw new Error(`Kakao token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export type KakaoUserInfo = {
  kakaoId: string;
  displayName: string;
  profileImageUrl: string | null;
};

export async function getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
  const response = await fetch(KAKAO_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Kakao user info fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    id: number;
    kakao_account?: {
      profile?: {
        nickname?: string;
        profile_image_url?: string;
      };
    };
  };

  const kakaoId = String(data.id);
  const profile = data.kakao_account?.profile;
  const displayName = profile?.nickname ?? '카카오 사용자';
  const profileImageUrl = profile?.profile_image_url ?? null;

  return { kakaoId, displayName, profileImageUrl };
}
