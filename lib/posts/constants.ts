export const SALE_CATEGORY_SLUG = 'sale';
export const NOTICE_CATEGORY_SLUG = 'notice';
export const FEATURED_CATEGORY_SLUG = 'featured';
export const ALWAYS_INCLUDED_CATEGORY_SLUGS = [
  NOTICE_CATEGORY_SLUG,
  FEATURED_CATEGORY_SLUG,
] as const;

export const POST_PREVIEW_LENGTH = 80;

export function truncatePostBody(body: string, length = POST_PREVIEW_LENGTH): string {
  if (body.length <= length) return body;
  return `${body.slice(0, length)}…`;
}
