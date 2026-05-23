import type { Metadata } from 'next';

import { requireUser } from '@/lib/auth/session';
import { getNotificationHref, getNotifications } from '@/lib/notifications';
import { DateTimeText } from '@/components/ui/date-time-text';
import { EmptyStateMessage } from '@/components/ui/empty-state-message';
import {
  archiveAllNotificationsAction,
  archiveNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  openNotificationAction,
} from './actions';

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
  AD_PROPOSAL_SUBMITTED: '광고 제안이 새로 등록되었어요.',
  AD_CAMPAIGN_REVIEW_REQUESTED: '캠페인 리뷰 요청이 도착했어요.',
  AD_CAMPAIGN_APPROVED: '캠페인이 승인되었어요.',
  AD_CAMPAIGN_CHANGES_REQUESTED: '캠페인 수정 요청이 도착했어요.',
};

const NOTIFICATION_DOMAIN_LABELS: Record<string, string> = {
  POST: '게시글',
  COMMENT: '게시글',
  AD_PROPOSAL: '광고',
  AD_CAMPAIGN: '광고',
  SYSTEM: '시스템',
};

type NotificationsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const user = await requireUser();
  const query = await searchParams;
  const notifications = await getNotifications(user.id);
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">알림</h1>
        {notifications.length > 0 && (
          <form action={hasUnread ? markAllNotificationsReadAction : archiveAllNotificationsAction}>
            <button
              type="submit"
              className={`rounded-full border border-[#e8e8e8] px-3 py-1 text-sm font-medium text-[#555] ${
                hasUnread ? 'hover:border-[#fee500] hover:bg-[#fffde7]' : 'hover:border-[#ffd8d8] hover:bg-[#fff5f5]'
              }`.trim()}
            >
              {hasUnread ? '모두 읽음' : '모두 아카이브'}
            </button>
          </form>
        )}
      </div>
      {query.error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>
      ) : null}

      {notifications.length === 0 ? (
        <EmptyStateMessage title="아직 알림이 없어요." />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const href = getNotificationHref(notification);
            const label = NOTIFICATION_LABELS[notification.type] ?? '새 알림이 있어요.';

            return (
              <li key={notification.id}>
                <article
                  className={`rounded-xl border border-[#e8e8e8] bg-white shadow-sm ${
                    notification.isRead ? '' : 'bg-[#fffde7]'
                  }`.trim()}
                >
                  <form action={openNotificationAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <button type="submit" className="block w-full px-3 py-3 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[#1a1a1a]">{label}</p>
                        <div className="flex items-center gap-1">
                          <span className="inline-flex rounded-full bg-[#f2f6ff] px-2 py-0.5 text-[11px] font-semibold text-[#405a8b]">
                            {NOTIFICATION_DOMAIN_LABELS[notification.targetType] ?? '알림'}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              notification.isRead
                                ? 'bg-[#f4f4f4] text-[#777]'
                                : 'bg-[#ffe36d] text-[#3c1e1e]'
                            }`.trim()}
                          >
                            {notification.isRead ? '읽음' : '안읽음'}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-[#888]">
                        <DateTimeText value={notification.createdAt} mode="relative" />
                        {href ? ' · 눌러서 이동' : ''}
                      </p>
                    </button>
                  </form>
                  <div className="flex items-center justify-end gap-2 border-t border-[#f0f0f0] px-3 py-2">
                    {!notification.isRead && (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-[#e8e8e8] px-3 py-1 text-xs font-medium text-[#555] hover:border-[#fee500] hover:bg-[#fffde7]"
                        >
                          읽음 처리
                        </button>
                      </form>
                    )}
                    <form action={archiveNotificationAction}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-[#e8e8e8] px-3 py-1 text-xs font-medium text-[#555] hover:border-[#ffd8d8] hover:bg-[#fff5f5]"
                      >
                        아카이브
                      </button>
                    </form>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
