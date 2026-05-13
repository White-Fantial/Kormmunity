ALTER TABLE "Category"
ADD COLUMN "requireCommentBeforeContactDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "quickCommentTemplates" JSONB;

ALTER TABLE "Post"
ADD COLUMN "requireCommentBeforeContact" BOOLEAN NOT NULL DEFAULT false;
