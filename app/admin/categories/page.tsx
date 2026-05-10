import type { UserRole } from '@prisma/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  createCategoryAction,
  toggleCategoryActiveAction,
  updateCategorySettingsAction,
} from '@/app/admin/actions';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type AdminCategoriesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const MIN_ROLE_LABELS: Record<UserRole, string> = {
  USER: '전체',
  COORDINATOR: '운영자+',
  ADMIN: '어드민만',
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
        isAlwaysIncluded: true,
        sortOrder: true,
        minRole: true,
        ignoreCity: true,
      supportsAllCities: true,
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
          <ul className="space-y-4">
            {categories.map((cat) => (
              <li key={cat.id} className="rounded-md border p-3 space-y-3">
                <div className="flex items-center gap-3">
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
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-xs text-zinc-500">
                    작성 권한 및 지역 설정 (현재: {MIN_ROLE_LABELS[cat.minRole]}
                    {cat.isAlwaysIncluded ? ' · 필터항상포함' : ''}
                    {cat.ignoreCity ? ' · 전지역강제' : ''}
                    {cat.supportsAllCities ? ' · 전지역선택가능' : ''})
                  </summary>
                  <form action={updateCategorySettingsAction} className="mt-2 space-y-2">
                    <input type="hidden" name="categoryId" value={cat.id} />

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-600">작성 최소 역할</label>
                      <select
                        name="minRole"
                        defaultValue={cat.minRole}
                        className="w-full rounded-md border px-2 py-1 text-xs"
                      >
                        <option value="USER">전체 (USER)</option>
                        <option value="COORDINATOR">운영자 이상 (COORDINATOR+)</option>
                        <option value="ADMIN">어드민만 (ADMIN)</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-600">사용자 필터에서 항상 포함 (isAlwaysIncluded)</label>
                        <select
                          name="isAlwaysIncluded"
                          defaultValue={String(cat.isAlwaysIncluded)}
                          className="w-full rounded-md border px-2 py-1 text-xs"
                        >
                          <option value="false">꺼짐</option>
                          <option value="true">켜짐</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-600">전 지역 강제 공개 (ignoreCity)</label>
                        <select
                          name="ignoreCity"
                          defaultValue={String(cat.ignoreCity)}
                          className="w-full rounded-md border px-2 py-1 text-xs"
                        >
                          <option value="false">꺼짐</option>
                          <option value="true">켜짐</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-600">전 지역 선택 허용 (supportsAllCities)</label>
                        <select
                          name="supportsAllCities"
                          defaultValue={String(cat.supportsAllCities)}
                          className="w-full rounded-md border px-2 py-1 text-xs"
                        >
                          <option value="false">꺼짐</option>
                          <option value="true">켜짐</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      설정 저장
                    </button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
