import type { CSSProperties } from 'react';

type PostTagBadgeProps = {
  label: string;
  categoryColor?: string | null;
  className?: string;
};

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function isHexColor(value: string) {
  return HEX_COLOR_REGEX.test(value);
}

function getStyle(categoryColor?: string | null): CSSProperties | undefined {
  if (!categoryColor || !isHexColor(categoryColor)) {
    return undefined;
  }

  return {
    color: categoryColor,
    borderColor: `${categoryColor}55`,
    backgroundColor: `${categoryColor}14`,
  };
}

export function PostTagBadge({ label, categoryColor, className }: PostTagBadgeProps) {
  return (
    <span
      className={className ?? 'rounded-full border px-2 py-1 text-xs font-medium'}
      style={getStyle(categoryColor)}
    >
      {label}
    </span>
  );
}

export function withPostTagPrefix(title: string, tagLabel?: string | null) {
  if (!tagLabel) {
    return title;
  }

  return `[${tagLabel}] ${title}`;
}
