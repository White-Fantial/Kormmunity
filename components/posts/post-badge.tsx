import type { CSSProperties } from 'react';

export type BadgeVariant = 'category' | 'status' | 'city' | 'recommendation' | 'tag';

type BadgeProps = {
  variant: BadgeVariant;
  children: React.ReactNode;
  accentColor?: string | null;
  className?: string;
};

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function isHexColor(value: string) {
  return HEX_COLOR_REGEX.test(value);
}

function getAccentStyle(accentColor?: string | null): CSSProperties | undefined {
  if (!accentColor || !isHexColor(accentColor)) {
    return undefined;
  }

  return {
    color: accentColor,
    borderColor: `${accentColor}55`,
    backgroundColor: `${accentColor}14`,
  };
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  category: 'border-[#f1e0a5] bg-[#fff7d1] text-[#7a6000]',
  status: 'border-amber-200 bg-amber-50 text-amber-800',
  city: 'border-[#e8e8e8] bg-[#f7f7f7] text-[#555]',
  recommendation: 'border-pink-200 bg-pink-50 text-pink-700',
  tag: 'border-[#e8e8e8] bg-[#f8f8f8] text-[#666]',
};

export function Badge({ variant, children, accentColor, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${VARIANT_CLASS[variant]} ${className ?? ''}`.trim()}
      style={variant === 'tag' ? getAccentStyle(accentColor) : undefined}
    >
      {children}
    </span>
  );
}
