import type { CSSProperties } from 'react';

type PostTagBadgeProps = {
  label: string;
  color?: string | null;
  className?: string;
};

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function isHexColor(value: string) {
  return HEX_COLOR_REGEX.test(value);
}

function getStyle(color?: string | null): CSSProperties | undefined {
  if (!color || !isHexColor(color)) {
    return undefined;
  }

  return {
    color,
    borderColor: `${color}55`,
    backgroundColor: `${color}14`,
  };
}

export function PostTagBadge({ label, color, className }: PostTagBadgeProps) {
  return (
    <span
      className={className ?? 'rounded-full border px-2 py-1 text-xs font-medium'}
      style={getStyle(color)}
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
