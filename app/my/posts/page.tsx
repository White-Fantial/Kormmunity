import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { CategoryType } from '@prisma/client';

import {
  markPostAsSoldAction,
  markPostAsReservedAction,
  markPostAsAvailableAction,
} from '@/app/posts/actions';
import { DeletePostButton } from '@/components/posts/delete-post-button';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
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
      category: { select: { name: true, type: true } },
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
            const postHeading = titleText || bodyPreview;
            const thumbnailAlt = titleText
              ? `게시글 썸네일: ${titleText}`
              : '게시글 썸네일: 제목 없는 게시글';
            const isSalePost = post.category.type === CategoryType.SALE;
            const isRecruitPost = post.category.type === CategoryType.RECRUIT;
            const isRecruitCompleted = isRecruitPost && post.saleStatus === 'SOLD';
            const isRecruitInProgress = isRecruitPost && post.saleStatus === 'AVAILABLE';

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
                      {isSalePost && post.saleStatus === 'RESERVED' ? (
                        <span className="rounded-full bg-[#e8f0fe] px-2 py-1 text-[#1a56db]">예약중</span>
                      ) : null}
                      {isSalePost && post.saleStatus === 'SOLD' ? (
                        <span className="rounded-full bg-[#3c1e1e] px-2 py-1 text-white">판매완료</span>
                      ) : null}
                      {isRecruitInProgress ? (
                        <span className="rounded-full bg-[#e8f5e9] px-2 py-1 text-[#2e7d32]">진행중</span>
                      ) : null}
                      {isRecruitCompleted ? (
                        <span className="rounded-full bg-[#3c1e1e] px-2 py-1 text-white">진행완료</span>
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
                  {isSalePost &&
                  post.saleStatus === 'AVAILABLE' ? (
                    <form action={markPostAsReservedAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button type="submit" className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]">
                        예약중으로 변경
                      </button>
                    </form>
                  ) : null}
                  {isSalePost &&
                  (post.saleStatus === 'AVAILABLE' || post.saleStatus === 'RESERVED') ? (
                    <form action={markPostAsSoldAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <FormSubmitButton
                        idleLabel="판매 완료로 변경"
                        pendingLabel="처리 중..."
                        className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
                      />
                    </form>
                  ) : null}
                  {isSalePost &&
                  post.saleStatus !== 'AVAILABLE' ? (
                    <form action={markPostAsAvailableAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button type="submit" className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]">
                        판매중으로 변경
                      </button>
                    </form>
                  ) : null}
                  {isRecruitPost && !isRecruitCompleted ? (
                    <form action={markPostAsSoldAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <FormSubmitButton
                        idleLabel="진행완료로 변경"
                        pendingLabel="처리 중..."
                        className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
                      />
                    </form>
                  ) : null}
                  {isRecruitCompleted ? (
                    <form action={markPostAsAvailableAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button type="submit" className="rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm font-medium hover:bg-[#f9f9f9]">
                        진행중으로 변경
                      </button>
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
