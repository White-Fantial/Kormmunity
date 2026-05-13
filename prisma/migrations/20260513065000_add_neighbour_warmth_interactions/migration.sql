ALTER TABLE "User"
ADD COLUMN "neighbourWarmth" DOUBLE PRECISION NOT NULL DEFAULT 36.5;

ALTER TABLE "Post"
ADD COLUMN "bestCommentId" TEXT;

CREATE TABLE "PostLike" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommentLike" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");
CREATE INDEX "PostLike_postId_createdAt_idx" ON "PostLike"("postId", "createdAt");
CREATE INDEX "PostLike_userId_createdAt_idx" ON "PostLike"("userId", "createdAt");

CREATE UNIQUE INDEX "CommentLike_commentId_userId_key" ON "CommentLike"("commentId", "userId");
CREATE INDEX "CommentLike_commentId_createdAt_idx" ON "CommentLike"("commentId", "createdAt");
CREATE INDEX "CommentLike_userId_createdAt_idx" ON "CommentLike"("userId", "createdAt");

CREATE INDEX "Post_bestCommentId_idx" ON "Post"("bestCommentId");

ALTER TABLE "Post"
ADD CONSTRAINT "Post_bestCommentId_fkey"
FOREIGN KEY ("bestCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PostLike"
ADD CONSTRAINT "PostLike_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostLike"
ADD CONSTRAINT "PostLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentLike"
ADD CONSTRAINT "CommentLike_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentLike"
ADD CONSTRAINT "CommentLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
