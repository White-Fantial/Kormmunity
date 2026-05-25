import { prisma } from '@/lib/db/prisma';
import { createNotification } from '@/lib/notifications';
import {
  enqueueAdCampaignApprovedNotificationEvent,
  enqueueAdCampaignChangesRequestedNotificationEvent,
  enqueueAdCampaignReviewRequestedNotificationEvent,
  enqueueAdProposalSubmittedNotificationEvent,
} from '@/lib/notifications/kakao-pipeline';

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

export async function dispatchAdProposalSubmittedNotification(params: {
  proposalId: string;
  advertiserId: string;
  actorId: string;
}) {
  const recipientIds = await getAdsManagerRecipientIds();

  await createNotificationsForRecipients({
    recipientIds,
    excludeUserId: params.actorId,
    type: 'AD_PROPOSAL_SUBMITTED',
    targetType: 'AD_PROPOSAL',
    targetId: params.proposalId,
    targetUrl: `/ads-manager/proposals?proposalId=${params.proposalId}`,
    actorId: params.actorId,
    metadata: { advertiserId: params.advertiserId },
  });

  await enqueueAdProposalSubmittedNotificationEvent({
    proposalId: params.proposalId,
    advertiserId: params.advertiserId,
    actorId: params.actorId,
  });
}

export async function dispatchAdCampaignReviewRequestedNotification(params: {
  campaignId: string;
  advertiserId: string;
  actorId: string;
}) {
  const recipientIds = await getAdvertiserMemberRecipientIds(params.advertiserId);

  await createNotificationsForRecipients({
    recipientIds,
    excludeUserId: params.actorId,
    type: 'AD_CAMPAIGN_REVIEW_REQUESTED',
    targetType: 'AD_CAMPAIGN',
    targetId: params.campaignId,
    targetUrl: `/advertiser-member/campaigns?campaignId=${params.campaignId}`,
    actorId: params.actorId,
    metadata: { advertiserId: params.advertiserId },
  });

  await enqueueAdCampaignReviewRequestedNotificationEvent({
    campaignId: params.campaignId,
    advertiserId: params.advertiserId,
    actorId: params.actorId,
  });
}

export async function dispatchAdCampaignReviewedByMemberNotification(params: {
  campaignId: string;
  advertiserId: string;
  actorId: string;
  action: 'APPROVE' | 'REQUEST_CHANGES';
}) {
  const recipientIds = await getAdsManagerRecipientIds();

  await createNotificationsForRecipients({
    recipientIds,
    excludeUserId: params.actorId,
    type:
      params.action === 'APPROVE'
        ? 'AD_CAMPAIGN_APPROVED'
        : 'AD_CAMPAIGN_CHANGES_REQUESTED',
    targetType: 'AD_CAMPAIGN',
    targetId: params.campaignId,
    targetUrl: `/ads-manager/campaigns?campaignId=${params.campaignId}`,
    actorId: params.actorId,
    metadata: { advertiserId: params.advertiserId, action: params.action },
  });

  if (params.action === 'APPROVE') {
    await enqueueAdCampaignApprovedNotificationEvent({
      campaignId: params.campaignId,
      advertiserId: params.advertiserId,
      actorId: params.actorId,
    });
    return;
  }

  await enqueueAdCampaignChangesRequestedNotificationEvent({
    campaignId: params.campaignId,
    advertiserId: params.advertiserId,
    actorId: params.actorId,
  });
}
