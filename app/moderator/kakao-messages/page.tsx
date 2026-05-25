import { redirect } from 'next/navigation';

import { retryKakaoMessageDeliveryAction } from '@/app/moderator/actions';
import {

  moderatorManagementNavItems,
  ManagementSectionHeader,
} from '@/components/admin/management-section-nav';
import { DateTimeText } from '@/components/ui/date-time-text';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { canModerate } from '@/lib/permissions';


export const dynamic = 'force-dynamic';

const DELIVERY_TYPE_LABEL: Record<string, string> = {
  SEARCH_ALERT: '검색 알림',
  COMMENT_NOTIFICATION: '댓글 알림',
  AD_PROPOSAL_SUBMITTED: '광고 제안 알림',
  AD_CAMPAIGN_REVIEW_REQUESTED: '광고 리뷰 요청 알림',
  AD_CAMPAIGN_APPROVED: '광고 승인 알림',
  AD_CAMPAIGN_CHANGES_REQUESTED: '광고 수정요청 알림',
};

type CoordinatorKakaoMessagesPageProps = {
  searchParams: Promise<{ status?: string; error?: string; success?: string }>;
};

export default async function CoordinatorKakaoMessagesPage({
  searchParams,
}: CoordinatorKakaoMessagesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canModerate(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const statusFilter = params.status ?? 'ALL';
  const where =
    statusFilter === 'ALL'
      ? undefined
      : {
          status: statusFilter as 'PENDING' | 'SUCCESS' | 'FAILED',
        };

  const deliveries = await prisma.kakaoMessageDelivery.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      deliveryType: true,
      status: true,
      attemptCount: true,
      errorMessage: true,
      messageText: true,
      targetUrl: true,
      relatedPostId: true,
      searchQuery: true,
      lastAttemptAt: true,
      sentAt: true,
      createdAt: true,
      recipientUser: {
        select: {
          displayName: true,
        },
      },
    },
  });

  const statusOptions = [
    { value: 'ALL', label: '전체' },
    { value: 'FAILED', label: '실패' },
    { value: 'PENDING', label: '대기' },
    { value: 'SUCCESS', label: '성공' },
  ] as const;

  return (
    <section className="space-y-6">
      <ManagementSectionHeader
        sectionLabel="운영 관리"
        pageLabel="카카오 알림 로그"
        items={moderatorManagementNavItems}
      />

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}
      {params.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{params.success}</p>
      ) : null}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">전송 로그</h2>

        <form className="mb-4 flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="submit"
              name="status"
              value={option.value}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                statusFilter === option.value
                  ? 'border-[#fee500] bg-[#fee500] font-semibold text-[#3c1e1e]'
                  : 'border-[#e8e8e8] hover:border-[#fee500] hover:bg-[#fffde7]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </form>

        {deliveries.length === 0 ? (
          <p className="text-sm text-[#888]">카카오 전송 로그가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {deliveries.map((delivery) => (
              <li key={delivery.id} className="space-y-2 rounded-xl border border-[#e8e8e8] p-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[#3730a3]">
                    {DELIVERY_TYPE_LABEL[delivery.deliveryType] ?? delivery.deliveryType}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      delivery.status === 'SUCCESS'
                        ? 'bg-green-50 text-green-700'
                        : delivery.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-[#fffde7] text-[#7a6000]'
                    }`}
                  >
                    {delivery.status === 'SUCCESS'
                      ? '성공'
                      : delivery.status === 'FAILED'
                        ? '실패'
                        : '대기'}
                  </span>
                  <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[#555]">
                    수신자: {delivery.recipientUser.displayName}
                  </span>
                  <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[#555]">
                    시도 {delivery.attemptCount}회
                  </span>
                </div>

                <p className="text-xs text-[#888]">
                  생성: <DateTimeText value={delivery.createdAt} />
                  {delivery.lastAttemptAt ? (
                    <>
                      {' '}· 최근 시도: <DateTimeText value={delivery.lastAttemptAt} />
                    </>
                  ) : null}
                  {delivery.sentAt ? (
                    <>
                      {' '}· 성공 시각: <DateTimeText value={delivery.sentAt} />
                    </>
                  ) : null}
                </p>
                {delivery.relatedPostId ? (
                  <p className="text-xs text-[#666]">게시글 ID: {delivery.relatedPostId}</p>
                ) : null}
                {delivery.searchQuery ? (
                  <p className="text-xs text-[#666]">검색어: {delivery.searchQuery}</p>
                ) : null}
                {delivery.targetUrl ? (
                  <p className="break-all text-xs text-[#666]">대상 URL: {delivery.targetUrl}</p>
                ) : null}
                {delivery.errorMessage ? (
                  <p className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">
                    오류: {delivery.errorMessage}
                  </p>
                ) : null}
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[#f9f9f9] p-2 text-xs text-[#444]">
                  {delivery.messageText}
                </pre>

                {delivery.status !== 'SUCCESS' ? (
                  <form action={retryKakaoMessageDeliveryAction}>
                    <input type="hidden" name="deliveryId" value={delivery.id} />
                    <FormSubmitButton
                      idleLabel="재발송"
                      pendingLabel="재발송 중..."
                      className="rounded-xl border border-[#3c1e1e] px-3 py-1.5 text-xs font-semibold text-[#3c1e1e] hover:bg-[#fffde7]"
                    />
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
