import type { ReactNode } from 'react';

type OverflowMenuProps = {
  children: ReactNode;
  className?: string;
  panelClassName?: string;
};

export const overflowMenuItemClassName =
  'block w-full rounded-lg px-3 py-2 text-left text-sm text-[#444] hover:bg-[#f7f7f7]';

export function OverflowMenu({ children, className = '', panelClassName = '' }: OverflowMenuProps) {
  return (
    <details className={`group relative ${className}`}>
      <summary
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-lg leading-none text-[#9aa0a6] opacity-55 transition hover:bg-[#f5f5f5] hover:opacity-100 group-open:bg-[#f5f5f5] group-open:opacity-100"
      >
        <span className="sr-only">더보기</span>
        <span aria-hidden="true">⋯</span>
      </summary>
      <div
        role="menu"
        className={`absolute right-0 top-9 z-20 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[#e8e8e8] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${panelClassName}`}
      >
        {children}
      </div>
    </details>
  );
}
