'use client';

import { useState, useTransition } from 'react';
import type { CategoryType } from '@prisma/client';

import {
  createPostTagOptionAction,
  reorderPostTagOptionsAction,
  togglePostTagOptionActiveAction,
  updatePostTagOptionAction,
} from '@/app/admin/actions';
import { FormSubmitButton } from '@/components/ui/form-submit-button';

export type TagOption = {
  id: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  _count: { posts: number };
};

type TagDragListProps = {
  categoryType: CategoryType;
  categoryTypeLabel: string;
  initialTags: TagOption[];
};

export function TagDragList({ categoryType, categoryTypeLabel, initialTags }: TagDragListProps) {
  const [tags, setTags] = useState<TagOption[]>(initialTags);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    setTags((prev) => {
      const from = prev.findIndex((t) => t.id === draggedId);
      const to = prev.findIndex((t) => t.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((t, i) => ({ ...t, sortOrder: i }));
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    setDraggedId(null);
    const ids = tags.map((t) => t.id);
    startTransition(async () => {
      await reorderPostTagOptionsAction(ids);
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="space-y-3 pt-3">
      <p className="text-xs font-semibold text-[#555]">
        태그 옵션 ({categoryTypeLabel})
        {isPending ? <span className="ml-2 text-[#aaa]">저장 중…</span> : null}
      </p>

      {tags.length === 0 ? (
        <p className="text-xs text-[#888]">설정된 태그가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              draggable
              onDragStart={() => handleDragStart(tag.id)}
              onDragOver={(e) => handleDragOver(e, tag.id)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-2 transition-opacity ${
                draggedId === tag.id ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {/* Summary row */}
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className="cursor-grab text-[#bbb] active:cursor-grabbing"
                  title="드래그하여 순서 변경"
                  aria-label="드래그하여 순서 변경"
                >
                  ⠿
                </span>
                <span className="font-medium">{tag.label}</span>
                <span className="rounded-full bg-[#f0f0f0] px-2 py-px text-[#666]">{tag.slug}</span>
                <span
                  className={`rounded-full px-2 py-px ${
                    tag.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tag.isActive ? '활성' : '비활성'}
                </span>
                <span className="text-[#bbb]">글 {tag._count.posts}개</span>
              </div>

              {/* Edit form */}
              <form action={updatePostTagOptionAction} className="space-y-2">
                <input type="hidden" name="optionId" value={tag.id} />
                <input type="hidden" name="sortOrder" value={tag.sortOrder} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    name="label"
                    required
                    defaultValue={tag.label}
                    placeholder="태그명"
                    className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
                  />
                  <input
                    type="text"
                    name="slug"
                    required
                    pattern="[a-z0-9-]+"
                    defaultValue={tag.slug}
                    placeholder="slug"
                    className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <FormSubmitButton
                    idleLabel="저장"
                    pendingLabel="저장 중..."
                    className="rounded-lg bg-[#fee500] px-3 py-1 text-xs font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
                  />
                  <form action={togglePostTagOptionActiveAction}>
                    <input type="hidden" name="optionId" value={tag.id} />
                    <input type="hidden" name="isActive" value={String(tag.isActive)} />
                    <FormSubmitButton
                      idleLabel={tag.isActive ? '비활성화' : '활성화'}
                      pendingLabel="처리 중..."
                      className="rounded-lg border border-[#e8e8e8] px-3 py-1 text-xs hover:bg-[#f5f5f5]"
                    />
                  </form>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Add tag form */}
      <form
        action={createPostTagOptionAction}
        className="space-y-2 rounded-lg border border-dashed border-[#e8e8e8] bg-white p-3"
      >
        <p className="text-xs font-medium text-[#888]">태그 추가</p>
        <input type="hidden" name="categoryType" value={categoryType} />
        <input type="hidden" name="sortOrder" value={tags.length} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            name="label"
            required
            placeholder="태그명"
            className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
          />
          <input
            type="text"
            name="slug"
            required
            pattern="[a-z0-9-]+"
            placeholder="slug (영문/숫자/하이픈)"
            className="rounded-lg border border-[#e8e8e8] px-2 py-1 text-xs focus:border-[#fee500] focus:outline-none"
          />
        </div>
        <FormSubmitButton
          idleLabel="태그 추가"
          pendingLabel="추가 중..."
          className="rounded-lg bg-[#fee500] px-3 py-1.5 text-xs font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
        />
      </form>
    </div>
  );
}
