import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 40;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const cursorToken = searchParams.get('cursor') ?? '';
  const cursor = cursorToken ? decodeCursor(cursorToken) : null;

  const savedPosts = await prisma.savedPost.findMany({
    where: {
      userId: user.id,
      post: { status: { not: 'DELETED' } },
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      createdAt: true,
      postId: true,
      post: {
        select: {
          id: true,
          title: true,
          body: true,
          createdAt: true,
          price: true,
          author: { select: { displayName: true } },
          category: { select: { name: true, type: true, color: true } },
          city: { select: { name: true } },
          tags: {
            select: {
              postTagOption: { select: { id: true, label: true } },
            },
          },
          images: {
            select: { url: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          _count: {
            select: {
              comments: { where: { status: 'PUBLISHED' } },
              postLikes: true,
            },
          },
        },
      },
    },
  });

  const hasExtra = savedPosts.length > PAGE_SIZE;
  const visibleSavedPosts = hasExtra ? savedPosts.slice(0, PAGE_SIZE) : savedPosts;
  const lastSavedPost = visibleSavedPosts[visibleSavedPosts.length - 1];
  const nextCursor =
    hasExtra && lastSavedPost
      ? encodeCursor({ id: lastSavedPost.id, createdAt: lastSavedPost.createdAt })
      : null;

  return NextResponse.json({
    posts: visibleSavedPosts.map(({ post }) => ({
      id: post.id,
      title: post.title,
      bodyPreview: post.body.slice(0, BODY_PREVIEW_LENGTH),
      href: `/posts/${post.id}`,
      createdAt: post.createdAt.toISOString(),
      price: post.price ? post.price.toString() : null,
      thumbnailUrl: post.images[0]?.url ?? null,
      category: post.category,
      city: post.city,
      tags: post.tags.map((tag) => tag.postTagOption),
      author: { displayName: post.author.displayName, profileImageUrl: null },
      commentCount: post._count.comments,
      likeCount: post._count.postLikes,
    })),
    nextCursor,
    hasNextPage: hasExtra,
  });
}
