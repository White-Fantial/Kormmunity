ALTER TABLE "Post"
ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pinnedAt" TIMESTAMP(3);

CREATE INDEX "Post_status_isPinned_pinnedAt_createdAt_id_idx"
ON "Post"("status", "isPinned" DESC, "pinnedAt" DESC, "createdAt" DESC, "id");
