import Link from 'next/link';
import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PostCard } from '@/components/posts/post-card';
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

  const [posts, receivedPostLikesCount, receivedCommentLikesCount, receivedBestCommentsCount] = await Promise.all([
    prisma.post.findMany({
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
    }),
    prisma.postLike.count({
      where: {
        post: {
          authorId: userId,
          status: { not: 'DELETED' },
        },
      },
    }),
    prisma.commentLike.count({
      where: {
        comment: {
          authorId: userId,
          status: 'PUBLISHED',
        },
      },
    }),
    prisma.comment.count({
      where: {
        authorId: userId,
        status: 'PUBLISHED',
        bestForPosts: {
          some: {
            status: { not: 'DELETED' },
          },
        },
      },
    }),
  ]);

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
          <div className="flex gap-2">
            <dt className="font-medium text-[#333]">게시글 좋아요</dt>
            <dd>{receivedPostLikesCount}개</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-[#333]">댓글 좋아요</dt>
            <dd>{receivedCommentLikesCount}개</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-[#333]">베스트 댓글</dt>
            <dd>{receivedBestCommentsCount}개</dd>
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
            return (
              <li key={post.id}>
                <PostCard
                  variant="compact"
                  post={{
                    id: post.id,
                    title: post.title,
                    bodyPreview: post.body.slice(0, POST_PREVIEW_LENGTH),
                    href: `/posts/${post.id}`,
                    createdAt: post.createdAt,
                    thumbnailUrl: post.images[0]?.url ?? null,
                    category: post.category,
                    city: post.city,
                    tags: post.tags.map((tag) => tag.postTagOption),
                    commentCount: post._count.comments,
                  }}
                />
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
