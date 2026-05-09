import { notFound } from 'next/navigation';

import { PostForm } from '@/components/posts/post-form';
import { updatePostAction } from '@/app/posts/actions';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canEditPost } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type EditPostPageProps = {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditPostPage({
  params,
  searchParams,
}: EditPostPageProps) {
  const user = await requireUser();
  const { postId } = await params;
  const query = await searchParams;

  const [post, categories, cities] = await Promise.all([
    prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        title: true,
        body: true,
        cityId: true,
        categoryId: true,
        price: true,
        status: true,
        saleStatus: true,
        images: {
          select: {
            id: true,
            url: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  if (!post || !canEditPost(user, post)) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">글 수정</h1>
      <PostForm
        action={updatePostAction}
        categories={categories.map((category) => ({
          id: category.id,
          label: category.name,
          slug: category.slug,
        }))}
        cities={cities.map((city) => ({ id: city.id, label: city.name }))}
        submitLabel="수정하기"
        errorMessage={query.error}
        defaultValues={{
          postId: post.id,
          title: post.title,
          body: post.body,
          categoryId: post.categoryId,
          cityId: post.cityId,
          price: post.price?.toString() ?? '',
          images: post.images,
        }}
      />
    </section>
  );
}
