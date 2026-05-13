import Link from 'next/link';

import type { PostCardMinimalProps } from './types';

export function PostCardMinimal({ post }: Omit<PostCardMinimalProps, 'variant'>) {
  const content = (
    <article
      className={`rounded-xl border border-[#e8e8e8] bg-white px-3 py-2 shadow-sm transition hover:bg-[#fafafa] ${
        post.isUnread ? 'bg-[#fffde7]' : ''
      }`.trim()}
    >
      <div className="space-y-1">
        {post.title?.trim() ? <p className="text-sm font-medium text-[#1a1a1a]">{post.title.trim()}</p> : null}
        <p className="line-clamp-2 text-sm text-[#555]">{post.bodyPreview}</p>
        <p className="text-xs text-[#888]">{new Date(post.createdAt).toLocaleString('ko-KR')}</p>
      </div>
    </article>
  );

  if (!post.href) {
    return content;
  }

  return (
    <Link href={post.href} className="block">
      {content}
    </Link>
  );
}
