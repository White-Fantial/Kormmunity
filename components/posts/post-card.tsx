import Link from 'next/link';
import Image from 'next/image';
import { UserAvatar } from '@/components/ui/user-avatar';

type PostCardProps = {
  post: {
    id: string;
    title: string | null;
    body: string;
    saleStatus: 'SOLD' | 'AVAILABLE' | null;
    createdAt: Date;
    price: string | null;
    thumbnailUrl: string | null;
    commentCount: number;
    category: { name: string };
    city: { name: string } | null;
    author: {
      displayName: string;
      profileImageUrl: string | null;
    };
  };
};

export function PostCard({ post }: PostCardProps) {
  const preview = post.title || post.body.split('\n')[0] || '내용 없음';

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block space-y-2 rounded-lg border bg-white p-4 shadow-sm transition active:scale-[0.995]"
    >
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-zinc-100 px-2 py-1">{post.category.name}</span>
        <span className="rounded-full bg-zinc-100 px-2 py-1">{post.city?.name ?? '전 지역'}</span>
        {post.saleStatus === 'SOLD' ? (
          <span className="rounded-full bg-zinc-900 px-2 py-1 text-white">판매완료</span>
        ) : null}
      </div>
      {post.thumbnailUrl ? (
        <div className="relative h-40 overflow-hidden rounded-md">
          <Image
            src={post.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
          />
        </div>
      ) : null}
      <p className="text-base font-semibold leading-6">{preview}</p>
      <p className="line-clamp-2 text-sm text-zinc-700">{post.body}</p>
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <UserAvatar
          displayName={post.author.displayName}
          profileImageUrl={post.author.profileImageUrl}
          className="h-6 w-6"
          sizes="24px"
        />
        <span>{post.author.displayName}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-zinc-500">
        {post.price ? <span>NZD {post.price}</span> : <span />}
        <div className="flex items-center gap-2">
          <span>댓글 {post.commentCount}</span>
          <time dateTime={post.createdAt.toISOString()}>
            {new Date(post.createdAt).toLocaleString('ko-KR')}
          </time>
        </div>
      </div>
    </Link>
  );
}
