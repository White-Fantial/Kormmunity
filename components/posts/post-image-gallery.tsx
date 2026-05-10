'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

type GalleryImage = {
  id: string;
  url: string;
};

type PostImageGalleryProps = {
  images: GalleryImage[];
  postTitle: string | null;
};

type LightboxState = {
  open: boolean;
  index: number;
  scale: number;
  originX: number;
  originY: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.3;

export function PostImageGallery({ images, postTitle }: PostImageGalleryProps) {
  const [lb, setLb] = useState<LightboxState>({
    open: false,
    index: 0,
    scale: 1,
    originX: 50,
    originY: 50,
  });

  const imgRef = useRef<HTMLDivElement>(null);

  // Last touch-distance for pinch zoom
  const lastPinchDistance = useRef<number | null>(null);

  const open = useCallback((index: number) => {
    setLb({ open: true, index, scale: 1, originX: 50, originY: 50 });
  }, []);

  const close = useCallback(() => {
    setLb((prev) => ({ ...prev, open: false, scale: 1 }));
  }, []);

  const navigate = useCallback(
    (delta: number) => {
      setLb((prev) => ({
        ...prev,
        index: (prev.index + delta + images.length) % images.length,
        scale: 1,
        originX: 50,
        originY: 50,
      }));
    },
    [images.length],
  );

  // Keyboard navigation & Escape
  useEffect(() => {
    if (!lb.open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lb.open, close, navigate]);

  // Prevent background scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lb.open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lb.open]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
    setLb((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta));
      return { ...prev, scale: next };
    });
  }, []);

  // Pinch zoom
  const getPinchDistance = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      lastPinchDistance.current = getPinchDistance(e.touches);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && lastPinchDistance.current !== null) {
      e.preventDefault();
      const newDist = getPinchDistance(e.touches);
      const ratio = newDist / lastPinchDistance.current;
      lastPinchDistance.current = newDist;
      setLb((prev) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * ratio));
        return { ...prev, scale: next };
      });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastPinchDistance.current = null;
  }, []);

  // Double-tap to toggle zoom
  const lastTapTime = useRef(0);
  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      // Double tap/click: toggle between 1x and 2x
      setLb((prev) => {
        if (prev.scale > MIN_SCALE) {
          return { ...prev, scale: 1, originX: 50, originY: 50 };
        }
        // Zoom toward the click position
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const ox = ((e.clientX - rect.left) / rect.width) * 100;
        const oy = ((e.clientY - rect.top) / rect.height) * 100;
        return { ...prev, scale: 2, originX: ox, originY: oy };
      });
    }
    lastTapTime.current = now;
  }, []);

  const currentImage = images[lb.index];

  return (
    <>
      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => open(index)}
            className="relative h-36 overflow-hidden rounded-lg border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#fee500]"
            aria-label={`${postTitle ?? '게시글'} 이미지 ${index + 1} 크게 보기`}
          >
            <Image
              src={image.url}
              alt={`${postTitle ?? '게시글'} 이미지 ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-transform duration-200 hover:scale-105"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lb.open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="이미지 크게 보기"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev button */}
          {images.length > 1 ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="이전 이미지"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null}

          {/* Next button */}
          {images.length > 1 ? (
            <button
              type="button"
              onClick={() => navigate(1)}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="다음 이미지"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : null}

          {/* Image container */}
          <div
            ref={imgRef}
            className="relative flex h-full w-full cursor-zoom-in items-center justify-center overflow-hidden"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleTap}
          >
            {/* Backdrop click to close (only when not zoomed) */}
            {lb.scale === 1 ? (
              <div
                className="absolute inset-0"
                onClick={close}
                aria-hidden="true"
              />
            ) : null}

            <div
              style={{
                transform: `scale(${lb.scale})`,
                transformOrigin: `${lb.originX}% ${lb.originY}%`,
                transition: 'transform 0.15s ease',
                maxWidth: '90vw',
                maxHeight: '90vh',
                position: 'relative',
              }}
            >
              <Image
                key={currentImage.id}
                src={currentImage.url}
                alt={`${postTitle ?? '게시글'} 이미지 ${lb.index + 1}`}
                width={1200}
                height={900}
                style={{
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
                priority
              />
            </div>
          </div>

          {/* Counter */}
          {images.length > 1 ? (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              {lb.index + 1} / {images.length}
            </div>
          ) : null}

          {/* Zoom hint */}
          <div className="absolute bottom-4 right-4 text-xs text-white/50 hidden sm:block">
            스크롤로 확대 · 더블클릭으로 확대/축소
          </div>
        </div>
      ) : null}
    </>
  );
}
