import { prisma } from '@/lib/db/prisma';
import { notifyAdEventViaKakao } from '@/lib/kakao/message';
import { createNotification } from '@/lib/notifications';

const DEFAULT_DEDUPE_WINDOW_SECONDS = 300;

async function getAdsManagerRecipientIds() {
  const assignments = await prisma.staffAssignment.findMany({
    where: {
      isActive: true,
      role: { in: ['AD_MANAGER', 'ADMIN'] },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  return assignments.map((assignment) => assignment.userId);
}

async function getAdvertiserMemberRecipientIds(advertiserId: string) {
  const members = await prisma.advertiserMember.findMany({
    where: {
      advertiserId,
      isActive: true,
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  return members.map((member) => member.userId);
}

async function createNotificationsForRecipients(params: {
  recipientIds: string[];
  excludeUserId?: string;
  type:
    | 'AD_PROPOSAL_SUBMITTED'
    | 'AD_CAMPAIGN_REVIEW_REQUESTED'
    | 'AD_CAMPAIGN_APPROVED'
    | 'AD_CAMPAIGN_CHANGES_REQUESTED';
  targetType: 'AD_PROPOSAL' | 'AD_CAMPAIGN';
  targetId: string;
  targetUrl: string;
  actorId?: string;
  metadata?: Record<string, string | null | undefined>;
}) {
  const uniqueRecipientIds = [...new Set(params.recipientIds)].filter(
    (recipientId) => recipientId && recipientId !== params.excludeUserId,
  );

  if (uniqueRecipientIds.length === 0) {
    return;
  }

  await Promise.all(
    uniqueRecipientIds.map((recipientId) =>
      createNotification({
        recipientId,
        type: params.type,
        targetType: params.targetType,
        targetId: params.targetId,
        targetUrl: params.targetUrl,
        actorId: params.actorId,
        metadata: params.metadata,
        dedupeWindowSeconds: DEFAULT_DEDUPE_WINDOW_SECONDS,
      }),
    ),
  );
}

function buildAbsoluteUrl(path: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? null;
  if (!siteUrl) {
    return path;
  }

  try {
    return new URL(path, siteUrl).toString();
  } catch {
    return path;
  }
}

export async function dispatchAdProposalSubmittedNotification(params: {
  proposalId: string;
  advertiserId: string;
  actorId: string;
}) {
  const [recipientIds, actor] = await Promise.all([
    getAdsManagerRecipientIds(),
    prisma.user.findUnique({
      where: { id: params.actorId },
      select: { displayName: true },
    }),
  ]);
  const targetUrl = `/ads-manager/proposals?proposalId=${params.proposalId}`;

  await createNotificationsForRecipients({
    recipientIds,
    excludeUserId: params.actorId,
    type: 'AD_PROPOSAL_SUBMITTED',
    targetType: 'AD_PROPOSAL',
    targetId: params.proposalId,
    targetUrl,
    actorId: params.actorId,
    metadata: { advertiserId: params.advertiserId },
  });

  await notifyAdEventViaKakao({
    deliveryType: 'AD_PROPOSAL_SUBMITTED',
    recipientUserIds: recipientIds,
    excludeUserId: params.actorId,
    dedupeScopeId: params.proposalId,
    messageText: [
      '[광고 알림] 새 광고 제안이 등록되었어요.',
      `제안 ID: ${params.proposalId}`,
      `등록자: ${actor?.displayName ?? '광고주 멤버'}`,
      buildAbsoluteUrl(targetUrl),
    ].join('\n'),
    targetUrl: buildAbsoluteUrl(targetUrl),
  });
}

export async function dispatchAdCampaignReviewRequestedNotification(params: {
  campaignId: string;
  advertiserId: string;
  actorId: string;
}) {
  const [recipientIds, actor] = await Promise.all([
    getAdvertiserMemberRecipientIds(params.advertiserId),
    prisma.user.findUnique({
      where: { id: params.actorId },
      select: { displayName: true },
    }),
  ]);
  const targetUrl = `/advertiser-member/campaigns?campaignId=${params.campaignId}`;

  await createNotificationsForRecipients({
    recipientIds,
    excludeUserId: params.actorId,
    type: 'AD_CAMPAIGN_REVIEW_REQUESTED',
    targetType: 'AD_CAMPAIGN',
    targetId: params.campaignId,
    targetUrl,
    actorId: params.actorId,
    metadata: { advertiserId: params.advertiserId },
  });

  await notifyAdEventViaKakao({
    deliveryType: 'AD_CAMPAIGN_REVIEW_REQUESTED',
    recipientUserIds: recipientIds,
    excludeUserId: params.actorId,
    dedupeScopeId: params.campaignId,
    messageText: [
      '[광고 알림] 캠페인 리뷰 요청이 도착했어요.',
      `캠페인 ID: ${params.campaignId}`,
      `요청자: ${actor?.displayName ?? '광고 매니저'}`,
      buildAbsoluteUrl(targetUrl),
    ].join('\n'),
    targetUrl: buildAbsoluteUrl(targetUrl),
  });
}

export async function dispatchAdCampaignReviewedByMemberNotification(params: {
  campaignId: string;
  advertiserId: string;
  actorId: string;
  action: 'APPROVE' | 'REQUEST_CHANGES';
}) {
  const [recipientIds, actor] = await Promise.all([
    getAdsManagerRecipientIds(),
    prisma.user.findUnique({
      where: { id: params.actorId },
      select: { displayName: true },
    }),
  ]);
  const targetUrl = `/ads-manager/campaigns?campaignId=${params.campaignId}`;

  await createNotificationsForRecipients({
    recipientIds,
    excludeUserId: params.actorId,
    type:
      params.action === 'APPROVE'
        ? 'AD_CAMPAIGN_APPROVED'
        : 'AD_CAMPAIGN_CHANGES_REQUESTED',
    targetType: 'AD_CAMPAIGN',
    targetId: params.campaignId,
    targetUrl,
    actorId: params.actorId,
    metadata: { advertiserId: params.advertiserId, action: params.action },
  });

  await notifyAdEventViaKakao({
    deliveryType:
      params.action === 'APPROVE' ? 'AD_CAMPAIGN_APPROVED' : 'AD_CAMPAIGN_CHANGES_REQUESTED',
    recipientUserIds: recipientIds,
    excludeUserId: params.actorId,
    dedupeScopeId: params.campaignId,
    messageText: [
      `[광고 알림] 캠페인이 ${
        params.action === 'APPROVE' ? '승인되었어요.' : '수정 요청 상태로 변경되었어요.'
      }`,
      `캠페인 ID: ${params.campaignId}`,
      `처리자: ${actor?.displayName ?? '광고주 멤버'}`,
      buildAbsoluteUrl(targetUrl),
    ].join('\n'),
    targetUrl: buildAbsoluteUrl(targetUrl),
  });
}
