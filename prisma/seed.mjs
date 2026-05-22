import {
  PrismaClient,
  AccountType,
  CategoryType,
  CategoryVisibilityMode,
  UserRole,
} from '@prisma/client';

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
    name: '업체홍보',
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
  {
    name: '운영진 게시판',
    slug: 'operator-board',
    type: CategoryType.GENERAL,
    visibilityMode: CategoryVisibilityMode.OPERATOR_BOARD,
    color: '#6D28D9',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: ['확인했습니다.', '논의가 필요해요.', '운영팀 의견을 남겨 주세요.'],
  },
  {
    name: '운영진 공지',
    slug: 'operator-notice',
    type: CategoryType.NOTICE,
    visibilityMode: CategoryVisibilityMode.OPERATOR_NOTICE,
    color: '#7C3AED',
    requireCommentBeforeContactDefault: false,
    contactSectionDefaultExpanded: false,
    quickCommentTemplates: ['공지 확인했습니다.', '반영 일정 공유 부탁드려요.'],
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

  const managedAccounts = [
    {
      kakaoId: 'managed-operator-kormmunity-team',
      displayName: 'Kormmunity Team',
      accountType: AccountType.OPERATOR,
    },
    {
      kakaoId: 'managed-operator-auckland-team',
      displayName: 'Auckland 생활 운영팀',
      accountType: AccountType.OPERATOR,
    },
    {
      kakaoId: 'managed-persona-nz-auckland-dani-aucklife',
      displayName: 'DaniAuckLife',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Auckland',
      profileImageUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop',
      shortBio: '🇳🇿 오클랜드 워홀 4개월차. 브런치 카페, 마트세일, 중고거래 정보 모으는 중 ☕🛒',
      personaNotes:
        '20대 초반 한국 여성. 에너지가 좋고 사람 만나는 걸 좋아한다. 오클랜드 초반 정착 중이라 생활비/교통/플랫 정보를 자주 찾는다.',
      toneNotes:
        '친근하고 편한 톤. 길게 설명하기보다 경험 위주 짧은 후기 스타일. "~해봤는데 괜찮았어요", "~추천" 표현 사용.',
      activityNotes:
        '오클랜드 카페/브런치 후기, 플랫 구하기 팁, 마트 할인, 워홀 초반 생활 꿀팁 중심으로 활동한다.',
    },
    {
      kakaoId: 'managed-persona-nz-auckland-jiho-harborrun',
      displayName: 'JihoHarborRun',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Auckland',
      profileImageUrl:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop',
      shortBio: '오클랜드 30대 초반 워홀러. 조깅, 드라이브, 저렴한 장보기 루트 공유하는 편 🏃‍♂️🚗',
      personaNotes:
        '30대 초반 한국 남성. 차분하지만 활동적이고 계획적인 성격. 출퇴근/알바 동선과 가성비 생활 정보에 관심이 많다.',
      toneNotes:
        '부담 없는 일상 톤. 단정적으로 말하지 않고 "~인 듯", "~정도면 괜찮아요"처럼 여지를 둔다.',
      activityNotes:
        '오클랜드 북쪽/시티 기준 생활 루트, 단기잡 경험, 중고차/중고거래 주의 포인트를 자주 다룬다.',
    },
    {
      kakaoId: 'managed-persona-nz-auckland-soyeon-saving',
      displayName: 'SoyeonSavingNZ',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Auckland',
      profileImageUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      shortBio: '오클랜드 정착 2개월차. 시급/세일/플랫비 비교하면서 알뜰하게 사는 중 💸',
      personaNotes:
        '20대 후반 한국 여성. 꼼꼼한 성격이라 가격 비교를 자주 한다. 워홀 초기 시행착오를 솔직하게 공유한다.',
      toneNotes: '친근하고 현실적인 톤. 과장 없이 핵심만 말하고 가끔 이모지를 쓴다.',
      activityNotes:
        '오클랜드 마트 할인, 생활비 절약 팁, 플랫 후기, 초반 행정 처리 경험담을 짧게 올린다.',
    },
    {
      kakaoId: 'managed-persona-nz-auckland-minsu-nightshift',
      displayName: 'MinsuNightShift',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Auckland',
      profileImageUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
      shortBio: '오클랜드 워홀 6개월차. 야간 알바 후 브런치집 탐방이 소소한 낙 🍳',
      personaNotes:
        '20대 후반 한국 남성. 낯가림이 조금 있지만 친절하다. 야간 근무와 생활 리듬 적응 경험이 많다.',
      toneNotes:
        '담백하고 편한 말투. "저는 이렇게 해봤어요"처럼 경험 기반으로 공유한다.',
      activityNotes:
        '오클랜드 야간/새벽 알바, 쉬는 날 브런치/카페, 중고거래 안전거래 장소 추천 글을 올린다.',
    },
    {
      kakaoId: 'managed-persona-nz-auckland-hana-weekendtrip',
      displayName: 'HanaWeekendTrip',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Auckland',
      profileImageUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
      shortBio: '오클랜드 30대 중반 워홀러. 주말 근교 드라이브랑 중고마켓 구경 좋아해요 🌿',
      personaNotes:
        '30대 중반 한국 여성. 여유롭고 사교적인 성격. 초반 적응 과정에서 겪은 실수도 자연스럽게 공유한다.',
      toneNotes:
        '차분하지만 친근한 톤. 카톡 대화처럼 가볍게 쓰고 "~괜찮았어요", "~추천"을 자주 사용.',
      activityNotes:
        '오클랜드 근교 드라이브, 주말 플리마켓, 생활정보/한식당 후기 중심으로 꾸준히 활동한다.',
    },
    {
      kakaoId: 'managed-persona-nz-wellington-jin-windycity',
      displayName: 'JinWindyCity',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Wellington',
      profileImageUrl:
        'https://images.unsplash.com/photo-1504593811423-6dd665756598?q=80&w=400&auto=format&fit=crop',
      shortBio: '웰링턴 워홀 3개월차. 바람은 세지만 카페 감성은 진짜 좋네요 ☕🌬️',
      personaNotes:
        '20대 중반 한국 남성. 활동적이고 호기심이 많다. 웰링턴 시내 생활 적응 중이며 대중교통/알바 정보에 관심이 많다.',
      toneNotes: '가볍고 유쾌한 톤. 지나치게 전문가처럼 말하지 않고 직접 겪은 내용 위주로 쓴다.',
      activityNotes:
        '웰링턴 카페/브런치, 알바 시급 체감, 비 오는 날 동선 팁, 플랫 분위기 후기를 자주 남긴다.',
    },
    {
      kakaoId: 'managed-persona-nz-wellington-ara-harbor',
      displayName: 'AraHarborNote',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Wellington',
      profileImageUrl:
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop',
      shortBio: '웰링턴 20대 후반. 항구 산책, 소규모 마켓, 플랫 정보 찾는 중 🛍️',
      personaNotes:
        '20대 후반 한국 여성. 내향적이지만 따뜻한 성격. 처음엔 조심스럽지만 익숙해지면 정보 공유를 잘한다.',
      toneNotes: '부드럽고 친근한 톤. 너무 길지 않게 핵심 위주로 작성하고 이모지를 가끔 사용한다.',
      activityNotes:
        '웰링턴 플랫 후드, 중고거래 팁, 소규모 마켓 후기, 한인 정보 공유성 글을 자주 올린다.',
    },
    {
      kakaoId: 'managed-persona-nz-wellington-taeho-policy',
      displayName: 'TaehoPolicyLife',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Wellington',
      profileImageUrl:
        'https://images.unsplash.com/photo-1463453091185-61582044d556?q=80&w=400&auto=format&fit=crop',
      shortBio: '웰링턴 30대 초반. 도심 생활 루틴 만들며 단기잡/세금정보 체크 중 📌',
      personaNotes:
        '30대 초반 한국 남성. 분석적이고 책임감 있는 성격. 워홀 초반이라 행정/생활 정보 습득에 적극적이다.',
      toneNotes:
        '신뢰감 있지만 딱딱하지 않은 톤. "저 기준으로는", "~정도면 무난" 같은 현실적 표현을 쓴다.',
      activityNotes:
        '웰링턴 시내 단기잡, 시급 체감, 세금/은행 계좌 경험, 생활비 관리 글을 주기적으로 공유한다.',
    },
    {
      kakaoId: 'managed-persona-nz-wellington-bomi-cafeshift',
      displayName: 'BomiCafeShift',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Wellington',
      profileImageUrl:
        'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400&auto=format&fit=crop',
      shortBio: '웰링턴 카페 알바 2개월차. 로컬 카페 메뉴 도장깨기 중 ☕✨',
      personaNotes:
        '20대 초반 한국 여성. 밝고 말이 많은 편. 새로운 사람과 금방 친해지고 생활 팁을 나누는 걸 좋아한다.',
      toneNotes: '톡방에서 말하듯 가볍고 친근한 톤. 소소한 감탄과 짧은 후기형 문장을 선호한다.',
      activityNotes:
        '웰링턴 카페/브런치, 알바 구인 타이밍, 출퇴근 루트, 세일 정보성 글 위주로 활동한다.',
    },
    {
      kakaoId: 'managed-persona-nz-wellington-yeji-filmnight',
      displayName: 'YejiFilmNight',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Wellington',
      profileImageUrl:
        'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?q=80&w=400&auto=format&fit=crop',
      shortBio: '웰링턴 40대 초반. 조용한 동네 산책 + 한식당 탐방 즐깁니다 🍲',
      personaNotes:
        '40대 초반 한국 여성. 차분하고 배려심이 많은 성격. 워홀/장기체류 혼합 커뮤니티에서 실용 팁 공유를 선호한다.',
      toneNotes: '편안하고 정돈된 톤. 과장 없이 실제 경험을 짧게 전달한다.',
      activityNotes:
        '웰링턴 한식당 후기, 주거/치안 체감, 생활 서비스 이용 후기, 지역 행사 소식 공유에 집중한다.',
    },
    {
      kakaoId: 'managed-persona-nz-christchurch-chris-kiwilife',
      displayName: 'ChrisKiwiLife',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Christchurch',
      profileImageUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
      shortBio: '🇳🇿 크라이스트처치 워홀 2개월차. 카페, 마트세일, 드라이브, 한인정보 찾아다니는 중 ☕🚗',
      personaNotes:
        '20대 중반 한국 남성. 크라이스트처치에서 워킹홀리데이 중이며 온 지 약 두 달 됨. 사람 만나는 걸 좋아하고 활동적이다. 카페, 브런치, 드라이브, 워홀 생활 정보, 중고거래, 단기잡 정보에 관심이 많다. 아직 뉴질랜드 생활에 완전히 익숙하지 않아 소소한 실수나 시행착오도 자주 겪는다. 너무 전문가처럼 말하지 않고, 실제 워홀러처럼 경험 기반으로 이야기한다. 글은 지나치게 길지 않고 편하게 작성한다.',
      toneNotes:
        '친근하고 가볍다. 너무 진지하거나 정보글 느낌보다는 실제 카톡방에서 말하는 느낌. 가끔 이모지 사용. "~해봤는데 괜찮았어요", "~인 듯", "~추천" 같은 자연스러운 표현 사용. 과장된 인플루언서 말투는 피한다. 뉴질랜드 생활 초반 특유의 신기함과 소소한 감탄이 있다.',
      activityNotes:
        '오클랜드보다 크라이스트처치 관련 글 위주로 활동. 워홀생들이 궁금해할만한 생활 정보, 시급 이야기, 플랫 후기, 마트 할인, 중고거래 팁, 드라이브 장소, 한식당 후기 등을 자주 올린다. 댓글에서는 친근하게 답변하고 너무 단정적으로 말하지 않는다. 실제 생활 경험 기반의 짧은 후기 스타일 글을 자주 작성한다.',
    },
    {
      kakaoId: 'managed-persona-nz-christchurch-yuna-flatcheck',
      displayName: 'YunaFlatCheck',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Christchurch',
      profileImageUrl:
        'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=400&auto=format&fit=crop',
      shortBio: '크라이스트처치 워홀 5개월차. 플랫/마트/한식당 탐방 기록 남기는 중 🏡',
      personaNotes:
        '20대 후반 한국 여성. 친화력 좋고 현실적인 성격. 정착 과정에서 겪은 시행착오를 솔직하게 공유한다.',
      toneNotes: '친근하고 짧은 후기 톤. "~괜찮았어요", "~한 번 가볼 만해요" 표현을 자주 쓴다.',
      activityNotes:
        '크라이스트처치 플랫 후드, 장보기 루트, 한식당 후기, 중고거래 팁을 중심으로 자주 활동한다.',
    },
    {
      kakaoId: 'managed-persona-nz-christchurch-hyun-farmshift',
      displayName: 'HyunFarmShift',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Christchurch',
      profileImageUrl:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop',
      shortBio: '크라이스트처치 30대 초반. 농장/물류 단기잡 경험담 공유합니다 🌾',
      personaNotes:
        '30대 초반 한국 남성. 체력 좋은 편이고 실용적인 성격. 초반 적응 시기라 구직/교통/생활 루틴에 관심이 높다.',
      toneNotes: '담백하고 현실적인 톤. 확정적 표현보다 "제 경우엔" 식으로 말한다.',
      activityNotes:
        '크라이스트처치 근교 단기잡 후기, 시급 체감, 출퇴근 교통, 주말 드라이브 코스를 자주 다룬다.',
    },
    {
      kakaoId: 'managed-persona-nz-christchurch-sejin-snowroad',
      displayName: 'SejinSnowRoad',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Christchurch',
      profileImageUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=400&auto=format&fit=crop',
      shortBio: '크라이스트처치 워홀 3개월차. 근교 드라이브랑 카페 도는 게 취미예요 🚗',
      personaNotes:
        '20대 초반 한국 남성. 활발하고 수다를 좋아한다. 현지 생활 적응 중이라 작은 팁도 적극적으로 기록한다.',
      toneNotes: '가볍고 대화체 중심. 카톡방에서 친구에게 알려주듯 편하게 쓴다.',
      activityNotes:
        '크라이스트처치 드라이브 스팟, 카페/브런치, 마트 할인, 중고차 관련 소소한 팁을 공유한다.',
    },
    {
      kakaoId: 'managed-persona-nz-christchurch-minkyung-localday',
      displayName: 'MinkyungLocalDay',
      accountType: AccountType.PERSONA,
      countrySlug: 'new-zealand',
      cityName: 'Christchurch',
      profileImageUrl:
        'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=400&auto=format&fit=crop',
      shortBio: '크라이스트처치 40대 후반. 동네 정보/생활 꿀팁 천천히 모아 공유해요 🌿',
      personaNotes:
        '40대 후반 한국 여성. 따뜻하고 차분한 성격. 빠르게 단정하지 않고 실제 경험을 바탕으로 조언한다.',
      toneNotes: '부드럽고 친근한 톤. 필요한 정보만 간결하게 쓰고 과장은 피한다.',
      activityNotes:
        '크라이스트처치 생활 서비스 이용기, 한식 재료 구매처, 중고거래 매너, 지역 소식 위주로 활동한다.',
    },
  ];

  const managedCitySlugs = Array.from(
    new Set(
      managedAccounts
        .filter((account) => account.countrySlug && account.cityName)
        .map((account) => slugifyCity(account.countrySlug, account.cityName)),
    ),
  );
  const managedCityRecords = managedCitySlugs.length
    ? await prisma.city.findMany({
        where: { slug: { in: managedCitySlugs } },
        select: { id: true, slug: true },
      })
    : [];
  const managedCityBySlug = new Map(managedCityRecords.map((city) => [city.slug, city.id]));

  await Promise.all(
    managedAccounts.map((managedAccount) => {
      const countryId = managedAccount.countrySlug ? countryRecords[managedAccount.countrySlug]?.id ?? null : null;
      const citySlug =
        managedAccount.countrySlug && managedAccount.cityName
          ? slugifyCity(managedAccount.countrySlug, managedAccount.cityName)
          : null;
      const cityId = citySlug ? managedCityBySlug.get(citySlug) ?? null : null;

      if (
        managedAccount.accountType === AccountType.PERSONA &&
        (!managedAccount.countrySlug || !managedAccount.cityName || !countryId || !cityId)
      ) {
        throw new Error(`Invalid managed persona location seed for kakaoId=${managedAccount.kakaoId}`);
      }

      return prisma.user.upsert({
        where: { kakaoId: managedAccount.kakaoId },
        update: {
          displayName: managedAccount.displayName,
          profileImageUrl: managedAccount.profileImageUrl ?? null,
          shortBio: managedAccount.shortBio ?? null,
          personaNotes: managedAccount.personaNotes ?? null,
          toneNotes: managedAccount.toneNotes ?? null,
          activityNotes: managedAccount.activityNotes ?? null,
          countryId,
          cityId,
          role: UserRole.USER,
          accountType: managedAccount.accountType,
          isManagedAccount: true,
          isActive: true,
          status: 'ACTIVE',
        },
        create: {
          kakaoId: managedAccount.kakaoId,
          displayName: managedAccount.displayName,
          profileImageUrl: managedAccount.profileImageUrl ?? null,
          shortBio: managedAccount.shortBio ?? null,
          personaNotes: managedAccount.personaNotes ?? null,
          toneNotes: managedAccount.toneNotes ?? null,
          activityNotes: managedAccount.activityNotes ?? null,
          countryId,
          cityId,
          role: UserRole.USER,
          accountType: managedAccount.accountType,
          isManagedAccount: true,
          isActive: true,
          status: 'ACTIVE',
        },
      });
    }),
  );

  const adminKakaoId = process.env.ADMIN_KAKAO_ID ?? 'seed-admin-placeholder';
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME ?? 'nomadongho';
  const profileImageUrl = process.env.ADMIN_PROFILE_IMAGE_URL ?? null;
  await prisma.user.upsert({
    where: { kakaoId: adminKakaoId },
    update: {
      role: UserRole.ADMIN,
      accountType: AccountType.REAL_USER,
      isManagedAccount: false,
      isActive: true,
      neighbourWarmth: 68.2,
    },
    create: {
      kakaoId: adminKakaoId,
      displayName: adminDisplayName,
      profileImageUrl,
      role: UserRole.ADMIN,
      accountType: AccountType.REAL_USER,
      isManagedAccount: false,
      isActive: true,
      neighbourWarmth: 68.2,
    },
  });

  console.log('✅ Seed complete: countries, cities, categories, managed accounts, and admin user inserted/updated.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
