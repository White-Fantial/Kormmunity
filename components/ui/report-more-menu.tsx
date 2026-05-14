'use client';

import { useId, useRef, useState, type ReactNode } from 'react';

type ReportMoreMenuProps = {
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  contentClassName?: string;
};

export function ReportMoreMenu({ children, className = '', panelClassName = '', contentClassName = '' }: ReportMoreMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const menuId = useId();
  const reportContentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const handleToggleMenu = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) {
        setIsReportOpen(false);
      }
      return next;
    });
  };

  const closeMenu = () => {
    setIsOpen(false);
    setIsReportOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape') {
          closeMenu();
        }
      }}
      onBlurCapture={() => {
        requestAnimationFrame(() => {
          if (rootRef.current && !rootRef.current.contains(document.activeElement)) {
            closeMenu();
          }
        });
      }}
    >
      <button
        type="button"
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-[#e8e8e8] text-lg leading-none text-[#777] transition hover:bg-[#f7f7f7]"
        aria-label="더보기"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={handleToggleMenu}
      >
        ⋯
      </button>
      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute right-0 top-10 z-20 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[#e8e8e8] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${panelClassName}`}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[#444] hover:bg-[#f7f7f7]"
            aria-expanded={isReportOpen}
            aria-controls={reportContentId}
            onClick={() => setIsReportOpen((prev) => !prev)}
          >
            <span>신고하기</span>
            <span aria-hidden="true" className={`text-xs text-[#999] transition-transform ${isReportOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {isReportOpen ? (
            <div
              id={reportContentId}
              role="region"
              aria-label="신고 입력 폼"
              className={`space-y-2 border-t border-[#f0f0f0] px-1 pt-2 ${contentClassName}`}
            >
              {children}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
