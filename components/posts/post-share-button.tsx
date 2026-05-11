'use client';

import { useMemo, useState } from 'react';

const PREVIEW_LENGTH = 80;

type PostShareButtonProps = {
  title: string | null;
  body: string;
  imageUrl: string | null;
};

function buildPreviewText(title: string | null, body: string) {
  const normalizedBody = body.replace(/\s+/g, ' ').trim();
  if (title?.trim()) {
    return title.trim();
  }
  if (normalizedBody.length <= PREVIEW_LENGTH) {
    return normalizedBody;
  }
  return `${normalizedBody.slice(0, PREVIEW_LENGTH).trimEnd()}…`;
}

export function PostShareButton({ title, body, imageUrl }: PostShareButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  const previewText = useMemo(() => buildPreviewText(title, body), [title, body]);

  const onShare = async () => {
    const shareUrl = window.location.href;
    const textLines = [previewText, `링크: ${shareUrl}`];
    if (imageUrl) {
      textLines.push(`이미지: ${imageUrl}`);
    }
    const shareText = textLines.join('\n');

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: previewText,
          text: shareText,
        });
        setMessage('게시글 공유를 완료했어요.');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('[post-share] web share failed', error);
      }
    }

    if (typeof navigator.clipboard?.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(shareText);
        setMessage('공유 내용을 클립보드에 복사했어요.');
        return;
      } catch (error) {
        console.error('[post-share] clipboard copy failed', error);
        setMessage('공유 내용을 클립보드에 복사하지 못했어요.');
        return;
      }
    }

    setMessage('이 브라우저에서는 자동 공유를 지원하지 않아요.');
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onShare}
        aria-label="게시글 공유하기"
        className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
      >
        게시글 공유하기
      </button>
      {message ? <p aria-live="polite" className="text-xs text-[#666]">{message}</p> : null}
    </div>
  );
}
