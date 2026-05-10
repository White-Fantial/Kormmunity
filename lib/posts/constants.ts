export const SALE_CATEGORY_SLUG = 'sale';

export const POST_PREVIEW_LENGTH = 80;

export function truncatePostBody(body: string, length = POST_PREVIEW_LENGTH): string {
  if (body.length <= length) return body;
  return `${body.slice(0, length)}…`;
}
