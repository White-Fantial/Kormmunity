import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function hasColumn(tableName, columnName) {
  const rows = await prisma.$queryRaw`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function ensureAdvertiserForLegacyPost({ postId, authorId, authorDisplayName }) {
  const baseSlug =
    toSlug(`legacy-${authorId}-${postId.slice(0, 8)}`) || `legacy-${postId.slice(0, 8)}`;

  let advertiser = await prisma.advertiser.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });

  if (advertiser) {
    return advertiser.id;
  }

  advertiser = await prisma.advertiser.create({
    data: {
      name: `${authorDisplayName} (Migrated Ad)`,
      slug: baseSlug,
      isActive: true,
      notes: 'Backfilled from ADVERTISEMENT post',
      members: {
        create: {
          userId: authorId,
          role: 'OWNER',
          isActive: true,
        },
      },
    },
    select: { id: true },
  });

  return advertiser.id;
}

async function backfillCampaignAdContent() {
  const hasCampaignPostId = await hasColumn('AdCampaign', 'postId');
  if (!hasCampaignPostId) {
    return {
      skipped: true,
      reason: 'AdCampaign.postId column does not exist',
      targetCount: 0,
      processedCount: 0,
      remainingCount: 0,
    };
  }

  const campaignRows = await prisma.$queryRaw`
    SELECT
      c.id AS "campaignId",
      c."postId" AS "postId",
      c."landingUrl" AS "campaignLandingUrl",
      p.title AS "postTitle",
      p.body AS "postBody",
      p."authorId" AS "authorId",
      p."contactUrl" AS "postContactUrl",
      author."displayName" AS "authorDisplayName",
      category.name AS "categoryName",
      city.name AS "cityName"
    FROM "AdCampaign" c
    JOIN "Post" p ON p.id = c."postId"
    JOIN "Category" category ON category.id = p."categoryId"
    JOIN "User" author ON author.id = p."authorId"
    LEFT JOIN "City" city ON city.id = p."cityId"
    WHERE c."postId" IS NOT NULL
      AND c."adContentId" IS NULL
      AND category.type = 'ADVERTISEMENT'
  `;

  let processedCount = 0;

  for (const row of campaignRows) {
    const thumbnail = await prisma.postImage.findFirst({
      where: { postId: row.postId },
      select: { url: true },
      orderBy: { sortOrder: 'asc' },
    });

    const advertiserId = await ensureAdvertiserForLegacyPost({
      postId: row.postId,
      authorId: row.authorId,
      authorDisplayName: row.authorDisplayName,
    });

    const adContent = await prisma.adContent.create({
      data: {
        advertiserId,
        status: 'APPROVED',
        title: row.postTitle,
        body: row.postBody,
        thumbnailUrl: thumbnail?.url ?? null,
        landingUrl: row.campaignLandingUrl ?? row.postContactUrl ?? null,
        displayName: row.authorDisplayName,
        categoryName: row.categoryName,
        cityName: row.cityName ?? null,
        approvedAt: new Date(),
      },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE "AdCampaign"
        SET "advertiserId" = ${advertiserId},
            "adContentId" = ${adContent.id},
            "postId" = NULL
        WHERE id = ${row.campaignId}
      `,
      prisma.adAuditLog.create({
        data: {
          advertiserId,
          adContentId: adContent.id,
          campaignId: row.campaignId,
          actionType: 'LEGACY_BACKFILL',
          message: 'Backfilled AdContent from ADVERTISEMENT post',
          metadata: { migratedPostId: row.postId },
        },
      }),
    ]);

    processedCount += 1;
  }

  const remainingRows = await prisma.$queryRaw`
    SELECT c.id
    FROM "AdCampaign" c
    WHERE c."postId" IS NOT NULL
      AND c."adContentId" IS NULL
  `;

  return {
    skipped: false,
    targetCount: campaignRows.length,
    processedCount,
    remainingCount: remainingRows.length,
  };
}

async function backfillStaffAssignmentsFromLegacyRole() {
  const hasUserRole = await hasColumn('User', 'role');
  if (!hasUserRole) {
    return {
      skipped: true,
      reason: 'User.role column does not exist',
      targetCount: 0,
      processedCount: 0,
      remainingCount: 0,
      createdCount: 0,
      reactivatedCount: 0,
    };
  }

  const rows = await prisma.$queryRaw`
    SELECT id, role, "countryId", "cityId"
    FROM "User"
    WHERE role IN ('ADMIN', 'MODERATOR', 'COORDINATOR')
  `;

  let createdCount = 0;
  let reactivatedCount = 0;
  let targetCount = 0;

  for (const row of rows) {
    const existing = await prisma.staffAssignment.findFirst({
      where: {
        userId: row.id,
        role: row.role,
        countryId: row.countryId,
        cityId: row.cityId,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, isActive: true },
    });

    if (existing?.isActive) {
      continue;
    }

    targetCount += 1;

    if (existing && !existing.isActive) {
      await prisma.staffAssignment.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      reactivatedCount += 1;
      continue;
    }

    await prisma.staffAssignment.create({
      data: {
        userId: row.id,
        role: row.role,
        countryId: row.countryId,
        cityId: row.cityId,
        isActive: true,
      },
    });
    createdCount += 1;
  }

  const remainingRows = await prisma.$queryRaw`
    SELECT u.id
    FROM "User" u
    WHERE u.role IN ('ADMIN', 'MODERATOR', 'COORDINATOR')
      AND NOT EXISTS (
        SELECT 1
        FROM "StaffAssignment" sa
        WHERE sa."userId" = u.id
          AND sa.role = u.role::"StaffRole"
          AND sa."isActive" = true
          AND sa."countryId" IS NOT DISTINCT FROM u."countryId"
          AND sa."cityId" IS NOT DISTINCT FROM u."cityId"
      )
  `;

  return {
    skipped: false,
    targetCount,
    processedCount: createdCount + reactivatedCount,
    remainingCount: remainingRows.length,
    createdCount,
    reactivatedCount,
  };
}

async function main() {
  const campaignBackfill = await backfillCampaignAdContent();
  const staffAssignmentBackfill = await backfillStaffAssignmentsFromLegacyRole();

  const report = {
    generatedAt: new Date().toISOString(),
    campaignBackfill,
    staffAssignmentBackfill,
  };

  console.log('[legacy-backfill-report]');
  console.log(JSON.stringify(report, null, 2));

  if (campaignBackfill.remainingCount > 0 || staffAssignmentBackfill.remainingCount > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
