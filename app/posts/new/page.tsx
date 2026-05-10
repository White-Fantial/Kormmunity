import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PostForm } from '@/components/posts/post-form';
import { createPostAction } from '@/app/posts/actions';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getProfileCityRequiredHref } from '@/lib/posts/profile-city';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '글쓰기',
  description: '새로운 글을 빠르게 작성해 공유해 보세요.',
};

type NewPostPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const [categories, dbUser] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        cityId: true,
        city: {
          select: { name: true },
        },
      },
    }),
  ]);

  if (!dbUser?.cityId || !dbUser.city) {
    redirect(getProfileCityRequiredHref('/posts/new'));
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">글쓰기</h1>
      <PostForm
        action={createPostAction}
        categories={categories.map((category) => ({
          id: category.id,
          label: category.name,
          slug: category.slug,
        }))}
        cityLabel={dbUser.city.name}
        submitLabel="올리기"
        errorMessage={params.error}
      />
    </section>
  );
}
