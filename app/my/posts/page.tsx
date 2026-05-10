import Link from 'next/link';
import type { Metadata } from 'next';

import {
  deletePostAction,
  markPostAsSoldAction,
} from '@/app/posts/actions';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { SALE_CATEGORY_TYPE } from '@/lib/posts/constants';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '내 글',
  description: '내가 작성한 게시글을 관리할 수 있어요.',
};

type MyPostsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function MyPostsPage({ searchParams }: MyPostsPageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const posts = await prisma.post.findMany({
    where: {
      authorId: user.id,
      status: {
        not: 'DELETED',
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      city: { select: { name: true } },
      category: { select: { name: true, type: true } },
    },
  });

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">내 글</h1>
      {params.error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      {posts.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-sm text-zinc-600">
          아직 올라온 글이 없어요. 첫 글을 남겨보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="space-y-3 rounded-lg border bg-white p-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-2 py-1">{post.category.name}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-1">{post.city?.name ?? '전 지역'}</span>
                {post.saleStatus === 'SOLD' ? (
                  <span className="rounded-full bg-zinc-900 px-2 py-1 text-white">판매완료</span>
                ) : null}
              </div>
              <h2 className="text-base font-semibold">{post.title || post.body.slice(0, 40)}</h2>
              <p className="line-clamp-2 text-sm text-zinc-700">{post.body}</p>

              <div className="flex flex-wrap gap-2">
                <Link href={`/posts/${post.id}`} className="rounded-md border px-3 py-2 text-sm">
                  보기
                </Link>
                <Link href={`/posts/${post.id}/edit`} className="rounded-md border px-3 py-2 text-sm">
                  수정
                </Link>
                {post.category.type === SALE_CATEGORY_TYPE &&
                post.saleStatus !== 'SOLD' ? (
                  <form action={markPostAsSoldAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className="rounded-md border px-3 py-2 text-sm">
                      판매 완료로 변경
                    </button>
                  </form>
                ) : null}
                <form action={deletePostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button type="submit" className="rounded-md border px-3 py-2 text-sm text-red-600">
                    삭제하기
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
