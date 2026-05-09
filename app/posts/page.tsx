import Link from 'next/link';

import { PostCard } from '@/components/posts/post-card';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

type PostsPageProps = {
  searchParams: Promise<{ category?: string; city?: string }>;
};

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;

  const [categories, cities, posts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        categoryId: params.category || undefined,
        cityId: params.city || undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        saleStatus: true,
        price: true,
        category: { select: { name: true } },
        city: { select: { name: true } },
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
  ]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">홈</h1>
        <Link href="/posts/new" className="rounded-md bg-black px-3 py-2 text-sm text-white">
          글쓰기
        </Link>
      </div>

      <form className="grid grid-cols-1 gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block">카테고리 선택</span>
          <select
            name="category"
            defaultValue={params.category ?? ''}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">전체</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block">지역 선택</span>
          <select
            name="city"
            defaultValue={params.city ?? ''}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">전체</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white sm:col-span-2">
          필터 적용
        </button>
      </form>

      {posts.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-center text-sm text-zinc-600">
          {params.city || params.category
            ? '선택한 조건에 맞는 글이 없어요.'
            : '아직 올라온 글이 없어요. 첫 글을 남겨보세요.'}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                ...post,
                price: post.price ? post.price.toString() : null,
                thumbnailUrl: post.images[0]?.url ?? null,
                commentCount: post._count.comments,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
