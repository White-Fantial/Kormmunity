import Link from 'next/link';

import { togglePostLikeAction } from '@/app/posts/actions';
import { savePostAction, unsavePostAction } from '@/app/posts/saved-actions';
import { DeletePostButton } from '@/components/posts/delete-post-button';
import type { PostCardEntity } from './types';

type PostCardActionsProps = {
  post: PostCardEntity;
  href: string;
  showLikeAction?: boolean;
  showSaveAction?: boolean;
  returnTo?: string;
};

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${filled ? 'fill-current' : 'fill-none'} stroke-current`}>
      <path d="M12 21s-6.716-4.35-9.193-8.058C.56 9.605 2.053 5 6.138 5c2.24 0 3.38 1.258 3.862 2.005C10.482 6.258 11.622 5 13.862 5 17.947 5 19.44 9.605 21.193 12.942 18.716 16.65 12 21 12 21Z" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${filled ? 'fill-current' : 'fill-none'} stroke-current`}>
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.4-4.2A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

const actionClassName =
  'inline-flex items-center gap-1 rounded-full border border-[#e8e8e8] px-2.5 py-1 text-xs text-[#666] transition hover:border-[#fee500] hover:bg-[#fffde7]';

export function PostCardActions({
  post,
  href,
  showLikeAction = false,
  showSaveAction = false,
  returnTo,
}: PostCardActionsProps) {
  return (
    <div className="flex items-center gap-2 border-t border-[#f0f0f0] pt-2">
      {showLikeAction ? (
        <form action={togglePostLikeAction}>
          <input type="hidden" name="postId" value={post.id} />
          <button type="submit" className={`${actionClassName} ${post.isLikedByCurrentUser ? 'text-red-600' : ''}`}>
            <HeartIcon filled={post.isLikedByCurrentUser} />
            <span>{post.likeCount ?? 0}</span>
          </button>
        </form>
      ) : (
        <Link href="/login" className={actionClassName}>
          <HeartIcon />
          <span>{post.likeCount ?? 0}</span>
        </Link>
      )}

      <Link href={`${href}#comments`} className={actionClassName}>
        <CommentIcon />
        <span>{post.commentCount ?? 0}</span>
      </Link>

      {showSaveAction ? (
        <form action={post.isSavedByCurrentUser ? unsavePostAction : savePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="returnTo" value={returnTo ?? '/posts'} />
          <button type="submit" className={`${actionClassName} ${post.isSavedByCurrentUser ? 'text-[#3c1e1e]' : ''}`}>
            <BookmarkIcon filled={post.isSavedByCurrentUser} />
            <span className="sr-only">저장</span>
          </button>
        </form>
      ) : (
        <Link href="/login" className={actionClassName}>
          <BookmarkIcon />
          <span className="sr-only">로그인 후 저장</span>
        </Link>
      )}
    </div>
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
