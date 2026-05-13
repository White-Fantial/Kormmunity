import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth/session';
import { getUnreadNotificationCount } from '@/lib/notifications';

export async function NotificationBell() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const unreadCount = await getUnreadNotificationCount(currentUser.id);

  return (
    <Link
      href="/my/notifications"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e8e8e8] text-[#555] hover:border-[#fee500] hover:bg-[#fffde7]"
      aria-label={`알림${unreadCount > 0 ? ` (읽지 않은 알림 ${unreadCount}개)` : ''}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4444] px-0.5 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
