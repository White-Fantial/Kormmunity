import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

import { changePostTagOptionAction } from '@/app/posts/actions';
import { DeletePostButton } from '@/components/posts/delete-post-button';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { PostTagBadge, withPostTagPrefix } from '@/components/posts/post-tag-badge';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

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
      category: {
        select: {
          name: true,
          postTagOptions: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: { id: true, label: true },
          },
        },
      },
      postTagOption: { select: { id: true, label: true, color: true } },
      images: {
        select: { url: true },
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
      _count: {
        select: {
          comments: {
            where: { status: 'PUBLISHED' },
          },
        },
      },
    },
  });

  return (
    <section className="space-y-4">
      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      {posts.length === 0 ? (
        <p className="rounded-xl border border-[#e8e8e8] bg-white p-6 text-sm text-[#888]">
          아직 올라온 글이 없어요. 첫 글을 남겨보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => {
            const titleText = post.title?.trim() ?? '';
            const bodyPreview = post.body.slice(0, 40);
            const postHeading = withPostTagPrefix(titleText || bodyPreview, post.postTagOption?.label);
            const activeTagOptionIds = new Set(post.category.postTagOptions.map((option) => option.id));
            const selectedTagOptionId = activeTagOptionIds.has(post.postTagOption?.id ?? '')
              ? post.postTagOption?.id
              : post.category.postTagOptions[0]?.id;
            const thumbnailAlt = titleText
              ? `게시글 썸네일: ${titleText}`
              : '게시글 썸네일: 제목 없는 게시글';

            return (
              <li key={post.id} className="space-y-3 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  {post.images[0]?.url ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#e8e8e8]">
                      <Image
                        src={post.images[0].url}
                        alt={thumbnailAlt}
                        fill
                        sizes="(max-width: 640px) 80px, 80px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-[#fffde7] px-2 py-1 font-medium text-[#7a6000]">{post.category.name}</span>
                      <span className="rounded-full bg-[#f5f5f5] px-2 py-1 text-[#555]">{post.city?.name ?? '전 지역'}</span>
                      {post.postTagOption ? (
                        <PostTagBadge label={post.postTagOption.label} color={post.postTagOption.color} />
                      ) : null}
                    </div>
                    <h2 className="text-base font-semibold">{postHeading}</h2>
                    <p className="line-clamp-2 text-sm text-[#555]">{post.body}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[#888]">
                      <span>댓글 {post._count.comments}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={post.createdAt.toISOString()}>
                        {post.createdAt.toLocaleString('ko-KR')}
                      </time>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/posts/${post.id}`} className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]">
                    보기
                  </Link>
                  <Link href={`/posts/${post.id}/edit`} className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]">
                    수정
                  </Link>
                  {post.category.postTagOptions.length > 0 ? (
                    <form action={changePostTagOptionAction} className="flex items-center gap-2">
                      <input type="hidden" name="postId" value={post.id} />
                      <select
                        name="postTagOptionId"
                        defaultValue={selectedTagOptionId}
                        className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm"
                      >
                        {post.category.postTagOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <FormSubmitButton
                        idleLabel="태그 변경"
                        pendingLabel="처리 중..."
                        className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
                      />
                    </form>
                  ) : null}
                  <DeletePostButton
                    postId={post.id}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
