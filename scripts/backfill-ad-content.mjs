import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function ensureAdvertiserForLegacyPost(post) {
  const baseSlug = toSlug(`legacy-${post.authorId}-${post.id.slice(0, 8)}`) || `legacy-${post.id.slice(0, 8)}`;

  let advertiser = await prisma.advertiser.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });

  if (advertiser) {
    return advertiser.id;
  }

  advertiser = await prisma.advertiser.create({
    data: {
      name: `${post.author.displayName} (Legacy Ad)` ,
      slug: baseSlug,
      isActive: true,
      notes: 'Backfilled from ADVERTISEMENT post',
      members: {
        create: {
          userId: post.authorId,
          role: 'OWNER',
          isActive: true,
        },
      },
    },
    select: { id: true },
  });

  return advertiser.id;
}

async function main() {
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      postId: { not: null },
      adContentId: null,
      post: { is: { category: { type: 'ADVERTISEMENT' } } },
    },
    select: {
      id: true,
      postId: true,
      createdAt: true,
      landingUrl: true,
      notes: true,
      post: {
        select: {
          id: true,
          title: true,
          body: true,
          authorId: true,
          contactUrl: true,
          createdAt: true,
          city: { select: { name: true } },
          category: { select: { name: true } },
          images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          author: { select: { displayName: true } },
        },
      },
    },
  });

  let updated = 0;

  for (const campaign of campaigns) {
    if (!campaign.post) {
      continue;
    }

    const advertiserId = await ensureAdvertiserForLegacyPost(campaign.post);

    const adContent = await prisma.adContent.create({
      data: {
        advertiserId,
        status: 'APPROVED',
        title: campaign.post.title,
        body: campaign.post.body,
        thumbnailUrl: campaign.post.images[0]?.url ?? null,
        landingUrl: campaign.landingUrl ?? campaign.post.contactUrl ?? null,
        displayName: campaign.post.author.displayName,
        categoryName: campaign.post.category.name,
        cityName: campaign.post.city?.name ?? null,
        approvedAt: new Date(),
      },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.adCampaign.update({
        where: { id: campaign.id },
        data: {
          advertiserId,
          adContentId: adContent.id,
        },
      }),
      prisma.adAuditLog.create({
        data: {
          advertiserId,
          adContentId: adContent.id,
          campaignId: campaign.id,
          actionType: 'LEGACY_BACKFILL',
          message: 'Backfilled AdContent from legacy ADVERTISEMENT post',
          metadata: {
            legacyPostId: campaign.post.id,
          },
        },
      }),
    ]);

    updated += 1;
  }

  console.log(`Backfill complete. Updated campaigns: ${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
