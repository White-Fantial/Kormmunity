'use client';

import { useCallback, useMemo, useEffect, useRef, useState } from 'react';

import { PostCard } from '@/components/posts/post-card';
import { AdCard } from '@/components/posts/AdCard';
import type { AdFeedItem } from '@/lib/ads/types';

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
  // Ad-specific fields (only present when isAd: true)
  isAd?: boolean;
  adCampaignId?: string;
  adContentId?: string | null;
  adLayout?: string;
  adSize?: string;
  adPlacementType?: string;
};

export type FeedItem = InfinitePostItem | AdFeedItem;

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
  initialPosts: FeedItem[];
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
  post: FeedItem;
  cardConfig: InfiniteListCardConfig;
}) {
  if ('isAd' in post && post.isAd) {
    return <AdCard ad={post as AdFeedItem} />;
  }

  const base = deserializePost(post as InfinitePostItem);

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
  const [posts, setPosts] = useState<FeedItem[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);

  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(Boolean(initialNextCursor));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const synchronizedPosts = useMemo(() => {
    const freshMap = new Map(
      initialPosts
        .filter((p): p is InfinitePostItem => !('isAd' in p && p.isAd))
        .map((p) => [p.id, p]),
    );
    return posts.map((item) => {
      if ('isAd' in item && item.isAd) return item;
      const post = item as InfinitePostItem;
      return freshMap.get(post.id) ?? post;
    });
  }, [initialPosts, posts]);

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
        posts: FeedItem[];
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
      {synchronizedPosts.map((post, index) => {
        const key = 'isAd' in post && post.isAd
          ? `ad-${(post as AdFeedItem).adCampaignId}-${index}`
          : (post as InfinitePostItem).id;
        return (
          <div key={key}>
            <PostCardItem post={post} cardConfig={cardConfig} />
          </div>
        );
      })}
      {hasMore && (
        <div ref={sentinelRef} aria-hidden="true" className="py-3 text-center text-sm text-[#aaa]">
          {isLoading ? '로딩 중...' : ''}
        </div>
      )}
    </div>
  );
}
