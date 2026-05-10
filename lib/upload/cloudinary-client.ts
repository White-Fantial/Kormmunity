/**
 * Client-side Cloudinary upload helper.
 *
 * Images are uploaded directly from the browser to Cloudinary using an
 * unsigned upload preset.  This avoids routing large multipart payloads
 * through the Next.js server, which prevents body-size/timeout failures
 * when uploading three or more images at once.
 *
 * Required environment variables (must be NEXT_PUBLIC_ so the browser can
 * read them):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 */

/** Maximum number of images allowed per post. */
export const MAX_CLIENT_IMAGES = 6;

/** Maximum size in bytes per image (10 MB). */
const MAX_CLIENT_IMAGE_BYTES = 10 * 1024 * 1024;

/** Shape of an image that has been uploaded to Cloudinary from the browser. */
export type ClientUploadedImage = {
  url: string;
  publicId: string | null;
  width: number | null;
  height: number | null;
};

function getClientConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary 클라이언트 환경 변수(NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)가 설정되지 않았습니다.');
  }

  return { cloudName, uploadPreset };
}

/**
 * Validate image files before uploading.
 * Returns { ok: true } on success or { ok: false, message } on failure.
 */
export function validateClientImageFiles(
  files: File[],
): { ok: true } | { ok: false; message: string } {
  if (files.length > MAX_CLIENT_IMAGES) {
    return {
      ok: false,
      message: `이미지는 최대 ${MAX_CLIENT_IMAGES}장까지 업로드할 수 있어요.`,
    };
  }

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return { ok: false, message: '이미지 파일만 업로드할 수 있어요.' };
    }

    if (file.size > MAX_CLIENT_IMAGE_BYTES) {
      return { ok: false, message: '각 이미지는 10MB 이하로 업로드해 주세요.' };
    }
  }

  return { ok: true };
}

async function uploadSingleImage(
  file: File,
  cloudName: string,
  uploadPreset: string,
): Promise<ClientUploadedImage> {
  const payload = new FormData();
  payload.append('file', file);
  payload.append('upload_preset', uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: payload },
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
    publicId: data.public_id ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
  };
}

/**
 * Upload all files directly from the browser to Cloudinary.
 *
 * A concurrency limit of 2 is applied so the browser never fires more than
 * two simultaneous requests.  The original file order is preserved in the
 * returned array.
 */
export async function uploadImagesToCloudinary(
  files: File[],
): Promise<ClientUploadedImage[]> {
  const { cloudName, uploadPreset } = getClientConfig();

  const CONCURRENCY = 2;
  const results: ClientUploadedImage[] = new Array(files.length);

  // Queue items by index so each worker knows where to store its result.
  const queue = files.map((file, index) => ({ file, index }));

  async function runWorker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      results[item.index] = await uploadSingleImage(
        item.file,
        cloudName,
        uploadPreset,
      );
    }
  }

  // Start exactly CONCURRENCY workers and wait for all of them to finish.
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, files.length) }, () =>
      runWorker(),
    ),
  );

  return results;
}
