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
    name: 'Korea',
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
    name: 'Türkiye',
    slug: 'turkiye',
    cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Other'],
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
];

const categories = [
  {
    name: '자유게시판',
    slug: 'general',
    type: CategoryType.GENERAL,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#3B82F6',
  },
  {
    name: '질문답변',
    slug: 'question',
    type: CategoryType.QUESTION,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#8B5CF6',
  },
  {
    name: '중고거래',
    slug: 'sale',
    type: CategoryType.SALE,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#10B981',
  },
  {
    name: '무료나눔',
    slug: 'giveaway',
    type: CategoryType.GIVEAWAY,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#06B6D4',
  },
  {
    name: '구인구직',
    slug: 'recruit',
    type: CategoryType.RECRUIT,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#F59E0B',
  },
  {
    name: '주거',
    slug: 'housing',
    type: CategoryType.HOUSING,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#EC4899',
  },
  {
    name: '업체/서비스',
    slug: 'service',
    type: CategoryType.SERVICE,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#6366F1',
  },
  {
    name: '모임/이벤트',
    slug: 'event',
    type: CategoryType.EVENT,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#F97316',
  },
  {
    name: '컬럼',
    slug: 'column',
    type: CategoryType.COLUMN,
    visibilityMode: CategoryVisibilityMode.NORMAL,
    color: '#64748B',
  },
  {
    name: '광고',
    slug: 'advertisement',
    type: CategoryType.ADVERTISEMENT,
    visibilityMode: CategoryVisibilityMode.ALWAYS_INCLUDED,
    color: '#EF4444',
  },
  {
    name: '공지사항',
    slug: 'notice',
    type: CategoryType.NOTICE,
    visibilityMode: CategoryVisibilityMode.ALWAYS_INCLUDED,
    color: '#FACC15',
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
          isActive: true,
          sortOrder: index,
        },
        create: {
          name: category.name,
          slug: category.slug,
          type: category.type,
          visibilityMode: category.visibilityMode,
          color: category.color,
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
          color: null,
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
