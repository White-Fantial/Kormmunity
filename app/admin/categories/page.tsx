import type { CategoryType, CategoryVisibilityMode } from '@prisma/client';
import { redirect } from 'next/navigation';

import {

  createCategoryAction,
  toggleCategoryActiveAction,
  updateCategorySettingsAction,
} from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { ColorPaletteInput } from '@/components/admin/color-palette-input';
import { TagDragList } from '@/components/admin/tag-drag-list';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import { FormSubmitButton } from '@/components/ui/form-submit-button';

export const runtime = "nodejs";
export const preferredRegion = "syd1";

export const dynamic = 'force-dynamic';

type AdminCategoriesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  GENERAL: '일반',
  QUESTION: '질문',
  SALE: '판매',
  GIVEAWAY: '나눔',
  RECRUIT: '구인구직',
  HOUSING: '주거',
  SERVICE: '서비스',
  EVENT: '이벤트',
  COLUMN: '전문가 칼럼',
  ADVERTISEMENT: '광고',
  NOTICE: '공지',
};

const VISIBILITY_MODE_LABELS: Record<CategoryVisibilityMode, string> = {
  NORMAL: '일반 필터',
  ALWAYS_INCLUDED: '항상 포함',
  HIDDEN: '숨김',
};

const SELECT_CLASS =
  'w-full rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none';
const INPUT_CLASS =
  'w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40';

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;

  const [categories, tagOptions] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        visibilityMode: true,
        color: true,
        isActive: true,
        sortOrder: true,
        _count: { select: { posts: true } },
      },
    }),
    prisma.postTagOption.findMany({
      orderBy: [{ categoryType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        categoryType: true,
        _count: { select: { posts: true } },
      },
    }),
  ]);

  const tagOptionsByType = new Map<CategoryType, typeof tagOptions>();
  for (const tagOption of tagOptions) {
    const existing = tagOptionsByType.get(tagOption.categoryType) ?? [];
    existing.push(tagOption);
    tagOptionsByType.set(tagOption.categoryType, existing);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 카테고리 관리</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      {/* ── 카테고리 추가 (collapsible) ── */}
      <details className="group rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold select-none">
          <span>카테고리 추가</span>
          <span className="text-sm text-[#aaa] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
        </summary>
        <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
          <form action={createCategoryAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                name="name"
                required
                placeholder="카테고리 이름"
                className={INPUT_CLASS}
              />
              <input
                type="text"
                name="slug"
                required
                placeholder="슬러그 (영문 소문자/하이픈)"
                pattern="[a-z0-9-]+"
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#555]">카테고리 타입</label>
                <select name="type" defaultValue="GENERAL" className={INPUT_CLASS}>
                  {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label} ({value})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#555]">노출 방식</label>
                <select name="visibilityMode" defaultValue="NORMAL" className={INPUT_CLASS}>
                  {Object.entries(VISIBILITY_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label} ({value})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ColorPaletteInput name="color" defaultValue="" label="카테고리 색상" />
            <FormSubmitButton
              idleLabel="카테고리 추가"
              pendingLabel="처리 중..."
              className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
            />
          </form>
        </div>
      </details>

      {/* ── 카테고리 목록 ── */}
      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">카테고리 목록</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-[#888]">카테고리가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((category) => {
              const tags = tagOptionsByType.get(category.type) ?? [];

              return (
                <li key={category.id}>
                  <details className="group rounded-xl border border-[#e8e8e8]">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 select-none">
                      {category.color ? (
                        <span
                          className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-[#e8e8e8]"
                          style={{ backgroundColor: category.color }}
                        />
                      ) : (
                        <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-[#e8e8e8] bg-white" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="truncate text-xs text-[#aaa]">
                          {category.slug} · {CATEGORY_TYPE_LABELS[category.type]} ·{' '}
                          {VISIBILITY_MODE_LABELS[category.visibilityMode]} · 글 {category._count.posts}개
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          category.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-[#f5f5f5] text-[#888]'
                        }`}
                      >
                        {category.isActive ? '활성' : '비활성'}
                      </span>
                      <span className="shrink-0 text-sm text-[#aaa] transition-transform group-open:rotate-180">
                        ▼
                      </span>
                    </summary>

                    <div className="space-y-4 border-t border-[#f0f0f0] px-3 pb-4 pt-3">
                      {/* Settings + active toggle */}
                      <div className="flex flex-wrap gap-4">
                        <form action={updateCategorySettingsAction} className="flex-1 space-y-3 min-w-[240px]">
                          <input type="hidden" name="categoryId" value={category.id} />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-[#555]">카테고리 타입</label>
                              <select
                                name="type"
                                defaultValue={category.type}
                                className={SELECT_CLASS}
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
                                className={SELECT_CLASS}
                              >
                                {Object.entries(VISIBILITY_MODE_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label} ({value})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <ColorPaletteInput
                            name="color"
                            defaultValue={category.color ?? ''}
                            label="카테고리 색상"
                          />
                          <FormSubmitButton
                            idleLabel="설정 저장"
                            pendingLabel="저장 중..."
                            className="rounded-xl bg-[#fee500] px-3 py-1.5 text-xs font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                          />
                        </form>

                        <form action={toggleCategoryActiveAction} className="self-start pt-1">
                          <input type="hidden" name="categoryId" value={category.id} />
                          <input type="hidden" name="isActive" value={String(category.isActive)} />
                          <FormSubmitButton
                            idleLabel={category.isActive ? '비활성화' : '활성화'}
                            pendingLabel="처리 중..."
                            className="whitespace-nowrap rounded-xl border border-[#e8e8e8] px-3 py-1.5 text-xs font-medium hover:bg-[#f9f9f9]"
                          />
                        </form>
                      </div>

                      {/* Tag options for this category type */}
                      <div className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] px-3 pb-3">
                        <TagDragList
                          categoryType={category.type}
                          categoryTypeLabel={CATEGORY_TYPE_LABELS[category.type]}
                          initialTags={tags}
                        />
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
