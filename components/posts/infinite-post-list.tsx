'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { PostCard } from '@/components/posts/post-card';

export type InfinitePostItem = {
  id: string;
  title: string | null;
  bodyPreview: string;
  href: string;
  createdAt: string;
  isPinned?: boolean;
  pinnedAt?: string | null;
  price?: string | null;
  thumbnailUrl?: string | null;
  commentCount?: number;
  likeCount?: number;
  viewCount?: number;
  reportCount?: number;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
  tags?: { id: string; label: string }[];
  category?: { name: string; type?: string; color?: string | null };
  city?: { name: string } | null;
  author?: {
    displayName: string;
    profileImageUrl: string | null;
    isOperator?: boolean;
  };
  editHref?: string;
};

type FeedCardConfig = {
  mode: 'feed' | 'operator-board';
  showLikeAction: boolean;
  showSaveAction: boolean;
  returnTo: string;
};

type MyPostsCardConfig = {
  mode: 'my-posts';
};

type SavedCardConfig = {
  mode: 'saved';
};

export type InfiniteListCardConfig = FeedCardConfig | MyPostsCardConfig | SavedCardConfig;

type InfinitePostListProps = {
  initialPosts: InfinitePostItem[];
  initialNextCursor: string | null;
  fetchApiUrl: string;
  cardConfig: InfiniteListCardConfig;
};

function deserializePost(post: InfinitePostItem) {
  return {
    ...post,
    createdAt: new Date(post.createdAt),
    pinnedAt: post.pinnedAt ? new Date(post.pinnedAt) : null,
  };
}

function PostCardItem({
  post,
  cardConfig,
}: {
  post: InfinitePostItem;
  cardConfig: InfiniteListCardConfig;
}) {
  const base = deserializePost(post);

  if (cardConfig.mode === 'feed' || cardConfig.mode === 'operator-board') {
    return (
      <PostCard
        variant="featured"
        displayVariant="feed"
        post={{
          ...base,
          isRecommended: (base.likeCount ?? 0) >= 10,
        }}
        showLikeAction={cardConfig.showLikeAction}
        showSaveAction={cardConfig.showSaveAction}
        returnTo={cardConfig.returnTo}
      />
    );
  }

  if (cardConfig.mode === 'my-posts') {
    return (
      <PostCard
        variant="compact"
        displayVariant="my-posts"
        post={base}
        moreMenu={post.editHref ? { editHref: post.editHref, postId: post.id } : undefined}
      />
    );
  }

  return (
    <PostCard
      variant="compact"
      displayVariant="saved"
      post={base}
      showActiveBookmark
    />
  );
}

export function InfinitePostList({
  initialPosts,
  initialNextCursor,
  fetchApiUrl,
  cardConfig,
}: InfinitePostListProps) {
  const [posts, setPosts] = useState<InfinitePostItem[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(Boolean(initialNextCursor));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !nextCursor) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const separator = fetchApiUrl.includes('?') ? '&' : '?';
      const url = `${fetchApiUrl}${separator}cursor=${encodeURIComponent(nextCursor)}`;
      const res = await fetch(url);

      if (!res.ok) return;

      const data = (await res.json()) as {
        posts: InfinitePostItem[];
        nextCursor: string | null;
        hasNextPage: boolean;
      };

      setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {
      // silently ignore load errors
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [fetchApiUrl, nextCursor]);

  useEffect(() => {
    if (!hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '300px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id}>
          <PostCardItem post={post} cardConfig={cardConfig} />
        </div>
      ))}
      {hasMore && (
        <div ref={sentinelRef} aria-hidden="true" className="py-3 text-center text-sm text-[#aaa]">
          {isLoading ? '로딩 중...' : ''}
        </div>
      )}
    </div>
  );
}
