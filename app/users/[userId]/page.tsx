import Link from 'next/link';
import Image from 'next/image';
import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PostTagBadge } from '@/components/posts/post-tag-badge';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { NeighbourWarmthLabel } from '@/components/ui/neighbour-warmth-label';
import { UserAvatar } from '@/components/ui/user-avatar';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
const POST_PREVIEW_LENGTH = 40;
const PAGE_SIZE = 20;

type UserProfilePageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ page?: string }>;
};

const getUserProfile = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      profileImageUrl: true,
      neighbourWarmth: true,
      createdAt: true,
      city: { select: { name: true } },
      country: { select: { name: true } },
      _count: {
        select: {
          posts: {
            where: { status: { not: 'DELETED' } },
          },
        },
      },
    },
  });
});

export async function generateMetadata({ params }: Pick<UserProfilePageProps, 'params'>): Promise<Metadata> {
  const { userId } = await params;
  const user = await getUserProfile(userId);
  if (!user) return { title: '사용자를 찾을 수 없어요' };
  return { title: `${user.displayName} 님의 프로필` };
}

export default async function UserProfilePage({ params, searchParams }: UserProfilePageProps) {
  const { userId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

  const user = await getUserProfile(userId);

  if (!user) {
    notFound();
  }

  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      status: { not: 'DELETED' },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    include: {
      city: { select: { name: true } },
      category: {
        select: {
          name: true,
          type: true,
          color: true,
        },
      },
      tags: {
        select: {
          postTagOption: {
            select: { id: true, label: true },
          },
        },
      },
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

  const hasNextPage = posts.length > PAGE_SIZE;
  const visiblePosts = hasNextPage ? posts.slice(0, PAGE_SIZE) : posts;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <UserAvatar
            displayName={user.displayName}
            profileImageUrl={user.profileImageUrl}
            className="h-14 w-14"
            sizes="56px"
          />
          <div>
            <p className="text-base font-semibold">{user.displayName}</p>
            <p className="text-sm text-[#666]">
              <NeighbourWarmthLabel warmth={user.neighbourWarmth} />
            </p>
            {(user.country || user.city) ? (
              <p className="text-sm text-[#888]">
                {[user.country?.name, user.city?.name].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
        </div>
        <dl className="mt-4 space-y-1 text-sm text-[#555]">
          <div className="flex gap-2">
            <dt className="font-medium text-[#333]">가입일</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-[#333]">게시물 수</dt>
            <dd>{user._count.posts}개</dd>
          </div>
        </dl>
      </div>

      <h2 className="px-1 text-base font-bold">게시물 목록</h2>

      {visiblePosts.length === 0 ? (
        <EmptyStateMessage
          title="아직 게시물이 없어요."
          description={`${user.displayName}님이 글을 올리면 여기에서 확인할 수 있어요.`}
        />
      ) : (
        <ul className="space-y-3">
          {visiblePosts.map((post) => {
            const titleText = post.title?.trim() ?? '';
            const bodyPreview = post.body.slice(0, POST_PREVIEW_LENGTH);
            const postHeading = titleText || bodyPreview;
            const thumbnailAlt = titleText
              ? `게시글 썸네일: ${titleText}`
              : '게시글 썸네일: 제목 없는 게시글';

            return (
              <li key={post.id} className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
                <Link href={`/posts/${post.id}`} className="flex gap-3">
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
                      {post.tags.map((tag) => (
                        <PostTagBadge
                          key={tag.postTagOption.id}
                          label={tag.postTagOption.label}
                          categoryColor={post.category.color}
                        />
                      ))}
                      <span className="rounded-full bg-[#f5f5f5] px-2 py-1 text-[#555]">{post.city?.name ?? '전 지역'}</span>
                    </div>
                    <h3 className="text-base font-semibold">{postHeading}</h3>
                    <p className="line-clamp-2 text-sm text-[#555]">{post.body}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[#888]">
                      <span>댓글 {post._count.comments}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={post.createdAt.toISOString()}>
                        {post.createdAt.toLocaleString('ko-KR')}
                      </time>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {(page > 1 || hasNextPage) ? (
        <div className="flex justify-between gap-2 pt-1">
          {page > 1 ? (
            <Link
              href={`/users/${userId}?page=${page - 1}`}
              className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
            >
              이전
            </Link>
          ) : (
            <span />
          )}
          {hasNextPage ? (
            <Link
              href={`/users/${userId}?page=${page + 1}`}
              className="rounded-xl border border-[#e8e8e8] px-4 py-2 text-sm font-medium hover:bg-[#f9f9f9]"
            >
              다음
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
