import type { CategoryType, UserRole } from '@prisma/client';
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
import { FormSubmitButton } from '@/components/ui/form-submit-button';

export const dynamic = 'force-dynamic';

type AdminCategoriesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const MIN_ROLE_LABELS: Record<UserRole, string> = {
  USER: '전체',
  COORDINATOR: '운영자+',
  ADMIN: '어드민만',
};

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  GENERAL: '일반',
  SALE: '판매',
  RECRUIT: '구인구직',
  GIVEAWAY: '나눔',
  HELP: '도움',
  QUESTION: '질문',
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
        type: true,
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
        <h1 className="text-xl font-bold">관리자 — 카테고리 관리</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin/users" className="font-medium text-[#3c1e1e] underline">사용자</Link>
          <Link href="/admin/posts" className="font-medium text-[#3c1e1e] underline">게시글</Link>
          <Link href="/admin/reports" className="font-medium text-[#3c1e1e] underline">신고내역</Link>
          <Link href="/admin/report-options" className="font-medium text-[#3c1e1e] underline">신고옵션</Link>
          <Link href="/admin/cities" className="font-medium text-[#3c1e1e] underline">도시</Link>
        </nav>
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">카테고리 추가</h2>
        <form action={createCategoryAction} className="space-y-2">
          <input
            type="text"
            name="name"
            required
            placeholder="카테고리 이름 (예: 팔아요)"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
          <input
            type="text"
            name="slug"
            required
            placeholder="슬러그 (예: sale, 영문 소문자만)"
            pattern="[a-z0-9-]+"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
          <select
            name="type"
            defaultValue="GENERAL"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          >
            <option value="GENERAL">일반 (GENERAL)</option>
            <option value="SALE">판매 (SALE)</option>
            <option value="RECRUIT">구인구직 (RECRUIT)</option>
            <option value="GIVEAWAY">나눔 (GIVEAWAY)</option>
            <option value="HELP">도움 (HELP)</option>
            <option value="QUESTION">질문 (QUESTION)</option>
          </select>
          <FormSubmitButton
            idleLabel="추가"
            pendingLabel="처리 중..."
            className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
          />
        </form>
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">카테고리 목록</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-[#888]">카테고리가 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {categories.map((cat) => (
              <li key={cat.id} className="space-y-3 rounded-xl border border-[#e8e8e8] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-[#aaa]">
                      슬러그: {cat.slug} · 타입: {CATEGORY_TYPE_LABELS[cat.type]} · 게시글 {cat._count.posts}개
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      cat.isActive ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f5] text-[#888]'
                    }`}
                  >
                    {cat.isActive ? '활성' : '비활성'}
                  </span>
                  <form action={toggleCategoryActiveAction}>
                    <input type="hidden" name="categoryId" value={cat.id} />
                    <input type="hidden" name="isActive" value={String(cat.isActive)} />
                    <FormSubmitButton
                      idleLabel={cat.isActive ? '비활성화' : '활성화'}
                      pendingLabel="처리 중..."
                      className="rounded-xl border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]"
                    />
                  </form>
                </div>

                <details className="text-sm">
                    <summary className="cursor-pointer text-xs text-[#888]">
                     작성 권한 및 지역 설정 (현재: {CATEGORY_TYPE_LABELS[cat.type]} · {MIN_ROLE_LABELS[cat.minRole]}
                     {cat.isAlwaysIncluded ? ' · 필터항상포함' : ''}
                     {cat.ignoreCity ? ' · 전지역강제' : ''}
                     {cat.supportsAllCities ? ' · 전지역선택가능' : ''})
                  </summary>
                  <form action={updateCategorySettingsAction} className="mt-2 space-y-2">
                    <input type="hidden" name="categoryId" value={cat.id} />

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[#555]">카테고리 타입</label>
                      <select
                        name="type"
                        defaultValue={cat.type}
                        className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
                      >
                        <option value="GENERAL">일반 (GENERAL)</option>
                        <option value="SALE">판매 (SALE)</option>
                        <option value="RECRUIT">구인구직 (RECRUIT)</option>
                        <option value="GIVEAWAY">나눔 (GIVEAWAY)</option>
                        <option value="HELP">도움 (HELP)</option>
                        <option value="QUESTION">질문 (QUESTION)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[#555]">작성 최소 역할</label>
                      <select
                        name="minRole"
                        defaultValue={cat.minRole}
                        className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
                      >
                        <option value="USER">전체 (USER)</option>
                        <option value="COORDINATOR">운영자 이상 (COORDINATOR+)</option>
                        <option value="ADMIN">어드민만 (ADMIN)</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#555]">사용자 필터에서 항상 포함 (isAlwaysIncluded)</label>
                        <select
                          name="isAlwaysIncluded"
                          defaultValue={String(cat.isAlwaysIncluded)}
                          className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
                        >
                          <option value="false">꺼짐</option>
                          <option value="true">켜짐</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#555]">전 지역 강제 공개 (ignoreCity)</label>
                        <select
                          name="ignoreCity"
                          defaultValue={String(cat.ignoreCity)}
                          className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
                        >
                          <option value="false">꺼짐</option>
                          <option value="true">켜짐</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#555]">전 지역 선택 허용 (supportsAllCities)</label>
                        <select
                          name="supportsAllCities"
                          defaultValue={String(cat.supportsAllCities)}
                          className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
                        >
                          <option value="false">꺼짐</option>
                          <option value="true">켜짐</option>
                        </select>
                      </div>
                    </div>

                    <FormSubmitButton
                      idleLabel="설정 저장"
                      pendingLabel="저장 중..."
                      className="rounded-xl bg-[#fee500] px-3 py-1.5 text-xs font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                    />
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
