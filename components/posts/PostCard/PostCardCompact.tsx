import Link from 'next/link';
import Image from 'next/image';

import { Badge } from '@/components/posts/post-badge';
import { PostCardCompactMoreMenu } from './PostCardActions';
import { PostCardBadges } from './PostCardBadges';
import { PostCardMeta } from './PostCardMeta';
import type { PostCardCompactProps } from './types';

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current stroke-current">
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function PostCardCompact({
  post,
  displayVariant,
  clickable = true,
  showActiveBookmark = false,
  moreMenu,
}: Omit<PostCardCompactProps, 'variant'>) {
  const href = post.href ?? `/posts/${post.id}`;
  const variantConfig = {
    feed: {
      showMetaStats: false,
      showSavedBadge: false,
      showMoreMenu: false,
    },
    'my-posts': {
      showMetaStats: true,
      showSavedBadge: false,
      showMoreMenu: true,
    },
    saved: {
      showMetaStats: true,
      showSavedBadge: true,
      showMoreMenu: false,
    },
  } as const;
  const config = displayVariant ? variantConfig[displayVariant] : null;
  const shouldShowSavedBadge = config ? config.showSavedBadge : showActiveBookmark;
  const shouldShowMoreMenu = config ? config.showMoreMenu : Boolean(moreMenu);

  const content = (
    <>
      {post.thumbnailUrl ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#e8e8e8] sm:h-[72px] sm:w-[72px]">
          <Image
            src={post.thumbnailUrl}
            alt={post.title?.trim() ? `게시글 썸네일: ${post.title.trim()}` : '게시글 썸네일'}
            fill
            sizes="(max-width: 640px) 64px, 72px"
            quality={60}
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1 space-y-1.5">
        <PostCardBadges post={post} compact />
        {post.title?.trim() ? <h3 className="truncate text-sm font-semibold sm:text-base">{post.title.trim()}</h3> : null}
        <p className="truncate text-sm text-[#555]">{post.bodyPreview}</p>
        <PostCardMeta
          compact
          createdAt={post.createdAt}
          authorName={post.author?.displayName}
          commentCount={post.commentCount}
          likeCount={post.likeCount}
          showCommentCount={config ? config.showMetaStats : true}
          showLikeCount={config ? config.showMetaStats : true}
        />
      </div>
    </>
  );

  return (
    <article className="rounded-xl border border-[#e8e8e8] bg-white p-3 shadow-sm transition hover:bg-[#fafafa]">
      <div className="flex items-start gap-3">
        {clickable ? (
          <Link href={href} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
            {content}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {shouldShowSavedBadge ? (
            <Badge variant="status" className="gap-1">
              <BookmarkIcon />
              저장됨
            </Badge>
          ) : null}
          {shouldShowMoreMenu && moreMenu ? (
            <PostCardCompactMoreMenu editHref={moreMenu.editHref} postId={moreMenu.postId} />
          ) : null}
        </div>
      </div>
    </article>
  );
}
