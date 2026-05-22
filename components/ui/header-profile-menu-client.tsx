'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { logoutAction } from '@/app/login/actions';
import { UserAvatar } from '@/components/ui/user-avatar';

type HeaderProfileMenuClientProps = {
  displayName: string;
  profileImageUrl: string | null;
  menuItems: { href: string; label: string }[];
  contactEmail?: string;
};

export function HeaderProfileMenuClient({ displayName, profileImageUrl, menuItems, contactEmail }: HeaderProfileMenuClientProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (detailsRef.current && target instanceof Node && !detailsRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <details
      ref={detailsRef}
      open={isOpen}
      className="relative"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
        }
      }}
    >
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-[#e8e8e8] text-sm font-medium text-[#555] hover:border-[#fee500] hover:bg-[#fffde7]"
        aria-label="프로필 메뉴"
      >
        <UserAvatar displayName={displayName} profileImageUrl={profileImageUrl} className="h-7 w-7" sizes="28px" />
      </summary>
      <div className="absolute right-0 top-11 z-20 min-w-40 rounded-xl border border-[#e8e8e8] bg-white p-1 shadow-sm">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm text-[#333] hover:bg-[#f9f9f9]"
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <form action={logoutAction} className="mt-1 border-t border-[#f1f1f1] pt-1">
          {contactEmail && (
            <>
              <a
                href={`mailto:${contactEmail}?subject=문의/제안 (Kormmunity)`}
                className="block rounded-lg px-3 py-2 text-sm text-[#333] hover:bg-[#f9f9f9]"
                onClick={() => setIsOpen(false)}
              >
                연락하기
              </a>
              <div className="my-1 border-t border-[#f1f1f1]" />
            </>
          )}
          <button
            type="submit"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#333] hover:bg-[#f9f9f9]"
            onClick={() => setIsOpen(false)}
          >
            로그아웃
          </button>
        </form>
      </div>
    </details>
  );
}
