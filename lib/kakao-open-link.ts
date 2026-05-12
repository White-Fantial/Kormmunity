export const KAKAO_OPEN_LINK_PATTERN_STRING = 'https://open\\.kakao\\.com/(o|me)/[A-Za-z0-9_-]+';
export const INVALID_KAKAO_OPEN_LINK_MESSAGE_KO = '올바른 카카오 오픈채팅 링크를 입력해주세요.';

const KAKAO_OPEN_LINK_PATTERN = /https?:\/\/open\.kakao\.com\/(o|me)\/[A-Za-z0-9_-]+/;
const KAKAO_OPEN_LINK_STRICT_PATTERN = new RegExp(`^${KAKAO_OPEN_LINK_PATTERN_STRING}$`);

export function extractKakaoOpenLink(input: string): string {
  if (!input) return '';

  const match = input.match(KAKAO_OPEN_LINK_PATTERN);
  return match ? match[0].replace(/^http:\/\//, 'https://') : input.trim();
}

export function isValidKakaoOpenLink(input: string): boolean {
  const cleaned = extractKakaoOpenLink(input);
  return KAKAO_OPEN_LINK_STRICT_PATTERN.test(cleaned);
}
