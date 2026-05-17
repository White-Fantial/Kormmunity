import { createHash } from 'node:crypto';

export const POST_VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getPostViewWindowKey(now = new Date()) {
  return String(Math.floor(now.getTime() / POST_VIEW_WINDOW_MS));
}

export function createAnonymousPostViewFingerprint({
  ip,
  userAgent,
}: {
  ip: string;
  userAgent: string;
}) {
  const salt = process.env.POST_VIEW_FINGERPRINT_SALT ?? 'kormmunity-post-view';

  return createHash('sha256')
    .update(`${salt}:${ip}:${userAgent}`)
    .digest('hex');
}
