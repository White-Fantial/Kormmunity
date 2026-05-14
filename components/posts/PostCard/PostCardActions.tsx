import Link from 'next/link';

import { togglePostLikeAction } from '@/app/posts/actions';
import { savePostAction, unsavePostAction } from '@/app/posts/saved-actions';
import { DeletePostButton } from '@/components/posts/delete-post-button';
import {
  BookmarkIcon,
  CommentIcon,
  HeartIcon,
  IconActionButton,
  IconActionLink,
  PostActionButtons,
} from '@/components/posts/action-buttons';
import type { PostCardEntity } from './types';

type PostCardActionsProps = {
  post: PostCardEntity;
  href: string;
  showLikeAction?: boolean;
  showSaveAction?: boolean;
  returnTo?: string;
};

export function PostCardActions({
  post,
  href,
  showLikeAction = false,
  showSaveAction = false,
  returnTo,
}: PostCardActionsProps) {
  return (
    <PostActionButtons withDivider>
      {showLikeAction ? (
        <form action={togglePostLikeAction}>
          <input type="hidden" name="postId" value={post.id} />
          <IconActionButton
            type="submit"
            icon={<HeartIcon filled={post.isLikedByCurrentUser} />}
            count={post.likeCount ?? 0}
            tone="like"
            active={post.isLikedByCurrentUser}
            aria-label={post.isLikedByCurrentUser ? '좋아요 취소' : '좋아요'}
            title={post.isLikedByCurrentUser ? '좋아요 취소' : '좋아요'}
          />
        </form>
      ) : (
        <IconActionLink
          href="/login"
          icon={<HeartIcon />}
          count={post.likeCount ?? 0}
          aria-label="좋아요"
          title="좋아요"
        />
      )}

      <IconActionLink
        href={`${href}#comments`}
        icon={<CommentIcon />}
        count={post.commentCount ?? 0}
        aria-label="댓글"
        title="댓글"
      />

      {showSaveAction ? (
        <form action={post.isSavedByCurrentUser ? unsavePostAction : savePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="returnTo" value={returnTo ?? '/posts'} />
          <IconActionButton
            type="submit"
            icon={<BookmarkIcon filled={post.isSavedByCurrentUser} />}
            tone="save"
            active={post.isSavedByCurrentUser}
            aria-label={post.isSavedByCurrentUser ? '저장 취소' : '저장'}
            title={post.isSavedByCurrentUser ? '저장 취소' : '저장'}
          />
        </form>
      ) : (
        <IconActionLink href="/login" icon={<BookmarkIcon />} aria-label="저장" title="저장" />
      )}
    </PostActionButtons>
  );
}

type PostCardCompactMoreMenuProps = {
  editHref: string;
  postId: string;
};

export function PostCardCompactMoreMenu({ editHref, postId }: PostCardCompactMoreMenuProps) {
  return (
    <details className="relative shrink-0">
      <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-[#e8e8e8] text-[#666] hover:border-[#fee500] hover:bg-[#fffde7]">
        ⋯
      </summary>
      <div className="absolute right-0 top-9 z-10 min-w-24 rounded-xl border border-[#e8e8e8] bg-white p-1 shadow-sm">
        <Link href={editHref} className="block rounded-lg px-3 py-2 text-sm hover:bg-[#f9f9f9]">
          수정
        </Link>
        <DeletePostButton
          postId={postId}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        />
      </div>
    </details>
  );
}
