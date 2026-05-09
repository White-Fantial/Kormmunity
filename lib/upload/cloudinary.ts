import { createHash } from 'node:crypto';

// TODO(Phase 6): introduce upload provider adapter to support UploadThing/S3-compatible storage.
const CLOUDINARY_PROVIDER = 'cloudinary';

export const MAX_UPLOAD_IMAGE_COUNT = 5;
const MAX_UPLOAD_IMAGE_BYTES = 8 * 1024 * 1024;

type UploadedImage = {
  url: string;
  provider: string;
  providerPublicId: string | null;
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

export function validateImageFiles(imageFiles: File[]) {
  if (imageFiles.length > MAX_UPLOAD_IMAGE_COUNT) {
    return {
      ok: false as const,
      message: `이미지는 최대 ${MAX_UPLOAD_IMAGE_COUNT}장까지 업로드할 수 있어요.`,
    };
  }

  for (const imageFile of imageFiles) {
    if (!imageFile.type.startsWith('image/')) {
      return {
        ok: false as const,
        message: '이미지 파일만 업로드할 수 있어요.',
      };
    }

    if (imageFile.size > MAX_UPLOAD_IMAGE_BYTES) {
      return {
        ok: false as const,
        message: '각 이미지는 8MB 이하로 업로드해 주세요.',
      };
    }
  }

  return { ok: true as const };
}

export async function uploadImageToCloudinary(file: File): Promise<UploadedImage> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = 'kakao-posts';
  const signature = createSignature({ folder, timestamp }, apiSecret);

  const payload = new FormData();
  payload.append('file', file);
  payload.append('api_key', apiKey);
  payload.append('folder', folder);
  payload.append('timestamp', timestamp);
  payload.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: payload,
    },
  );

  const data = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    width?: number;
    height?: number;
    error?: { message?: string };
  };

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message ?? '이미지 업로드에 실패했습니다.');
  }

  return {
    url: data.secure_url,
    provider: CLOUDINARY_PROVIDER,
    providerPublicId: data.public_id ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
  };
}
