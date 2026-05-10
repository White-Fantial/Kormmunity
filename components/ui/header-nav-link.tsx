'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type HeaderNavLinkProps = {
  href: `/${string}`;
  children: ReactNode;
};

const baseClassName = 'shrink-0 rounded-full border px-3 py-1.5 font-medium transition-colors';
const inactiveClassName = 'border-[#e8e8e8] bg-white text-[#1a1a1a] hover:border-[#fee500] hover:bg-[#fffde7]';
const activeClassName = 'border-[#fee500] bg-[#fee500] font-semibold text-[#3c1e1e]';

function isActivePath(href: string, pathname: string) {
  if (href === '/posts') {
    return pathname === '/posts' || (pathname.startsWith('/posts/') && pathname !== '/posts/new');
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNavLink({ href, children }: HeaderNavLinkProps) {
  const pathname = usePathname() ?? '';
  const isActive = isActivePath(href, pathname);

  return (
    <Link href={href} className={`${baseClassName} ${isActive ? activeClassName : inactiveClassName}`}>
      {children}
    </Link>
  );
}
