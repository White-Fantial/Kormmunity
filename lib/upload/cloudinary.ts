import { createHash } from 'node:crypto';

// TODO(Phase 6): introduce upload provider adapter to support UploadThing/S3-compatible storage.

/** Maximum number of images allowed per post (server-side authoritative limit). */
export const MAX_UPLOAD_IMAGE_COUNT = 6;

/**
 * Shape of an image that was uploaded directly from the browser to Cloudinary
 * and whose metadata is forwarded to the server action as JSON.
 */
export type PreUploadedImage = {
  url: string;
  publicId: string | null;
  width: number | null;
  height: number | null;
};

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary 환경 변수가 설정되지 않았습니다.');
  }

  return { cloudName, apiKey, apiSecret };
}

function createSignature(params: Record<string, string>, apiSecret: string) {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1')
    .update(`${payload}${apiSecret}`)
    .digest('hex');
}

export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createSignature({ public_id: publicId, timestamp }, apiSecret);

  const payload = new FormData();
  payload.append('public_id', publicId);
  payload.append('api_key', apiKey);
  payload.append('timestamp', timestamp);
  payload.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    body: payload,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data.error?.message ?? '이미지 삭제에 실패했습니다.');
  }
}
