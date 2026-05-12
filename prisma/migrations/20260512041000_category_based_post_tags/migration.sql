-- CreateTable
CREATE TABLE "PostTagOption" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostTagOption_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "postTagOptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PostTagOption_categoryId_slug_key" ON "PostTagOption"("categoryId", "slug");
CREATE INDEX "PostTagOption_categoryId_isActive_sortOrder_idx" ON "PostTagOption"("categoryId", "isActive", "sortOrder");
CREATE INDEX "Post_postTagOptionId_createdAt_idx" ON "Post"("postTagOptionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PostTagOption" ADD CONSTRAINT "PostTagOption_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_postTagOptionId_fkey" FOREIGN KEY ("postTagOptionId") REFERENCES "PostTagOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default options by category type
INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-selling'), c.id, '판매중', 'selling', '#1A56DB', 0, true, true, NOW(), NOW()
FROM "Category" c
WHERE c.type = 'SALE'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-reserved'), c.id, '예약중', 'reserved', '#2563EB', 1, true, false, NOW(), NOW()
FROM "Category" c
WHERE c.type = 'SALE'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-completed'), c.id, '완료', 'completed', '#3C1E1E', 2, true, false, NOW(), NOW()
FROM "Category" c
WHERE c.type = 'SALE'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-hiring'), c.id, '구인', 'hiring', '#15803D', 0, true, true, NOW(), NOW()
FROM "Category" c
WHERE c.type = 'RECRUIT'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-looking-for-job'), c.id, '구직', 'looking-for-job', '#0EA5E9', 1, true, false, NOW(), NOW()
FROM "Category" c
WHERE c.type = 'RECRUIT'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-completed'), c.id, '완료', 'completed', '#3C1E1E', 2, true, false, NOW(), NOW()
FROM "Category" c
WHERE c.type = 'RECRUIT'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-sharing'), c.id, '나눔중', 'sharing', '#1D4ED8', 0, true, true, NOW(), NOW()
FROM "Category" c
WHERE c.type = 'GIVEAWAY'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-shared'), c.id, '나눔완료', 'shared', '#3C1E1E', 1, true, false, NOW(), NOW()
FROM "Category" c
WHERE c.type = 'GIVEAWAY'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-asking'), c.id, '질문중', 'asking', '#7C3AED', 0, true, true, NOW(), NOW()
FROM "Category" c
WHERE c.type IN ('QUESTION', 'HELP')
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "PostTagOption" ("id", "categoryId", "label", "slug", "color", "sortOrder", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT concat('tag-', c.id, '-resolved'), c.id, '해결됨', 'resolved', '#166534', 1, true, false, NOW(), NOW()
FROM "Category" c
WHERE c.type IN ('QUESTION', 'HELP')
ON CONFLICT ("categoryId", "slug") DO NOTHING;

-- Migrate existing saleStatus into the new configurable tag field
UPDATE "Post" p
SET "postTagOptionId" = pto.id
FROM "PostTagOption" pto
JOIN "Category" c ON c.id = pto."categoryId"
WHERE p."categoryId" = pto."categoryId"
  AND (
    (
      p."saleStatus" = 'AVAILABLE'
      AND (
        (c.type = 'SALE' AND pto.slug = 'selling')
        OR (c.type = 'RECRUIT' AND pto.slug = 'hiring')
      )
    )
    OR (p."saleStatus" = 'RESERVED' AND pto.slug = 'reserved')
    OR (p."saleStatus" = 'SOLD' AND pto.slug = 'completed')
  );

-- Drop old hardcoded status column and enum
ALTER TABLE "Post" DROP COLUMN "saleStatus";
DROP TYPE "SaleStatus";
