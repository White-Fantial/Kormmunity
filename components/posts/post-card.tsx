import Link from 'next/link';
import Image from 'next/image';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PostTagBadge, withPostTagPrefix } from '@/components/posts/post-tag-badge';

type PostCardProps = {
  post: {
    id: string;
    title: string | null;
    body: string;
    createdAt: Date;
    price: string | null;
    thumbnailUrl: string | null;
    commentCount: number;
    reportCount?: number;
    postTags: { id: string; label: string }[];
    category: { name: string; type: string; color: string | null };
    city: { name: string } | null;
    author: {
      displayName: string;
      profileImageUrl: string | null;
    };
  };
};

export function PostCard({ post }: PostCardProps) {
  const hasTitle = Boolean(post.title?.trim());
  const previewBase = post.title?.trim() || post.body.split('\n')[0] || '내용 없음';
  const preview = withPostTagPrefix(previewBase, post.postTags[0]?.label);

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block space-y-2 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm transition hover:border-[#fee500] hover:shadow-md active:scale-[0.995]"
    >
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[#fffde7] px-2 py-1 font-medium text-[#7a6000]">{post.category.name}</span>
        <span className="rounded-full bg-[#f5f5f5] px-2 py-1 text-[#555]">{post.city?.name ?? '전 지역'}</span>
        {post.postTags.map((tag) => (
          <PostTagBadge key={tag.id} label={tag.label} categoryColor={post.category.color} />
        ))}
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
      {post.thumbnailUrl ? (
        <div className="relative h-40 overflow-hidden rounded-lg">
          <Image
            src={post.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover"
          />
        </div>
      ) : null}
      {hasTitle ? <p className="text-base font-semibold leading-6">{preview}</p> : null}
      <p className="line-clamp-2 text-sm text-[#555]">{post.body}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#888]">
        <UserAvatar
          displayName={post.author.displayName}
          profileImageUrl={post.author.profileImageUrl}
          className="h-6 w-6"
          sizes="24px"
        />
        <span className="text-[#666]">{post.author.displayName}</span>
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
    </Link>
  );
}
