import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { decodeCursor, encodeCursor } from '@/lib/posts/cursor';

const PAGE_SIZE = 20;
const BODY_PREVIEW_LENGTH = 220;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const cursorToken = searchParams.get('cursor') ?? '';
  const cursor = cursorToken ? decodeCursor(cursorToken) : null;

  const posts = await prisma.post.findMany({
    where: {
      authorId: user.id,
      status: { not: 'DELETED' },
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
    include: {
      city: { select: { name: true } },
      category: { select: { name: true, type: true, color: true } },
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
  });

  const hasExtra = posts.length > PAGE_SIZE;
  const visiblePosts = hasExtra ? posts.slice(0, PAGE_SIZE) : posts;
  const lastPost = visiblePosts[visiblePosts.length - 1];
  const nextCursor =
    hasExtra && lastPost
      ? encodeCursor({ id: lastPost.id, createdAt: lastPost.createdAt })
      : null;

  return NextResponse.json({
    posts: visiblePosts.map((post) => ({
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
      commentCount: post._count.comments,
      likeCount: post._count.postLikes,
      viewCount: post.viewCount,
      editHref: `/posts/${post.id}/edit`,
    })),
    nextCursor,
    hasNextPage: hasExtra,
  });
}
