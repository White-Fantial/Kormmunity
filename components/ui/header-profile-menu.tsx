import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth/session';
import { canMakeFinalUserDecision, canModerate } from '@/lib/permissions';

export async function HeaderProfileMenu() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const menuItems = [
    { href: '/my/posts', label: '내 글' },
    { href: '/my/saved', label: '저장한 글' },
    { href: '/my/profile', label: '내 프로필' },
    ...(canModerate(currentUser) ? [{ href: '/moderator', label: '모더레이션' }] : []),
    ...(canMakeFinalUserDecision(currentUser) ? [{ href: '/admin', label: '관리자' }] : []),
  ];

  return (
    <details className="relative">
      <summary className="flex h-9 cursor-pointer list-none items-center rounded-full border border-[#e8e8e8] px-3 text-sm font-medium text-[#555] hover:border-[#fee500] hover:bg-[#fffde7]">
        프로필
      </summary>
      <div className="absolute right-0 top-11 z-20 min-w-40 rounded-xl border border-[#e8e8e8] bg-white p-1 shadow-sm">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm text-[#333] hover:bg-[#f9f9f9]">
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
