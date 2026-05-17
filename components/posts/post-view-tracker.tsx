'use client';

import { useEffect, useRef } from 'react';

type PostViewTrackerProps = {
  postId: string;
};

export function PostViewTracker({ postId }: PostViewTrackerProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current || !postId) {
      return;
    }

    sentRef.current = true;

    void fetch(`/api/posts/${postId}/view`, {
      method: 'POST',
      keepalive: true,
      cache: 'no-store',
    });
  }, [postId]);

  return null;
}
