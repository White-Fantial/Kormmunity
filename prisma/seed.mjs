import { PrismaClient, CategoryType, CategoryVisibilityMode, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const countries = [
  {
    name: 'Australia',
    slug: 'australia',
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Gold Coast', 'Other'],
  },
  {
    name: 'Austria',
    slug: 'austria',
    cities: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Other'],
  },
  {
    name: 'Belgium',
    slug: 'belgium',
    cities: ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liege', 'Bruges', 'Other'],
  },
  {
    name: 'Canada',
    slug: 'canada',
    cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Other'],
  },
  {
    name: 'Chile',
    slug: 'chile',
    cities: ['Santiago', 'Valparaiso', 'Concepcion', 'La Serena', 'Antofagasta', 'Temuco', 'Other'],
  },
  {
    name: 'Colombia',
    slug: 'colombia',
    cities: ['Bogota', 'Medellin', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Other'],
  },
  {
    name: 'Costa Rica',
    slug: 'costa-rica',
    cities: ['San Jose', 'Alajuela', 'Cartago', 'Heredia', 'Liberia', 'Puntarenas', 'Other'],
  },
  {
    name: 'Czech Republic',
    slug: 'czech-republic',
    cities: ['Prague', 'Brno', 'Ostrava', 'Plzen', 'Liberec', 'Olomouc', 'Other'],
  },
  {
    name: 'Denmark',
    slug: 'denmark',
    cities: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Other'],
  },
  {
    name: 'Estonia',
    slug: 'estonia',
    cities: ['Tallinn', 'Tartu', 'Narva', 'Parnu', 'Kohtla-Jarve', 'Viljandi', 'Other'],
  },
  {
    name: 'Finland',
    slug: 'finland',
    cities: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Other'],
  },
  {
    name: 'France',
    slug: 'france',
    cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Other'],
  },
  {
    name: 'Germany',
    slug: 'germany',
    cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Dusseldorf', 'Other'],
  },
  {
    name: 'Greece',
    slug: 'greece',
    cities: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Other'],
  },
  {
    name: 'Hungary',
    slug: 'hungary',
    cities: ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pecs', 'Gyor', 'Other'],
  },
  {
    name: 'Iceland',
    slug: 'iceland',
    cities: ['Reykjavik', 'Kopavogur', 'Hafnarfjordur', 'Akureyri', 'Reykjanesbaer', 'Selfoss', 'Other'],
  },
  {
    name: 'Indonesia',
    slug: 'indonesia',
    cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Denpasar', 'Other'],
  },
  {
    name: 'Ireland',
    slug: 'ireland',
    cities: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Drogheda', 'Other'],
  },
  {
    name: 'Israel',
    slug: 'israel',
    cities: ['Jerusalem', 'Tel Aviv', 'Haifa', 'Rishon LeZion', 'Petah Tikva', 'Beersheba', 'Other'],
  },
  {
    name: 'Italy',
    slug: 'italy',
    cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Bologna', 'Florence', 'Other'],
  },
  {
    name: 'Japan',
    slug: 'japan',
    cities: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kyoto', 'Other'],
  },
  {
    name: 'South Korea',
    slug: 'south-korea',
    cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Ulsan', 'Other'],
  },
  {
    name: 'Latvia',
    slug: 'latvia',
    cities: ['Riga', 'Daugavpils', 'Liepaja', 'Jelgava', 'Jurmala', 'Ventspils', 'Other'],
  },
  {
    name: 'Lithuania',
    slug: 'lithuania',
    cities: ['Vilnius', 'Kaunas', 'Klaipeda', 'Siauliai', 'Panevezys', 'Alytus', 'Other'],
  },
  {
    name: 'Luxembourg',
    slug: 'luxembourg',
    cities: ['Luxembourg City', 'Esch-sur-Alzette', 'Differdange', 'Dudelange', 'Ettelbruck', 'Diekirch', 'Other'],
  },
  {
    name: 'Malaysia',
    slug: 'malaysia',
    cities: ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Ipoh', 'Kota Kinabalu', 'Kuching', 'Other'],
  },
  {
    name: 'Mexico',
    slug: 'mexico',
    cities: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Leon', 'Merida', 'Other'],
  },
  {
    name: 'Netherlands',
    slug: 'netherlands',
    cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen', 'Other'],
  },
  {
    name: 'New Zealand',
    slug: 'new-zealand',
    cities: [
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
    ],
  },
  {
    name: 'Norway',
    slug: 'norway',
    cities: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromso', 'Kristiansand', 'Other'],
  },
  {
    name: 'Philippines',
    slug: 'philippines',
    cities: ['Manila', 'Quezon City', 'Davao', 'Cebu City', 'Makati', 'Pasig', 'Other'],
  },
  {
    name: 'Poland',
    slug: 'poland',
    cities: ['Warsaw', 'Krakow', 'Lodz', 'Wroclaw', 'Poznan', 'Gdansk', 'Other'],
  },
  {
    name: 'Portugal',
    slug: 'portugal',
    cities: ['Lisbon', 'Porto', 'Braga', 'Coimbra', 'Faro', 'Funchal', 'Other'],
  },
  {
    name: 'Slovak Republic',
    slug: 'slovak-republic',
    cities: ['Bratislava', 'Kosice', 'Presov', 'Zilina', 'Nitra', 'Banska Bystrica', 'Other'],
  },
  {
    name: 'Slovenia',
    slug: 'slovenia',
    cities: ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Koper', 'Novo Mesto', 'Other'],
  },
  {
    name: 'Spain',
    slug: 'spain',
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Malaga', 'Bilbao', 'Other'],
  },
  {
    name: 'Sweden',
    slug: 'sweden',
    cities: ['Stockholm', 'Gothenburg', 'Malmo', 'Uppsala', 'Vasteras', 'Orebro', 'Other'],
  },
  {
    name: 'Switzerland',
    slug: 'switzerland',
    cities: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Lucerne', 'Other'],
  },
  {
    name: 'Thailand',
    slug: 'thailand',
    cities: ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Hat Yai', 'Khon Kaen', 'Other'],
  },
  {
    name: 'Turkiye',
    slug: 'turkiye',
    cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Other'],
  },
  {
    name: 'United Arab Emirates',
    slug: 'united-arab-emirates',
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Al Ain', 'Other'],
  },
  {
    name: 'United Kingdom',
    slug: 'united-kingdom',
    cities: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Leeds', 'Liverpool', 'Edinburgh', 'Bristol', 'Other'],
  },
  {
    name: 'United States',
    slug: 'united-states',
    cities: [
      'New York',
      'Los Angeles',
      'Chicago',
      'Houston',
      'Phoenix',
      'Philadelphia',
      'San Antonio',
      'San Diego',
      'Dallas',
      'San Jose',
      'Other',
    ],
  },
  {
    name: 'Vietnam',
    slug: 'vietnam',
    cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho', 'Nha Trang', 'Other'],
  },
];

const categories = [
  {
    name: '자유게시판',
    slug: 'general',
    type: CategoryType.GENERAL,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#3B82F6',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: ['공유해 주셔서 감사합니다.', '이 글 계속 보고 있어요.', '조금 더 자세히 알려주실 수 있나요?'],
  },
  {
    name: '질문답변',
    slug: 'question',
    type: CategoryType.QUESTION,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#8B5CF6',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: ['저도 같은 질문이 있어요.', '이 글 계속 보고 있어요.'],
  },
  {
    name: '중고거래',
    slug: 'sale',
    type: CategoryType.SALE,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#10B981',
    requireCommentBeforeContactDefault: true,
    contactSectionDefaultExpanded: true,
    quickCommentTemplates: [
      '아직 판매 중인가요?',
      '어디서 거래하면 될까요?',
      '오늘 픽업 가능할까요?',
      '가격 조정 가능할까요?',
    ],
  },
  {
    name: '무료나눔',
    slug: 'giveaway',
    type: CategoryType.GIVEAWAY,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#06B6D4',
    requireCommentBeforeContactDefault: true,
    contactSectionDefaultExpanded: true,
    quickCommentTemplates: ['아직 나눔 가능한가요?', '언제 가져갈 수 있을까요?'],
  },
  {
    name: '구인구직',
    slug: 'recruit',
    type: CategoryType.RECRUIT,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#F59E0B',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: true,
    quickCommentTemplates: [
      '아직 채용 중인가요?',
      '근무 시간을 알려주실 수 있나요?',
      '급여 범위가 어떻게 되나요?',
    ],
  },
  {
    name: '주거',
    slug: 'housing',
    type: CategoryType.HOUSING,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#EC4899',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: [
      '아직 가능한가요?',
      '입주 가능일을 알려주실 수 있나요?',
      '주차 포함인가요?',
    ],
  },
  {
    name: '업체/서비스',
    slug: 'service',
    type: CategoryType.SERVICE,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#6366F1',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: [
      '가격 안내해 주실 수 있나요?',
      '최근 후기가 있을까요?',
      '어떻게 예약하면 되나요?',
    ],
  },
  {
    name: '모임/이벤트',
    slug: 'event',
    type: CategoryType.EVENT,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#F97316',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: ['관심 있습니다.', '아직 신청 가능한가요?', '친구와 함께 가도 되나요?'],
  },
  {
    name: '컬럼',
    slug: 'column',
    type: CategoryType.COLUMN,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#64748B',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: ['공유해 주셔서 감사합니다.', '이 글 계속 보고 있어요.', '도움이 많이 됐어요.'],
  },
  {
    name: '광고',
    slug: 'advertisement',
    type: CategoryType.ADVERTISEMENT,
    visibilityMode: CategoryVisibilityMode.ALWAYS_INCLUDED,
    color: '#EF4444',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: ['현재 가격을 알려주실 수 있나요?', '기간 한정 혜택이 있나요?', '어떻게 연락드리면 될까요?'],
  },
  {
    name: '공지사항',
    slug: 'notice',
    type: CategoryType.NOTICE,
    visibilityMode: CategoryVisibilityMode.ALWAYS_INCLUDED,
    color: '#FACC15',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: ['업데이트 계속 확인하고 있어요.', '공지해 주셔서 감사합니다.'],
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
    '사진/영상',
    '서비스제안/문의'
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

const reputationSettingDefaults = {
  COMMUNITY_SCORE_DELTA_POST_LIKE_RECEIVED: 1.0,
  COMMUNITY_SCORE_DELTA_COMMENT_LIKE_RECEIVED: 1.2,
  COMMUNITY_SCORE_DELTA_BEST_COMMENT_SELECTED: 5.0,
  COMMUNITY_SCORE_DELTA_COORDINATOR_RESTORES: 3.0,
  COMMUNITY_SCORE_DELTA_ADMIN_RESTORES: 5.0,
  COMMUNITY_SCORE_DELTA_POST_REPORT_SUBMITTED: -2.0,
  COMMUNITY_SCORE_DELTA_COMMENT_REPORT_SUBMITTED: -2.5,
  COMMUNITY_SCORE_DELTA_COORDINATOR_HOLDS: -5.0,
  COMMUNITY_SCORE_DELTA_ADMIN_DELETES: -10.0,
  COMMUNITY_SCORE_POST_AUTO_HOLD_THRESHOLD: -8,
  COMMUNITY_SCORE_COMMENT_AUTO_HOLD_THRESHOLD: -5,
  NEIGHBOUR_WARMTH_DELTA_POST_LIKE_RECEIVED: 0.3,
  NEIGHBOUR_WARMTH_DELTA_COMMENT_LIKE_RECEIVED: 0.5,
  NEIGHBOUR_WARMTH_DELTA_BEST_COMMENT_SELECTED: 3.0,
  NEIGHBOUR_WARMTH_DELTA_VALID_POST_REPORT: -1.0,
  NEIGHBOUR_WARMTH_DELTA_VALID_COMMENT_REPORT: -1.2,
  NEIGHBOUR_WARMTH_DELTA_COORDINATOR_HOLDS: -3.0,
  NEIGHBOUR_WARMTH_DELTA_ADMIN_DELETES: -6.0,
  NEIGHBOUR_WARMTH_DELTA_FALSE_REPORT: -2.0,
  NEIGHBOUR_WARMTH_BASE_WARMTH: 36.5,
  NEIGHBOUR_WARMTH_MIN_WARMTH: 0,
  NEIGHBOUR_WARMTH_MAX_WARMTH: 100,
  NEIGHBOUR_WARMTH_GROWTH_CURVE: 1.6,
  NEIGHBOUR_WARMTH_DROP_CURVE: 1.4,
};

function slugifyText(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugifyCity(countrySlug, city) {
  return `${countrySlug}-${slugifyText(city)}`;
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

  for (const country of countries) {
    const countryId = countryRecords[country.slug].id;
    await Promise.all(
      country.cities.map(async (name, index) => {
        const slug = slugifyCity(country.slug, name);
        const existing = await prisma.city.findFirst({
          where: {
            countryId,
            name,
          },
          select: { id: true },
        });

        if (existing) {
          await prisma.city.update({
            where: { id: existing.id },
            data: { name, slug, isActive: true, sortOrder: index, countryId },
          });
          return;
        }

        await prisma.city.upsert({
          where: { slug },
          update: { name, isActive: true, sortOrder: index, countryId },
          create: {
            name,
            slug,
            isActive: true,
            sortOrder: index,
            countryId,
          },
        });
      }),
    );
  }

  await Promise.all(
    categories.map((category, index) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          type: category.type,
          visibilityMode: category.visibilityMode,
          color: category.color,
          requireCommentBeforeContactDefault: category.requireCommentBeforeContactDefault,
          contactSectionDefaultExpanded: category.contactSectionDefaultExpanded,
          quickCommentTemplates: category.quickCommentTemplates,
          isActive: true,
          sortOrder: index,
        },
        create: {
          name: category.name,
          slug: category.slug,
          type: category.type,
          visibilityMode: category.visibilityMode,
          color: category.color,
          requireCommentBeforeContactDefault: category.requireCommentBeforeContactDefault,
          contactSectionDefaultExpanded: category.contactSectionDefaultExpanded,
          quickCommentTemplates: category.quickCommentTemplates,
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

  await Promise.all(
    Object.entries(reputationSettingDefaults).map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    ),
  );

  const operatorProfiles = [
    { displayName: '오클랜드 생활지기', slug: 'auckland-life' },
    { displayName: '오클랜드 중고소식', slug: 'auckland-market' },
    { displayName: '오클랜드 잡담지기', slug: 'auckland-talk' },
    { displayName: '웰링턴 생활지기', slug: 'wellington-life' },
    { displayName: '웰링턴 구직도우미', slug: 'wellington-jobs' },
    { displayName: '웰링턴 잡담지기', slug: 'wellington-talk' },
  ];

  await Promise.all(
    operatorProfiles.map((profile) =>
      prisma.operatorProfile.upsert({
        where: { slug: profile.slug },
        update: { displayName: profile.displayName, isActive: true },
        create: {
          displayName: profile.displayName,
          slug: profile.slug,
          isActive: true,
        },
      }),
    ),
  );

  const adminKakaoId = process.env.ADMIN_KAKAO_ID ?? 'seed-admin-placeholder';
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME ?? 'nomadongho';
  const profileImageUrl = process.env.ADMIN_PROFILE_IMAGE_URL ?? null;
  await prisma.user.upsert({
    where: { kakaoId: adminKakaoId },
    update: { role: UserRole.ADMIN, neighbourWarmth: 68.2 },
    create: {
      kakaoId: adminKakaoId,
      displayName: adminDisplayName,
      profileImageUrl,
      role: UserRole.ADMIN,
      neighbourWarmth: 68.2,
    },
  });

  console.log('✅ Seed complete: countries, cities, categories, operator profiles, and admin user inserted/updated.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
