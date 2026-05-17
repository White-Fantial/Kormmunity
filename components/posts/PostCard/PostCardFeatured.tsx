import Link from 'next/link';
import Image from 'next/image';

import { UserAvatar } from '@/components/ui/user-avatar';
import { PostCardActions } from './PostCardActions';
import { PostCardBadges } from './PostCardBadges';
import { PostCardMeta } from './PostCardMeta';
import type { PostCardFeaturedProps } from './types';

export function PostCardFeatured({
  post,
  displayVariant,
  showLikeAction = false,
  showSaveAction = false,
  returnTo,
}: Omit<PostCardFeaturedProps, 'variant'>) {
  const href = post.href ?? `/posts/${post.id}`;
  const showMetaStats = displayVariant !== 'feed';

  return (
    <article className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={href} className="block space-y-3 p-3 sm:p-4">
        {post.thumbnailUrl ? (
          <div className="relative h-44 overflow-hidden rounded-lg sm:h-56">
            <Image
              src={post.thumbnailUrl}
              alt={post.title?.trim() ? `게시글 썸네일: ${post.title.trim()}` : '게시글 썸네일'}
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              quality={60}
              className="object-cover"
            />
          </div>
        ) : null}

        <PostCardBadges post={post} />

        <div className="space-y-2">
          {post.title?.trim() ? <h2 className="text-base font-semibold sm:text-lg">{post.title.trim()}</h2> : null}
          <p className="line-clamp-2 text-sm text-[#555] sm:text-[15px]">{post.bodyPreview}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {post.author ? (
            <>
              <UserAvatar
                displayName={post.author.displayName}
                profileImageUrl={post.author.profileImageUrl}
                className="h-6 w-6"
                sizes="24px"
              />
              <span className="text-sm text-[#666]">{post.author.displayName}</span>
              {post.author.isOperator ? (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">운영자</span>
              ) : null}
            </>
          ) : null}
          <PostCardMeta
            createdAt={post.createdAt}
            commentCount={post.commentCount}
            likeCount={post.likeCount}
            viewCount={post.viewCount}
            showCommentCount={showMetaStats}
            showLikeCount={showMetaStats}
          />
        </div>
      </Link>

      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <PostCardActions
          post={post}
          href={href}
          showLikeAction={showLikeAction}
          showSaveAction={showSaveAction}
          returnTo={returnTo}
        />
      </div>
    </article>
  );
}
