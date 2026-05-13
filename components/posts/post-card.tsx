import Link from 'next/link';
import Image from 'next/image';
import { togglePostLikeAction } from '@/app/posts/actions';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PostTagBadge, withPostTagPrefix } from '@/components/posts/post-tag-badge';
import { NeighbourWarmthLabel } from '@/components/ui/neighbour-warmth-label';
import { FormSubmitButton } from '@/components/ui/form-submit-button';

type PostCardProps = {
  post: {
    id: string;
    title: string | null;
    bodyPreview: string;
    createdAt: Date;
    isPinned: boolean;
    price: string | null;
    thumbnailUrl: string | null;
    commentCount: number;
    likeCount: number;
    isLikedByCurrentUser: boolean;
    reportCount?: number;
    postTags: { id: string; label: string }[];
    category: { name: string; type: string; color: string | null };
    city: { name: string } | null;
    author: {
      displayName: string;
      profileImageUrl: string | null;
      neighbourWarmth: number;
    };
  };
  href?: string;
  showLikeButton?: boolean;
};

export function PostCard({ post, href, showLikeButton = false }: PostCardProps) {
  const hasTitle = Boolean(post.title?.trim());
  const previewBase = post.title?.trim() || post.bodyPreview.split('\n')[0] || '내용 없음';
  const preview = withPostTagPrefix(previewBase, post.postTags[0]?.label);

  return (
    <article className="space-y-2 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 text-xs">
          {post.isPinned ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">📌 고정</span>
          ) : null}
          <span className="rounded-full bg-[#fffde7] px-2 py-1 font-medium text-[#7a6000]">{post.category.name}</span>
          {post.postTags.map((tag) => (
            <PostTagBadge key={tag.id} label={tag.label} categoryColor={post.category.color} />
          ))}
          <span className="rounded-full bg-[#f5f5f5] px-2 py-1 text-[#555]">{post.city?.name ?? '전 지역'}</span>
          {typeof post.reportCount === 'number' ? (
            <span
              className={`rounded-full px-2 py-1 ${
                post.reportCount > 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-[#f5f5f5] text-[#666]'
              }`}
            >
              신고 {post.reportCount}
            </span>
          ) : null}
        </div>
        <Link
          href={href ?? `/posts/${post.id}`}
          className="block space-y-2 rounded-lg transition hover:bg-[#fafafa] active:scale-[0.995]"
        >
          {post.thumbnailUrl ? (
          <div className="relative h-40 overflow-hidden rounded-lg">
            <Image
              src={post.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              quality={60}
              className="object-cover"
            />
          </div>
          ) : null}
          {hasTitle ? <p className="text-base font-semibold leading-6">{preview}</p> : null}
          <p className="line-clamp-2 text-sm text-[#555]">{post.bodyPreview}</p>
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#888]">
          <UserAvatar
            displayName={post.author.displayName}
            profileImageUrl={post.author.profileImageUrl}
            className="h-6 w-6"
            sizes="24px"
          />
          <span className="text-[#666]">{post.author.displayName}</span>
          <span className="text-[#777]">
            <NeighbourWarmthLabel warmth={post.author.neighbourWarmth} />
          </span>
          <span aria-hidden="true">·</span>
          <span>댓글 {post.commentCount}</span>
          <time dateTime={post.createdAt.toISOString()}>
            {new Date(post.createdAt).toLocaleString('ko-KR')}
          </time>
          {post.price ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#3c1e1e]">NZD {post.price}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-2 text-xs text-[#666]">
        <span>좋아요 {post.likeCount}</span>
        {showLikeButton ? (
          <form action={togglePostLikeAction}>
            <input type="hidden" name="postId" value={post.id} />
            <FormSubmitButton
              idleLabel={post.isLikedByCurrentUser ? '좋아요 취소' : '좋아요'}
              pendingLabel="처리 중..."
              className="rounded-lg border border-[#e8e8e8] px-3 py-1 text-xs hover:bg-[#f9f9f9]"
            />
          </form>
        ) : (
          <Link href="/login" className="rounded-lg border border-[#e8e8e8] px-3 py-1 text-xs hover:bg-[#f9f9f9]">
            로그인 후 좋아요
          </Link>
        )}
      </div>
    </article>
  );
}
