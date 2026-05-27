import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '카카오 오픈프로필 설정방법',
  description: '카카오 오픈프로필 만들기와 공유 절차를 실제 카카오톡 흐름 기준으로 정리한 안내',
};

type GuideStep = {
  id: number;
  title: string;
  screenTitle: string;
  screenDescription: string;
  target: string;
  nextCondition: string;
  mockType:
    | 'chat-list'
    | 'more-tab'
    | 'open-chat-home'
    | 'open-profile-builder'
    | 'open-profile-complete'
    | 'share-sheet';
};

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 1,
    title: '채팅 또는 더보기에서 시작',
    screenTitle: '카카오톡 기본 화면',
    screenDescription:
      '카카오톡을 열고 하단 탭에서 더보기(···)로 이동해 주세요. 오픈채팅 메뉴를 찾기 위한 첫 단계입니다.',
    target: '하단의 더보기(···) 탭 누르기',
    nextCondition: '더보기 화면에서 오픈채팅 메뉴가 보이면 다음으로 진행',
    mockType: 'chat-list',
  },
  {
    id: 2,
    title: '더보기에서 오픈채팅 선택',
    screenTitle: '더보기',
    screenDescription:
      '더보기 화면에서 카카오 서비스 항목 중 오픈채팅을 눌러 주세요. 메뉴가 아래쪽에 있으면 스크롤해서 찾으면 됩니다.',
    target: '오픈채팅 메뉴 누르기',
    nextCondition: '오픈채팅 홈이 열리면 내 오픈프로필 영역 확인',
    mockType: 'more-tab',
  },
  {
    id: 3,
    title: '오픈채팅 홈에서 오픈프로필 만들기',
    screenTitle: '오픈채팅',
    screenDescription:
      '오픈채팅 홈에서 채팅방 만들기가 아니라 오픈프로필 만들기를 선택해 주세요. 내 오픈프로필 영역 또는 + 버튼 근처에서 찾을 수 있습니다.',
    target: '오픈프로필 만들기 버튼 누르기',
    nextCondition: '프로필 생성 화면이 열리면 정보 입력 시작',
    mockType: 'open-chat-home',
  },
  {
    id: 4,
    title: '프로필 정보 입력과 설정',
    screenTitle: '오픈프로필 만들기',
    screenDescription:
      '프로필 사진, 이름, 소개를 입력하고 검색 허용/참여 조건을 설정해 주세요. 상대가 봤을 때 알아보기 쉬운 이름과 소개를 쓰는 것이 좋습니다.',
    target: '입력 완료 후 완료 버튼 누르기',
    nextCondition: '내 오픈프로필 화면이 열리면 생성 완료',
    mockType: 'open-profile-builder',
  },
  {
    id: 5,
    title: '생성 완료 후 공유 버튼 확인',
    screenTitle: '내 오픈프로필',
    screenDescription:
      '오픈프로필이 만들어지면 공유 버튼이 보입니다. 공유 전에 프로필 이름과 소개가 맞는지 한 번 더 확인해 주세요.',
    target: '공유 버튼 누르기',
    nextCondition: '공유 시트에서 링크 복사 옵션이 보이면 다음으로 진행',
    mockType: 'open-profile-complete',
  },
  {
    id: 6,
    title: '공유 시트에서 링크 복사',
    screenTitle: '공유',
    screenDescription:
      '공유 시트에서 링크 복사를 선택해 open.kakao.com/o/... 주소를 복사해 주세요. 복사한 링크를 Kormmunity 프로필에 붙여넣으면 연결됩니다.',
    target: '링크 복사 누르기',
    nextCondition: '복사한 링크를 Kormmunity 프로필에 저장하면 완료',
    mockType: 'share-sheet',
  },
];

const CHAT_ITEMS = [
  {
    name: '동네 나눔방 1662',
    previewTop: '오늘 저녁 물품 나눔 공지 있어요',
    previewBottom: '필요한 분은 자유롭게 참여해 주세요.',
    time: '6:12 AM',
    accent: 'church',
  },
  {
    name: '오픈채팅 알림봇',
    previewTop: '[댓글 알림] "동네소식"에 새 댓글이 달렸어요.',
    previewBottom: '작성자: 익명회원...',
    time: 'Yesterday',
    accent: 'photo',
  },
  {
    name: '우리집 사진방',
    previewTop: '4 photos',
    previewBottom: '',
    time: '26 May',
    accent: 'family',
  },
  {
    name: '주말 운동 모임 31',
    previewTop: '오늘 오후 4시반부터 약 한시간정도 짧게 등반할 계획입',
    previewBottom: '니다. 시간되시는 분은 볼더코에서 봬요.',
    time: '24 May',
    accent: 'yellow',
  },
  {
    name: '생활정보 채널',
    previewTop: '(광고) 🌹 이번 연휴는 화려한 장미와 함께!',
    previewBottom: '',
    time: '23 May',
    badge: '2',
    accent: 'yellow',
  },
];

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#fee500] px-2 py-0.5 text-[11px] font-semibold text-[#3c1e1e]">
      {children}
    </span>
  );
}

function DarkPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[2.25rem] bg-[#0a0a0b] p-3 shadow-[0_20px_48px_rgba(0,0,0,0.24)]">
      <div className="overflow-hidden rounded-[1.8rem] border border-[#1c1c1d] bg-[#050505]">
        {children}
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-4 text-white">
      <span className="text-[15px] font-semibold tracking-[-0.02em]">6:54</span>
      <div className="flex h-9 w-[150px] items-center justify-between rounded-full border border-[#2f2f31] bg-black px-3">
        <div className="h-4 w-8 rounded-full bg-[linear-gradient(135deg,#6ca8ff,#141414)]" />
        <div className="flex items-end gap-1">
          <span className="h-1.5 w-1 rounded-full bg-[#556270]" />
          <span className="h-2.5 w-1 rounded-full bg-[#556270]" />
          <span className="h-4 w-1 rounded-full bg-[#556270]" />
          <span className="h-2.5 w-1 rounded-full bg-[#556270]" />
          <span className="h-1.5 w-1 rounded-full bg-[#556270]" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-end gap-0.5">
          <span className="h-2 w-1 rounded-sm bg-white" />
          <span className="h-3 w-1 rounded-sm bg-white" />
          <span className="h-4 w-1 rounded-sm bg-white" />
          <span className="h-5 w-1 rounded-sm bg-white" />
        </span>
        <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent border-r-transparent rotate-45" />
        <span className="rounded-lg bg-white px-1.5 py-0.5 text-[11px] font-bold text-black">48</span>
      </div>
    </div>
  );
}

function HeaderIcons({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 text-white">
      <h3 className="text-[28px] font-bold tracking-[-0.03em]">{label}</h3>
      <div className="flex items-center gap-3 text-[#f3f3f3]">
        <span className="h-7 w-7 rounded-full border border-[#3a3a3d]" />
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#3a3a3d] text-lg">+</span>
        <span className="h-7 w-7 rounded-full border border-[#3a3a3d]" />
        <span className="h-7 w-7 rounded-full border border-[#3a3a3d]" />
      </div>
    </div>
  );
}

 function BottomTabBar({ active }: { active: 'friends' | 'chat' | 'phone' | 'more' }) {
  const items: { id: 'friends' | 'chat' | 'phone' | 'more'; label: string; badge?: string }[] = [
    { id: 'friends', label: '친구' },
    { id: 'chat', label: '채팅', badge: '2' },
    { id: 'phone', label: '통화' },
    { id: 'more', label: '더보기' },
  ];

  return (
    <div className="mt-3 border-t border-[#1b1b1d] bg-[#111113] px-5 pb-4 pt-3">
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <div key={item.id} className="flex flex-col items-center gap-1 text-center">
              <div
                className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
                  isActive ? 'bg-[#1f1f22] text-white' : 'text-[#7c7c82]'
                }`}
              >
                <span className="text-[10px] font-semibold">{item.label.slice(0, 1)}</span>
                {item.badge ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f26a33] px-1 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] ${isActive ? 'text-white' : 'text-[#74747b]'}`}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChatAvatar({ accent }: { accent: string }) {
  const classes: Record<string, string> = {
    church: 'bg-[radial-gradient(circle_at_50%_30%,#6bc3ff,#2966c9_60%,#ffffff_61%)]',
    photo: 'bg-[linear-gradient(135deg,#8f6233,#2a1810)]',
    family: 'bg-[linear-gradient(135deg,#7a8a9d,#0d1320)]',
    yellow: 'bg-[#f6d75a]',
  };

  return <div className={`h-12 w-12 rounded-full ${classes[accent] ?? 'bg-[#303036]'}`} />;
}

function ChatRow({
  name,
  previewTop,
  previewBottom,
  time,
  badge,
  accent,
}: (typeof CHAT_ITEMS)[number]) {
  return (
    <div className="grid grid-cols-[48px_1fr_auto] gap-3">
      <ChatAvatar accent={accent} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-white">{name}</p>
        <p className="truncate text-[11px] text-[#a0a0a7]">{previewTop}</p>
        {previewBottom ? <p className="truncate text-[11px] text-[#7a7a81]">{previewBottom}</p> : null}
      </div>
      <div className="flex min-w-[52px] flex-col items-end gap-2 pt-1">
        <span className="text-[10px] text-[#8b8b92]">{time}</span>
        {badge ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f26a33] px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Chip({
  label,
  active = false,
  badge,
}: {
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] ${
        active
          ? 'border-white bg-white font-semibold text-black'
          : 'border-[#3a3a3d] bg-[#111113] text-[#c7c7cc]'
      }`}
    >
      <span>{label}</span>
      {badge ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f26a33] px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.2rem] border border-[#202024] bg-[#111113] p-3">
      <p className="text-[11px] font-semibold text-white">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-[#bcbcc3]">{label}</p>
      <div
        className={`rounded-xl border px-3 py-2 text-[11px] ${
          highlighted
            ? 'border-[#f0d94f] bg-[#2a2716] text-[#fff1a5]'
            : 'border-[#26262a] bg-[#17171a] text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-full bg-[#fee500] px-4 py-2 text-center text-[11px] font-semibold text-[#3c1e1e]">
      {children}
    </div>
  );
}

function StepMockScreen({ mockType }: { mockType: GuideStep['mockType'] }) {
  if (mockType === 'chat-list') {
    return (
      <DarkPhoneFrame>
        <StatusBar />
        <HeaderIcons label="Chats" />
        <div className="px-5 pt-4">
          <div className="flex flex-wrap gap-2">
            <Chip label="All" active />
            <Chip label="오픈채팅" badge="2" />
            <Chip label="읽지 않음" />
            <Chip label="+" />
          </div>
          <div className="mt-4 space-y-4">
            {CHAT_ITEMS.map((item) => (
              <ChatRow key={`${item.name}-${item.time}`} {...item} />
            ))}
          </div>
        </div>
        <BottomTabBar active="more" />
      </DarkPhoneFrame>
    );
  }

  if (mockType === 'more-tab') {
    return (
      <DarkPhoneFrame>
        <StatusBar />
        <HeaderIcons label="More" />
        <div className="space-y-3 px-5 pt-4 pb-5">
          <SectionCard title="서비스">
            <div className="grid grid-cols-3 gap-2">
              {['캘린더', '메일', '쇼핑'].map((item) => (
                <div key={item} className="rounded-2xl border border-[#202024] bg-[#17171a] px-2 py-4 text-center text-[10px] text-[#d0d0d6]">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="카카오 서비스">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-[#5b4c00] bg-[#2b2500] px-3 py-4 text-left text-[11px] text-[#fff3a1]">
                <p className="font-semibold">오픈채팅</p>
                <p className="mt-1 text-[10px] text-[#e1d07a]">프로필 만들기 / 공유</p>
              </div>
              <div className="rounded-2xl border border-[#202024] bg-[#17171a] px-3 py-4 text-[11px] text-[#d0d0d6]">톡서랍</div>
              <div className="rounded-2xl border border-[#202024] bg-[#17171a] px-3 py-4 text-[11px] text-[#d0d0d6]">선물하기</div>
              <div className="rounded-2xl border border-[#202024] bg-[#17171a] px-3 py-4 text-[11px] text-[#d0d0d6]">메이커스</div>
            </div>
          </SectionCard>
          <div className="rounded-2xl border border-dashed border-[#3d3d41] px-3 py-2 text-[10px] text-[#8d8d94]">
            오픈채팅 메뉴를 누르면 다음 화면으로 이동합니다.
          </div>
        </div>
        <BottomTabBar active="more" />
      </DarkPhoneFrame>
    );
  }

  if (mockType === 'open-chat-home') {
    return (
      <DarkPhoneFrame>
        <StatusBar />
        <HeaderIcons label="Open Chat" />
        <div className="space-y-3 px-5 pt-4 pb-5">
          <SectionCard title="내 오픈프로필">
            <div className="rounded-2xl border border-[#2e2e33] bg-[#17171a] p-3">
              <p className="text-[12px] font-semibold text-white">내 프로필</p>
              <p className="mt-1 text-[10px] text-[#9e9ea6]">링크를 공유할 수 있는 프로필을 만듭니다.</p>
              <div className="mt-3">
                <PrimaryButton>오픈프로필 만들기</PrimaryButton>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="참여 중인 오픈채팅">
            <div className="space-y-2">
              {['뉴질랜드 벼룩시장', 'Kormmunity 클라이밍', '동네 정보방'].map((item) => (
                <div key={item} className="rounded-xl bg-[#17171a] px-3 py-2 text-[11px] text-[#d5d5db]">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
          <div className="flex justify-end">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fee500] text-xl font-semibold text-[#3c1e1e]">
              +
            </div>
          </div>
        </div>
      </DarkPhoneFrame>
    );
  }

  if (mockType === 'open-profile-builder') {
    return (
      <DarkPhoneFrame>
        <StatusBar />
        <HeaderIcons label="Create Profile" />
        <div className="space-y-3 px-5 pt-4 pb-5">
          <SectionCard title="오픈프로필 만들기">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full border border-dashed border-[#54545a] bg-[#17171a]" />
                <div className="text-[10px] text-[#95959c]">프로필 사진 추가</div>
              </div>
              <Field label="이름" value="Kormmunity NZ" highlighted />
              <Field label="소개" value="중고거래/동네정보 문의용 오픈프로필" />
              <Field label="검색 허용" value="허용" />
              <Field label="참여 조건" value="프로필 확인 후 참여" />
            </div>
          </SectionCard>
          <PrimaryButton>완료</PrimaryButton>
        </div>
      </DarkPhoneFrame>
    );
  }

  if (mockType === 'open-profile-complete') {
    return (
      <DarkPhoneFrame>
        <StatusBar />
        <HeaderIcons label="My Open Profile" />
        <div className="space-y-3 px-5 pt-4 pb-5">
          <SectionCard title="생성 완료">
            <div className="rounded-2xl border border-[#2a2a2f] bg-[#17171a] p-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[linear-gradient(135deg,#ffe866,#705d00)]" />
                <div>
                  <p className="text-[12px] font-semibold text-white">Kormmunity NZ</p>
                  <p className="text-[10px] text-[#9f9fa6]">중고거래 / 동네소식 문의용</p>
                </div>
              </div>
              <div className="mt-3">
                <PrimaryButton>공유</PrimaryButton>
              </div>
            </div>
          </SectionCard>
          <div className="rounded-2xl border border-[#1f4226] bg-[#102315] px-3 py-2 text-[10px] text-[#9fe1aa]">
            프로필 생성이 완료되었습니다.
          </div>
        </div>
      </DarkPhoneFrame>
    );
  }

  return (
    <DarkPhoneFrame>
      <StatusBar />
      <HeaderIcons label="Share" />
      <div className="px-5 pb-5 pt-6">
        <div className="rounded-[1.6rem] border border-[#202024] bg-[#111113] p-3">
          <p className="text-[11px] font-semibold text-white">공유 방법</p>
          <div className="mt-3 space-y-2">
            <div className="rounded-2xl border border-[#202024] bg-[#17171a] px-3 py-3 text-[11px] text-[#d9d9de]">
              카카오톡으로 공유
            </div>
            <div className="rounded-2xl border border-[#5b4c00] bg-[#2b2500] px-3 py-3 text-[11px] font-semibold text-[#fff1a5]">
              링크 복사
              <p className="mt-1 text-[10px] font-normal text-[#dbc978]">https://open.kakao.com/o/xxxxx</p>
            </div>
            <div className="rounded-2xl border border-[#202024] bg-[#17171a] px-3 py-3 text-[11px] text-[#d9d9de]">
              다른 앱으로 공유
            </div>
          </div>
        </div>
      </div>
    </DarkPhoneFrame>
  );
}

function GuideDetails({ step }: { step: GuideStep }) {
  return (
    <div className="space-y-3">
      <Badge>STEP {step.id}</Badge>
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-[#202020]">{step.title}</h2>
        <div className="rounded-xl border border-[#efefef] bg-white px-4 py-3 text-sm text-[#4d4d4d]">
          <dl className="space-y-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b8b8b]">이 단계 안내</dt>
              <dd className="mt-1 leading-relaxed">{step.screenDescription}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b8b8b]">지금 할 일</dt>
              <dd className="mt-1 leading-relaxed">{step.target}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b8b8b]">다음으로 넘어가기</dt>
              <dd className="mt-1 leading-relaxed">{step.nextCondition}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function KakaoOpenProfileGuidePage() {
  return (
    <section className="space-y-6 rounded-2xl border border-[#ececec] bg-white p-4 shadow-sm sm:p-6">
      <div className="space-y-3">
        <p className="inline-flex rounded-full border border-[#f2db00] bg-[#fff9c4] px-3 py-1 text-xs font-semibold text-[#3c1e1e]">
          카카오 오픈프로필 연결 가이드
        </p>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#1f1f1f]">카카오 오픈프로필 만들기 · 공유 따라하기</h1>
          <p className="text-sm leading-relaxed text-[#666]">
            카카오톡에서 바로 따라 할 수 있도록 “더보기 진입 → 오픈채팅 → 오픈프로필 만들기 → 정보 입력 → 공유” 순서로
            준비했습니다.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#ece5a5] bg-[#fffdf2] px-4 py-3 text-sm leading-relaxed text-[#5a4a00]">
        화면은 카카오톡 실제 흐름에 맞춰 순서대로 구성되어 있습니다. 현재 앱 화면과 조금 다르더라도 메뉴 이름(더보기, 오픈채팅, 오픈프로필,
        공유)을 기준으로 따라가면 쉽게 찾을 수 있어요.
      </div>

      <div className="space-y-4">
        {GUIDE_STEPS.map((step) => (
          <article
            key={step.id}
            className="grid gap-4 rounded-2xl border border-[#efefef] bg-[#fcfcfc] p-4 shadow-[0_6px_16px_rgba(20,20,20,0.06)] md:grid-cols-[1fr_340px] md:items-center"
          >
            <GuideDetails step={step} />
            <div className="space-y-2">
              <p className="text-center text-xs font-semibold text-[#6b6b6b]">{step.screenTitle} 재현 이미지</p>
              <StepMockScreen mockType={step.mockType} />
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 rounded-2xl border border-[#efefef] bg-[#fcfcfc] p-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
          <p className="text-sm font-semibold text-[#222]">헷갈릴 때 확인 포인트</p>
          <ul className="mt-2 space-y-1.5 text-sm text-[#555]">
            <li>• 오픈채팅 홈에서는 채팅방 만들기 대신 오픈프로필 만들기를 선택하세요.</li>
            <li>• 소개 문구는 상대가 알아보기 쉬운 용도로 짧고 명확하게 적어주세요.</li>
            <li>• 공유 전 이름/소개를 다시 확인하면 잘못된 링크 공유를 줄일 수 있어요.</li>
            <li>• 공유 시트에서는 카카오톡 공유보다 링크 복사가 가장 빠릅니다.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
          <p className="text-sm font-semibold text-[#222]">마지막 연결 체크</p>
          <ul className="mt-2 space-y-1.5 text-sm text-[#555]">
            <li>• 링크가 https://open.kakao.com/o/ 로 시작하나요?</li>
            <li>• 소개 문구에 전화번호·이메일 같은 민감정보가 없나요?</li>
            <li>• 복사한 링크를 Kormmunity 프로필에 저장했나요?</li>
            <li>• 링크를 저장한 뒤 Kormmunity 프로필에서 정상 노출되는지 확인했나요?</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
