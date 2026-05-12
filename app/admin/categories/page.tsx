import type { CategoryType, CategoryVisibilityMode } from '@prisma/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  createCategoryAction,
  createPostTagOptionAction,
  togglePostTagOptionActiveAction,
  toggleCategoryActiveAction,
  updatePostTagOptionAction,
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

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  GENERAL: '일반',
  SALE: '판매',
  RECRUIT: '구인구직',
  GIVEAWAY: '나눔',
  HELP: '도움',
  QUESTION: '질문',
};

const VISIBILITY_MODE_LABELS: Record<CategoryVisibilityMode, string> = {
  NORMAL: '일반 필터',
  ALWAYS_INCLUDED: '항상 포함',
  HIDDEN: '숨김',
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
      visibilityMode: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { posts: true } },
      postTagOptions: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          label: true,
          slug: true,
          color: true,
          sortOrder: true,
          isActive: true,
          isDefault: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">관리자 — 카테고리 관리</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin/users" className="font-medium text-[#3c1e1e] underline">사용자</Link>
          <Link href="/admin/post-permissions" className="font-medium text-[#3c1e1e] underline">게시글 권한</Link>
          <Link href="/admin/posts" className="font-medium text-[#3c1e1e] underline">게시글</Link>
          <Link href="/admin/cities" className="font-medium text-[#3c1e1e] underline">도시</Link>
          <Link href="/admin/countries" className="font-medium text-[#3c1e1e] underline">국가</Link>
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
            placeholder="카테고리 이름"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
          <input
            type="text"
            name="slug"
            required
            placeholder="슬러그 (영문 소문자/하이픈)"
            pattern="[a-z0-9-]+"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
          <select
            name="type"
            defaultValue="GENERAL"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          >
            {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({value})
              </option>
            ))}
          </select>
          <select
            name="visibilityMode"
            defaultValue="NORMAL"
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          >
            {Object.entries(VISIBILITY_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({value})
              </option>
            ))}
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
            {categories.map((category) => (
              <li key={category.id} className="space-y-3 rounded-xl border border-[#e8e8e8] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{category.name}</p>
                    <p className="text-xs text-[#aaa]">
                      슬러그: {category.slug} · 타입: {CATEGORY_TYPE_LABELS[category.type]} · 노출: {VISIBILITY_MODE_LABELS[category.visibilityMode]} · 게시글 {category._count.posts}개
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      category.isActive ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f5] text-[#888]'
                    }`}
                  >
                    {category.isActive ? '활성' : '비활성'}
                  </span>
                  <form action={toggleCategoryActiveAction}>
                    <input type="hidden" name="categoryId" value={category.id} />
                    <input type="hidden" name="isActive" value={String(category.isActive)} />
                    <FormSubmitButton
                      idleLabel={category.isActive ? '비활성화' : '활성화'}
                      pendingLabel="처리 중..."
                      className="rounded-xl border border-[#e8e8e8] px-2 py-1 text-xs font-medium hover:bg-[#f9f9f9]"
                    />
                  </form>
                </div>

                <form action={updateCategorySettingsAction} className="space-y-2">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[#555]">카테고리 타입</label>
                      <select
                        name="type"
                        defaultValue={category.type}
                        className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
                      >
                        {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label} ({value})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[#555]">노출 방식</label>
                      <select
                        name="visibilityMode"
                        defaultValue={category.visibilityMode}
                        className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
                      >
                        {Object.entries(VISIBILITY_MODE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label} ({value})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <FormSubmitButton
                    idleLabel="설정 저장"
                    pendingLabel="저장 중..."
                    className="rounded-xl bg-[#fee500] px-3 py-1.5 text-xs font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                  />
                </form>

                <div className="space-y-2 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3">
                  <p className="text-xs font-semibold text-[#555]">태그 옵션</p>
                  {category.postTagOptions.length === 0 ? (
                    <p className="text-xs text-[#888]">설정된 태그가 없습니다.</p>
                  ) : (
                    <ul className="space-y-2">
                      {category.postTagOptions.map((option) => (
                        <li key={option.id} className="space-y-2 rounded-lg border border-[#e8e8e8] bg-white p-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-medium">{option.label}</span>
                            <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[#666]">{option.slug}</span>
                            <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[#666]">
                              정렬 {option.sortOrder}
                            </span>
                            {option.color ? (
                              <span className="rounded-full border border-[#e8e8e8] px-2 py-0.5 text-[#666]">
                                {option.color}
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-2 py-0.5 ${
                                option.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {option.isActive ? '활성' : '비활성'}
                            </span>
                            {option.isDefault ? (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">기본</span>
                            ) : null}
                            <span className="text-[#999]">연결 글 {option._count.posts}개</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <form action={updatePostTagOptionAction} className="grid w-full gap-2 sm:grid-cols-5">
                              <input type="hidden" name="optionId" value={option.id} />
                              <input
                                type="text"
                                name="label"
                                required
                                defaultValue={option.label}
                                className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                              />
                              <input
                                type="text"
                                name="slug"
                                required
                                pattern="[a-z0-9-]+"
                                defaultValue={option.slug}
                                className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                              />
                              <input
                                type="text"
                                name="color"
                                defaultValue={option.color ?? ''}
                                placeholder="#1A56DB"
                                pattern="^#?[0-9a-fA-F]{6}$"
                                className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                              />
                              <input
                                type="number"
                                name="sortOrder"
                                defaultValue={option.sortOrder}
                                className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                              />
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 text-xs text-[#555]">
                                  <input
                                    type="checkbox"
                                    name="isDefault"
                                    value="true"
                                    defaultChecked={option.isDefault}
                                  />
                                  기본
                                </label>
                                <FormSubmitButton
                                  idleLabel="저장"
                                  pendingLabel="저장 중..."
                                  className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                                />
                              </div>
                            </form>
                            <form action={togglePostTagOptionActiveAction}>
                              <input type="hidden" name="optionId" value={option.id} />
                              <input type="hidden" name="isActive" value={String(option.isActive)} />
                              <FormSubmitButton
                                idleLabel={option.isActive ? '비활성화' : '활성화'}
                                pendingLabel="처리 중..."
                                className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                              />
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form action={createPostTagOptionAction} className="grid gap-2 rounded-lg border border-dashed border-[#e8e8e8] bg-white p-2 sm:grid-cols-6">
                    <input type="hidden" name="categoryId" value={category.id} />
                    <input
                      type="text"
                      name="label"
                      required
                      placeholder="태그명"
                      className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      name="slug"
                      required
                      pattern="[a-z0-9-]+"
                      placeholder="slug"
                      className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      name="color"
                      placeholder="#1A56DB"
                      pattern="^#?[0-9a-fA-F]{6}$"
                      className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      name="sortOrder"
                      defaultValue={category.postTagOptions.length}
                      className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs"
                    />
                    <label className="flex items-center gap-1 text-xs text-[#555]">
                      <input type="checkbox" name="isDefault" value="true" />
                      기본
                    </label>
                    <FormSubmitButton
                      idleLabel="태그 추가"
                      pendingLabel="추가 중..."
                      className="rounded-lg bg-[#fee500] px-2 py-1 text-xs font-bold text-[#3c1e1e]"
                    />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
