import { PrismaClient, CategoryType, CategoryVisibilityMode, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const countries = [{ name: 'New Zealand', slug: 'new-zealand' }];

const cities = [
  'Auckland',
  'Wellington',
  'Christchurch',
  'Hamilton',
  'Tauranga',
  'Dunedin',
  'Queenstown',
  'Nelson',
  'Rotorua',
  'Invercargill',
  'Other',
];

const categories = [
  {
    name: '공지사항',
    slug: 'notice',
    type: CategoryType.GENERAL,
    visibilityMode: CategoryVisibilityMode.ALWAYS_INCLUDED,
  },
  {
    name: '광고',
    slug: 'ad',
    type: CategoryType.GENERAL,
    visibilityMode: CategoryVisibilityMode.ALWAYS_INCLUDED,
  },
  {
    name: '사고팔아요',
    slug: 'buy-sell',
    type: CategoryType.SALE,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '무료나눔',
    slug: 'free-share',
    type: CategoryType.GIVEAWAY,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '궁금해요',
    slug: 'question',
    type: CategoryType.QUESTION,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '도와주세요',
    slug: 'help',
    type: CategoryType.HELP,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
];

const defaultTagOptionsByCategorySlug = {
  'buy-sell': [
    { label: '판매중', slug: 'selling', color: '#1A56DB', isDefault: true },
    { label: '예약중', slug: 'reserved', color: '#2563EB' },
    { label: '완료', slug: 'completed', color: '#3C1E1E' },
  ],
  'free-share': [
    { label: '나눔중', slug: 'sharing', color: '#1D4ED8', isDefault: true },
    { label: '나눔완료', slug: 'shared', color: '#3C1E1E' },
  ],
  'job': [
    { label: '구인', slug: 'hiring', color: '#15803D', isDefault: true },
    { label: '구직', slug: 'looking-for-job', color: '#0EA5E9' },
    { label: '완료', slug: 'completed', color: '#3C1E1E' },
  ],
  question: [
    { label: '질문중', slug: 'asking', color: '#7C3AED', isDefault: true },
    { label: '해결됨', slug: 'resolved', color: '#166534' },
  ],
  help: [
    { label: '질문중', slug: 'asking', color: '#7C3AED', isDefault: true },
    { label: '해결됨', slug: 'resolved', color: '#166534' },
  ],
};

const defaultTagOptionsByCategoryType = {
  [CategoryType.SALE]: defaultTagOptionsByCategorySlug['buy-sell'],
  [CategoryType.RECRUIT]: defaultTagOptionsByCategorySlug.job,
  [CategoryType.GIVEAWAY]: defaultTagOptionsByCategorySlug['free-share'],
  [CategoryType.QUESTION]: defaultTagOptionsByCategorySlug.question,
  [CategoryType.HELP]: defaultTagOptionsByCategorySlug.help,
};

const reportOptions = [
  '사기/거래 위험',
  '욕설/혐오/괴롭힘',
  '음란/부적절한 콘텐츠',
  '광고/스팸',
  '개인정보 노출',
  '기타',
];

function slugifyCity(city) {
  return city.toLowerCase().replace(/\s+/g, '-');
}

async function main() {
  const countryRecords = {};
  for (const [index, country] of countries.entries()) {
    const record = await prisma.country.upsert({
      where: { slug: country.slug },
      update: { name: country.name, isActive: true, sortOrder: index },
      create: {
        name: country.name,
        slug: country.slug,
        isActive: true,
        sortOrder: index,
      },
    });
    countryRecords[country.slug] = record;
  }

  const nzId = countryRecords['new-zealand'].id;

  await Promise.all(
    cities.map((name, index) =>
      prisma.city.upsert({
        where: { slug: slugifyCity(name) },
        update: { name, isActive: true, sortOrder: index, countryId: nzId },
        create: {
          name,
          slug: slugifyCity(name),
          isActive: true,
          sortOrder: index,
          countryId: nzId,
        },
      }),
    ),
  );

  await Promise.all(
    categories.map((category, index) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          type: category.type,
          visibilityMode: category.visibilityMode,
          isActive: true,
          sortOrder: index,
        },
        create: {
          name: category.name,
          slug: category.slug,
          type: category.type,
          visibilityMode: category.visibilityMode,
          isActive: true,
          sortOrder: index,
        },
      }),
    ),
  );

  const categoryRecords = await prisma.category.findMany({
    where: {
      slug: {
        in: categories.map((category) => category.slug),
      },
    },
    select: {
      id: true,
      slug: true,
      type: true,
    },
  });

  for (const category of categoryRecords) {
    const options =
      defaultTagOptionsByCategorySlug[category.slug] ??
      defaultTagOptionsByCategoryType[category.type] ??
      [];

    for (const [index, option] of options.entries()) {
      await prisma.postTagOption.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug: option.slug,
          },
        },
        update: {
          label: option.label,
          color: option.color,
          sortOrder: index,
          isActive: true,
          isDefault: Boolean(option.isDefault),
        },
        create: {
          categoryId: category.id,
          label: option.label,
          slug: option.slug,
          color: option.color,
          sortOrder: index,
          isActive: true,
          isDefault: Boolean(option.isDefault),
        },
      });
    }
  }

  await Promise.all(
    reportOptions.map((label, index) =>
      prisma.reportOption.upsert({
        where: { label },
        update: { isActive: true, sortOrder: index },
        create: { label, isActive: true, sortOrder: index },
      }),
    ),
  );

  const adminKakaoId = process.env.ADMIN_KAKAO_ID ?? 'seed-admin-placeholder';
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME ?? 'nomadongho';
  const profileImageUrl = process.env.ADMIN_PROFILE_IMAGE_URL ?? null;
  await prisma.user.upsert({
    where: { kakaoId: adminKakaoId },
    update: { role: UserRole.ADMIN },
    create: {
      kakaoId: adminKakaoId,
      displayName: adminDisplayName,
      profileImageUrl,
      role: UserRole.ADMIN,
    },
  });

  console.log('✅ Seed complete: countries, cities, categories, and admin user inserted/updated.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
