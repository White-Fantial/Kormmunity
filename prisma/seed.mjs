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
    name: '자유게시판',
    slug: 'general',
    type: CategoryType.GENERAL,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '질문답변',
    slug: 'question',
    type: CategoryType.QUESTION,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '중고거래',
    slug: 'sale',
    type: CategoryType.SALE,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '무료나눔',
    slug: 'giveaway',
    type: CategoryType.GIVEAWAY,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '구인구직',
    slug: 'recruit',
    type: CategoryType.RECRUIT,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '주거',
    slug: 'housing',
    type: CategoryType.HOUSING,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '업체/서비스',
    slug: 'service',
    type: CategoryType.SERVICE,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '모임/이벤트',
    slug: 'event',
    type: CategoryType.EVENT,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '컬럼',
    slug: 'column',
    type: CategoryType.COLUMN,
    visibilityMode: CategoryVisibilityMode.NORMAL,
  },
  {
    name: '광고',
    slug: 'advertisement',
    type: CategoryType.ADVERTISEMENT,
    visibilityMode: CategoryVisibilityMode.ALWAYS_INCLUDED,
  },
  {
    name: '공지사항',
    slug: 'notice',
    type: CategoryType.NOTICE,
    visibilityMode: CategoryVisibilityMode.ALWAYS_INCLUDED,
  },
];

const recommendedTagsByCategoryType = {
  [CategoryType.GENERAL]: [
    '정보공유',
    '일상',
    '잡담',
    '후기',
    '추천',
    '주의',
    '생활팁',
    '새소식',
  ],
  [CategoryType.QUESTION]: [
    '생활질문',
    '학교',
    '비자/이민',
    '병원/의료',
    '자동차',
    '렌트/집',
    '세금/회계',
    '추천요청',
    '급해요',
    '해결됨',
  ],
  [CategoryType.SALE]: [
    '판매중',
    '예약중',
    '가격인하',
    '거래완료',
    '자동차',
    '가구',
    '가전',
    '유아/키즈',
    '의류',
    '기타',
  ],
  [CategoryType.GIVEAWAY]: [
    '나눔중',
    '예약중',
    '나눔완료',
    '픽업필수',
    '빠른픽업',
    '가구',
    '가전',
    '유아/키즈',
    '식품',
    '기타',
  ],
  [CategoryType.RECRUIT]: [
    '구인',
    '구직',
    '풀타임',
    '파트타임',
    '캐주얼',
    '단기',
    '시급',
    '경력무관',
    '채용완료',
    '구직완료',
  ],
  [CategoryType.HOUSING]: [
    '방있음',
    '방구함',
    '렌트',
    '플랫',
    '홈스테이',
    '단기',
    '장기',
    '즉시입주',
    '가족가능',
    '완료',
  ],
  [CategoryType.SERVICE]: [
    '업체홍보',
    '청소',
    '이사',
    '자동차정비',
    '미용',
    '레슨',
    '회계/세무',
    '통번역',
    '사진/영상',
    '추천업체',
  ],
  [CategoryType.EVENT]: [
    '모임',
    '행사',
    '동호회',
    '가족/키즈',
    '스포츠',
    '종교',
    '무료',
    '유료',
    '모집중',
    '마감',
  ],
  [CategoryType.COLUMN]: [
    '정착가이드',
    '생활정보',
    '비자/이민',
    '교육',
    '재테크',
    '법률/세무',
    '인터뷰',
    '기획연재',
    '에디터픽',
    '주간칼럼',
  ],
  [CategoryType.ADVERTISEMENT]: [
    '프로모션',
    '오픈기념',
    '할인',
    '신규서비스',
    '이벤트',
    '예약문의',
    '배달가능',
    '방문가능',
    '기간한정',
    '제휴문의',
  ],
  [CategoryType.NOTICE]: [
    '공지',
    '운영안내',
    '업데이트',
    '점검',
    '규칙',
    '사기주의',
    '긴급',
    '관리자공지',
  ],
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

  for (const [categoryType, labels] of Object.entries(recommendedTagsByCategoryType)) {
    for (const [index, label] of labels.entries()) {
      const slug = `tag-${index + 1}`;
      await prisma.postTagOption.upsert({
        where: {
          categoryType_slug: {
            categoryType,
            slug,
          },
        },
        update: {
          label,
          sortOrder: index,
          isActive: true,
        },
        create: {
          categoryType,
          label,
          slug,
          sortOrder: index,
          isActive: true,
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
