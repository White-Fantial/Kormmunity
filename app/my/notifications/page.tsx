import type { Metadata } from 'next';
import Link from 'next/link';

import { requireUser } from '@/lib/auth/session';
import { getNotifications } from '@/lib/notifications';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import { markAllNotificationsReadAction } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '알림',
  description: '내 알림 목록',
};

const NOTIFICATION_LABELS: Record<string, string> = {
  POST_LIKE: '게시글에 좋아요를 받았어요.',
  COMMENT_CREATED: '게시글에 댓글이 달렸어요.',
  COMMENT_LIKE: '댓글에 좋아요를 받았어요.',
  BEST_COMMENT_SELECTED: '작성한 댓글이 베스트 댓글로 선택됐어요.',
  POST_HELD: '작성한 게시글이 검토 보류 처리됐어요.',
  COMMENT_HELD: '작성한 댓글이 검토 보류 처리됐어요.',
};

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR');
}

function getNotificationHref(notification: {
  relatedPostId: string | null;
  relatedCommentId: string | null;
}): string | null {
  if (!notification.relatedPostId) return null;
  if (notification.relatedCommentId) {
    return `/posts/${notification.relatedPostId}#comment-${notification.relatedCommentId}`;
  }
  return `/posts/${notification.relatedPostId}`;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await getNotifications(user.id);
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">알림</h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="rounded-full border border-[#e8e8e8] px-3 py-1 text-sm font-medium text-[#555] hover:border-[#fee500] hover:bg-[#fffde7]"
            >
              모두 읽음
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyStateMessage title="아직 알림이 없어요." />
      ) : (
        <ul className="divide-y divide-[#e8e8e8] rounded-xl border border-[#e8e8e8] bg-white">
          {notifications.map((notification) => {
            const href = getNotificationHref(notification);
            const label = NOTIFICATION_LABELS[notification.type] ?? '새 알림이 있어요.';
            const content = (
              <div className={`flex items-start gap-3 px-4 py-3 ${!notification.isRead ? 'bg-[#fffde7]' : ''}`}>
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${!notification.isRead ? 'bg-[#fee500]' : 'bg-transparent'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1a1a1a]">{label}</p>
                  <p className="mt-0.5 text-xs text-[#888]">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            );

            return (
              <li key={notification.id}>
                {href ? (
                  <Link href={href} className="block hover:bg-[#fafafa] transition-colors">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
