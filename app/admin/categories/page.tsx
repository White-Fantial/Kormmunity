import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createCategoryAction, toggleCategoryActiveAction } from '@/app/admin/actions';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminCategoriesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { posts: true } },
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">관리자 — 카테고리 관리</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin/users" className="text-zinc-600 underline">사용자</Link>
          <Link href="/admin/posts" className="text-zinc-600 underline">게시글</Link>
          <Link href="/admin/cities" className="text-zinc-600 underline">도시</Link>
        </nav>
      </div>

      {params.error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">카테고리 추가</h2>
        <form action={createCategoryAction} className="space-y-2">
          <input
            type="text"
            name="name"
            required
            placeholder="카테고리 이름 (예: 팔아요)"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="text"
            name="slug"
            required
            placeholder="슬러그 (예: sale, 영문 소문자만)"
            pattern="[a-z0-9-]+"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white">
            추가
          </button>
        </form>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">카테고리 목록</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">카테고리가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center gap-3 rounded-md border p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-zinc-400">
                    슬러그: {cat.slug} · 게시글 {cat._count.posts}개
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    cat.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {cat.isActive ? '활성' : '비활성'}
                </span>
                <form action={toggleCategoryActiveAction}>
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <input type="hidden" name="isActive" value={String(cat.isActive)} />
                  <button type="submit" className="rounded-md border px-2 py-1 text-xs">
                    {cat.isActive ? '비활성화' : '활성화'}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
