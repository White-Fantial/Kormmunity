import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION });
const PREVIEW_LENGTH = 80;

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

function matchesAlertQuery(post, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return false;

  return (
    normalizeText(post.title).includes(normalizedQuery) ||
    normalizeText(post.body).includes(normalizedQuery) ||
    normalizeText(post.authorDisplayName).includes(normalizedQuery)
  );
}

function getSiteBaseUrl() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL;
  if (!site) return null;
  try {
    return new URL(site).origin;
  } catch {
    return site.replace(/\/$/, '');
  }
}

function buildSearchAlertMessage(post, postUrl) {
  const previewSource = post.title?.trim() || post.body.trim();
  const preview = truncateText(previewSource, PREVIEW_LENGTH);
  const bodyPreview = truncateText(post.body.trim(), PREVIEW_LENGTH);
  const lines = [`[검색 알림] ${preview}`, `작성자: ${post.authorDisplayName}`, `내용: ${bodyPreview}`];

  if (postUrl) lines.push(postUrl);
  if (post.imageUrl) lines.push(`사진: ${post.imageUrl}`);

  return lines.join('\n');
}

async function findOrCreateDeliveryByDedupeKey(params) {
  const existing = await prisma.kakaoMessageDelivery.findUnique({
    where: { dedupeKey: params.dedupeKey },
    select: { id: true, status: true },
  });

  if (existing) return existing;

  try {
    return await prisma.kakaoMessageDelivery.create({
      data: {
        dedupeKey: params.dedupeKey,
        deliveryType: 'SEARCH_ALERT',
        recipientUserId: params.recipientUserId,
        messageText: params.messageText,
        targetUrl: params.targetUrl,
        relatedPostId: params.relatedPostId,
        searchQuery: params.searchQuery,
      },
      select: { id: true, status: true },
    });
  } catch {
    return prisma.kakaoMessageDelivery.findUniqueOrThrow({
      where: { dedupeKey: params.dedupeKey },
      select: { id: true, status: true },
    });
  }
}

async function enqueueSendDelivery(deliveryId) {
  const queueUrl = process.env.KAKAO_SEND_QUEUE_URL;
  if (!queueUrl) {
    throw new Error('KAKAO_SEND_QUEUE_URL is not configured.');
  }

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({
        eventType: 'DELIVERY_CREATED',
        deliveryId,
        createdAt: new Date().toISOString(),
      }),
    }),
  );
}

async function processPostCreated(post) {
  const siteBaseUrl = getSiteBaseUrl();
  const postUrl = siteBaseUrl ? `${siteBaseUrl}/posts/${post.id}` : null;
  const message = buildSearchAlertMessage(post, postUrl);

  const pageSize = 200;
  let cursorId = null;

  while (true) {
    const alerts = await prisma.searchAlert.findMany({
      where: {
        user: { notifyOnKakaoForSearchAlert: true },
      },
      orderBy: { id: 'asc' },
      take: pageSize,
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        query: true,
        userId: true,
      },
    });

    if (alerts.length === 0) break;

    const matchingAlerts = alerts.filter((alert) => matchesAlertQuery(post, alert.query));
    for (const alert of matchingAlerts) {
      const dedupeKey = `SEARCH_ALERT:${post.id}:${alert.userId}:${normalizeText(alert.query)}`;
      const delivery = await findOrCreateDeliveryByDedupeKey({
        dedupeKey,
        recipientUserId: alert.userId,
        messageText: message,
        targetUrl: postUrl,
        relatedPostId: post.id,
        searchQuery: alert.query,
      });

      if (delivery.status !== 'SUCCESS') {
        await enqueueSendDelivery(delivery.id);
      }
    }

    cursorId = alerts[alerts.length - 1]?.id ?? null;
  }
}

export async function handler(event) {
  const records = event?.Records ?? [];

  for (const record of records) {
    const payload = JSON.parse(record.body);
    if (payload?.eventType !== 'POST_CREATED' || !payload?.post?.id) {
      continue;
    }

    await processPostCreated(payload.post);
  }
}
