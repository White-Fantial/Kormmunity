import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

type SearchMatchQueuePayload = {
  eventType: 'POST_CREATED';
  post: {
    id: string;
    title: string | null;
    body: string;
    authorDisplayName: string;
    imageUrl: string | null;
  };
  createdAt: string;
};

type KakaoSendQueuePayload = {
  eventType: 'DELIVERY_CREATED';
  deliveryId: string;
  createdAt: string;
};

let sqsClient: SQSClient | null = null;

function getSqsClient() {
  if (!sqsClient) {
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
    sqsClient = new SQSClient(region ? { region } : {});
  }

  return sqsClient;
}

function getSearchMatchQueueUrl() {
  return process.env.KAKAO_SEARCH_MATCH_QUEUE_URL ?? null;
}

function getKakaoSendQueueUrl() {
  return process.env.KAKAO_SEND_QUEUE_URL ?? null;
}

function isEnabled(flagName: string) {
  return (process.env[flagName] ?? '').toLowerCase() === 'true';
}

export function isKakaoQueuePipelineEnabled() {
  return isEnabled('KAKAO_USE_SQS_PIPELINE');
}

export function isSearchMatcherLambdaEnabled() {
  return isEnabled('KAKAO_USE_SEARCH_MATCHER_LAMBDA');
}

export async function enqueueSearchMatchPostCreated(post: SearchMatchQueuePayload['post']) {
  const queueUrl = getSearchMatchQueueUrl();
  if (!queueUrl) {
    throw new Error('KAKAO_SEARCH_MATCH_QUEUE_URL is not configured.');
  }

  const payload: SearchMatchQueuePayload = {
    eventType: 'POST_CREATED',
    post,
    createdAt: new Date().toISOString(),
  };

  await getSqsClient().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    }),
  );
}

export async function enqueueKakaoSendDelivery(deliveryId: string) {
  const queueUrl = getKakaoSendQueueUrl();
  if (!queueUrl) {
    throw new Error('KAKAO_SEND_QUEUE_URL is not configured.');
  }

  const payload: KakaoSendQueuePayload = {
    eventType: 'DELIVERY_CREATED',
    deliveryId,
    createdAt: new Date().toISOString(),
  };

  await getSqsClient().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    }),
  );
}

export type { SearchMatchQueuePayload, KakaoSendQueuePayload };
