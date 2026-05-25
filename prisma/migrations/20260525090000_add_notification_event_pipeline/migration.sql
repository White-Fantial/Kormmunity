ALTER TYPE "KakaoMessageDeliveryType" ADD VALUE IF NOT EXISTS 'AD_PROPOSAL_SUBMITTED';
ALTER TYPE "KakaoMessageDeliveryType" ADD VALUE IF NOT EXISTS 'AD_CAMPAIGN_REVIEW_REQUESTED';
ALTER TYPE "KakaoMessageDeliveryType" ADD VALUE IF NOT EXISTS 'AD_CAMPAIGN_APPROVED';
ALTER TYPE "KakaoMessageDeliveryType" ADD VALUE IF NOT EXISTS 'AD_CAMPAIGN_CHANGES_REQUESTED';

CREATE TYPE "NotificationEventType" AS ENUM (
  'POST_CREATED',
  'COMMENT_CREATED',
  'AD_PROPOSAL_SUBMITTED',
  'AD_CAMPAIGN_REVIEW_REQUESTED',
  'AD_CAMPAIGN_APPROVED',
  'AD_CAMPAIGN_CHANGES_REQUESTED'
);

CREATE TYPE "NotificationEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'RESOLVED', 'FAILED');
CREATE TYPE "NotificationDeliveryChannel" AS ENUM ('KAKAO');
CREATE TYPE "NotificationDeliveryIntentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

CREATE TABLE "NotificationEvent" (
  "id" TEXT NOT NULL,
  "eventType" "NotificationEventType" NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "NotificationEventStatus" NOT NULL DEFAULT 'PENDING',
  "processingStartedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDeliveryIntent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "channel" "NotificationDeliveryChannel" NOT NULL DEFAULT 'KAKAO',
  "recipientUserId" TEXT NOT NULL,
  "templateType" "KakaoMessageDeliveryType" NOT NULL,
  "messageText" TEXT NOT NULL,
  "targetUrl" TEXT,
  "relatedPostId" TEXT,
  "searchQuery" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "status" "NotificationDeliveryIntentStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "processingStartedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "kakaoDeliveryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDeliveryIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDeliveryIntent_dedupeKey_key" ON "NotificationDeliveryIntent"("dedupeKey");

CREATE INDEX "NotificationEvent_status_createdAt_idx" ON "NotificationEvent"("status", "createdAt" ASC);
CREATE INDEX "NotificationEvent_eventType_createdAt_idx" ON "NotificationEvent"("eventType", "createdAt" DESC);

CREATE INDEX "NotificationDeliveryIntent_status_createdAt_idx" ON "NotificationDeliveryIntent"("status", "createdAt" ASC);
CREATE INDEX "NotificationDeliveryIntent_recipientUserId_createdAt_idx" ON "NotificationDeliveryIntent"("recipientUserId", "createdAt" DESC);
CREATE INDEX "NotificationDeliveryIntent_eventId_createdAt_idx" ON "NotificationDeliveryIntent"("eventId", "createdAt" DESC);

ALTER TABLE "NotificationDeliveryIntent"
ADD CONSTRAINT "NotificationDeliveryIntent_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "NotificationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDeliveryIntent"
ADD CONSTRAINT "NotificationDeliveryIntent_recipientUserId_fkey"
FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
