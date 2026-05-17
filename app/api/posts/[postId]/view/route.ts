import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  createAnonymousPostViewFingerprint,
  getPostViewWindowKey,
} from '@/lib/posts/view-tracking';

type PostViewRouteContext = {
  params: Promise<{ postId: string }>;
};

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: NextRequest, context: PostViewRouteContext) {
  const { postId } = await context.params;
  if (!postId) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  const currentUser = await getCurrentUser();
  const windowKey = getPostViewWindowKey();
  const userId = currentUser?.id ?? null;
  const fingerprint = userId
    ? null
    : createAnonymousPostViewFingerprint({
        ip: getRequestIp(request),
        userAgent: request.headers.get('user-agent') ?? 'unknown',
      });

  try {
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { id: true, status: true },
      });

      if (!post || post.status === 'DELETED') {
        throw new Error('POST_NOT_FOUND');
      }

      await tx.postView.create({
        data: {
          postId,
          userId,
          fingerprint,
          windowKey,
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
    });

    return NextResponse.json({ counted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ counted: false });
    }

    if (error instanceof Error && error.message === 'POST_NOT_FOUND') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to track post view' }, { status: 500 });
  }
}
