'use client';

import { useEffect, useRef } from 'react';

type AdImpressionTrackerProps = {
  campaignId: string;
  adContentId: string;
  placementType: string;
  positionIndex?: number;
};

export function AdImpressionTracker({
  campaignId,
  adContentId,
  placementType,
  positionIndex = 0,
}: AdImpressionTrackerProps) {
  const sentRef = useRef(false);
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }

    const container = markerRef.current?.closest('article');
    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !sentRef.current) {
          sentRef.current = true;
          void fetch('/api/ads/impression', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId, adContentId, placementType, positionIndex }),
            keepalive: true,
          });
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [adContentId, campaignId, placementType, positionIndex]);

  return <span ref={markerRef} aria-hidden="true" />;
}
