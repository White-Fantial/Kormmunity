'use client';

import { useState } from 'react';

type Category = {
  id: string;
  name: string;
};

type Props = {
  categories: Category[];
  selectedIds: string[];
};

export function CategoryFilterFieldset({ categories, selectedIds }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set(selectedIds));

  const handleChange = (id: string, value: boolean) => {
    if (!value && checked.size <= 1) {
      return;
    }
    setChecked((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  return (
    <fieldset className="space-y-2 text-sm">
      <legend className="font-medium">
        카테고리 선택
        <span className="ml-1.5 text-xs font-normal text-[#888]">(최소 1개 선택)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <label
            key={category.id}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-[#e8e8e8] px-3 py-1.5 hover:border-[#fee500] hover:bg-[#fffde7]"
          >
            <input
              type="checkbox"
              name="category"
              value={category.id}
              checked={checked.has(category.id)}
              onChange={(e) => handleChange(category.id, e.target.checked)}
              className="accent-[#fee500]"
            />
            <span>{category.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
