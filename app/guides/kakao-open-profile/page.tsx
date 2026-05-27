import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '카카오 오픈프로필 설정방법',
  description: '카카오 오픈채팅 오픈프로필 만들기와 링크 복사 방법 안내',
};

type GuideStep = {
  id: number;
  title: string;
  description: string;
  mockType: 'open-chat-tab' | 'create-open-chat' | 'create-open-profile' | 'copy-link' | 'paste-in-kormmunity';
};

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 1,
    title: '카카오톡에서 오픈채팅으로 이동',
    description: '카카오톡을 열고 하단 메뉴에서 오픈채팅 탭으로 이동해 주세요.',
    mockType: 'open-chat-tab',
  },
  {
    id: 2,
    title: '오픈채팅 만들기 선택',
    description: '오픈채팅 화면에서 오른쪽 상단의 + 버튼 또는 오픈채팅 만들기를 선택해 주세요.',
    mockType: 'create-open-chat',
  },
  {
    id: 3,
    title: '오픈프로필 만들기',
    description: '대화방이 아니라 오픈프로필을 만들어야 해요. 프로필 이름, 소개, 참여 조건을 간단히 설정해 주세요.',
    mockType: 'create-open-profile',
  },
  {
    id: 4,
    title: '공유 버튼에서 링크 복사',
    description:
      '완성 후 공유 버튼을 누르고 링크 복사를 선택해 주세요. 복사된 링크는 보통 https://open.kakao.com/o/... 형식으로 시작합니다.',
    mockType: 'copy-link',
  },
  {
    id: 5,
    title: 'Kormmunity 프로필에 붙여넣기',
    description:
      '복사한 링크를 Kormmunity 프로필의 카카오 오픈프로필 링크 입력칸에 붙여넣고 저장하면 완료됩니다.',
    mockType: 'paste-in-kormmunity',
  },
];

function PhoneMockFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2rem] border-4 border-[#121212] bg-[#121212] p-2 shadow-[0_14px_30px_rgba(15,15,15,0.2)]">
      <div className="overflow-hidden rounded-[1.45rem] bg-[#f7f7f8]">
        <div className="flex h-7 items-center justify-center bg-[#121212]">
          <span className="h-1.5 w-20 rounded-full bg-[#2f2f2f]" />
        </div>
        <div className="border-b border-[#ececec] bg-white px-4 py-2.5">
          <p className="text-center text-xs font-semibold text-[#1a1a1a]">{title}</p>
        </div>
        <div className="min-h-[280px] bg-[#f8f8f8] px-3 py-3">{children}</div>
      </div>
    </div>
  );
}

function Marker({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#fee500] px-2 py-0.5 text-[11px] font-semibold text-[#3c1e1e]">
      {children}
    </span>
  );
}

function StepMockScreen({ mockType }: { mockType: GuideStep['mockType'] }) {
  if (mockType === 'open-chat-tab') {
    return (
      <PhoneMockFrame title="카카오톡">
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-[#333]">최근 대화</p>
            <div className="mt-2 space-y-2 text-[11px] text-[#777]">
              <div className="rounded-lg bg-[#f3f3f3] px-2 py-1.5">동네 소식방</div>
              <div className="rounded-lg bg-[#f3f3f3] px-2 py-1.5">중고거래 문의</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white p-2 shadow-sm">
            <div className="rounded-lg p-2 text-center text-[10px] text-[#777]">친구</div>
            <div className="rounded-lg p-2 text-center text-[10px] text-[#777]">채팅</div>
            <div className="rounded-lg border border-[#f2db00] bg-[#fff6a8] p-2 text-center text-[10px] font-semibold text-[#3c1e1e]">
              오픈채팅
            </div>
            <div className="rounded-lg p-2 text-center text-[10px] text-[#777]">더보기</div>
          </div>
        </div>
      </PhoneMockFrame>
    );
  }

  if (mockType === 'create-open-chat') {
    return (
      <PhoneMockFrame title="오픈채팅">
        <div className="space-y-2">
          <div className="flex justify-end">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f2db00] bg-[#fee500] text-lg font-bold text-[#3c1e1e]">
              +
            </div>
          </div>
          <div className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
            <div className="rounded-lg border border-[#f2db00] bg-[#fff9c4] px-2 py-2 text-xs font-semibold text-[#3c1e1e]">
              오픈채팅 만들기
            </div>
            <div className="rounded-lg bg-[#f3f3f3] px-2 py-2 text-xs text-[#777]">참여 중인 오픈채팅</div>
            <div className="rounded-lg bg-[#f3f3f3] px-2 py-2 text-xs text-[#777]">최근 본 오픈채팅</div>
          </div>
        </div>
      </PhoneMockFrame>
    );
  }

  if (mockType === 'create-open-profile') {
    return (
      <PhoneMockFrame title="오픈채팅 만들기">
        <div className="space-y-2 rounded-xl bg-white p-3 shadow-sm text-xs">
          <div className="rounded-lg bg-[#f3f3f3] px-2 py-2 text-[#666]">일반 오픈채팅방 만들기</div>
          <div className="rounded-lg border-2 border-[#f2db00] bg-[#fff9c4] px-2 py-2 font-semibold text-[#3c1e1e]">
            오픈프로필 만들기
            <p className="mt-1 text-[10px] font-medium text-[#5a4a00]">대화방이 아닌 프로필 링크를 생성해요</p>
          </div>
          <div className="mt-1 space-y-1 rounded-lg border border-dashed border-[#d6d6d6] bg-[#fafafa] p-2 text-[10px] text-[#666]">
            <p>프로필 이름</p>
            <p>소개 문구</p>
            <p>참여 조건</p>
          </div>
        </div>
      </PhoneMockFrame>
    );
  }

  if (mockType === 'copy-link') {
    return (
      <PhoneMockFrame title="내 오픈프로필">
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-[#333]">우리동네 나눔프로필</p>
            <p className="mt-1 text-[10px] text-[#777]">지역 정보 교환용 오픈프로필</p>
            <button
              type="button"
              className="mt-3 w-full rounded-lg border border-[#f2db00] bg-[#fee500] px-3 py-2 text-xs font-semibold text-[#3c1e1e]"
            >
              공유
            </button>
          </div>
          <div className="rounded-xl border border-[#e6e6e6] bg-white p-2 shadow-sm">
            <p className="rounded-md bg-[#fff9c4] px-2 py-1 text-[11px] font-semibold text-[#3c1e1e]">링크 복사</p>
            <p className="mt-1 px-1 text-[10px] text-[#666]">https://open.kakao.com/o/xxxxx</p>
          </div>
        </div>
      </PhoneMockFrame>
    );
  }

  return (
    <PhoneMockFrame title="Kormmunity 프로필 수정">
      <div className="space-y-3 rounded-xl bg-white p-3 shadow-sm">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[#333]">카카오 오픈프로필 링크</p>
          <div className="rounded-lg border-2 border-[#f2db00] bg-[#fffef1] px-2 py-2 text-[10px] text-[#5e5e5e]">
            https://open.kakao.com/o/xxxxx
          </div>
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-[#fee500] px-3 py-2 text-xs font-bold text-[#3c1e1e] shadow-sm"
        >
          저장하기
        </button>
      </div>
    </PhoneMockFrame>
  );
}

export default function KakaoOpenProfileGuidePage() {
  return (
    <section className="space-y-6 rounded-2xl border border-[#ececec] bg-white p-4 shadow-sm sm:p-6">
      <div className="space-y-3">
        <p className="inline-flex rounded-full border border-[#f2db00] bg-[#fff9c4] px-3 py-1 text-xs font-semibold text-[#3c1e1e]">
          카카오 오픈프로필 연결 가이드
        </p>
        <div>
          <h1 className="text-2xl font-bold text-[#1f1f1f]">카카오 오픈프로필 설정방법</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#666]">
            카카오 오픈프로필 링크를 등록하면 다른 사용자가 전화번호를 몰라도 카카오톡으로 안전하게 연락할 수 있어요.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {GUIDE_STEPS.map((step) => (
          <article
            key={step.id}
            className="grid gap-4 rounded-2xl border border-[#efefef] bg-[#fcfcfc] p-4 shadow-[0_6px_16px_rgba(20,20,20,0.06)] md:grid-cols-[1fr_320px] md:items-center"
          >
            <div className="space-y-2">
              <Marker>STEP {step.id}</Marker>
              <h2 className="text-lg font-bold text-[#222]">{step.title}</h2>
              <p className="text-sm leading-relaxed text-[#4d4d4d]">{step.description}</p>
            </div>
            <StepMockScreen mockType={step.mockType} />
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-[#f2db00] bg-[#fff9c4] px-4 py-3 text-sm leading-relaxed text-[#5a4a00]">
        개인 전화번호, 이메일, 집 주소, 직장명 등 민감한 개인정보는 오픈프로필 소개나 채팅방 설명에 넣지 않는 것을 권장합니다.
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
        <p className="text-sm font-semibold text-[#222]">최종 점검 체크리스트</p>
        <ul className="mt-2 space-y-1.5 text-sm text-[#555]">
          <li>• 링크가 https://open.kakao.com/o/ 로 시작하나요?</li>
          <li>• 개인 연락처가 포함되어 있지 않나요?</li>
          <li>• Kormmunity 프로필 저장을 완료했나요?</li>
        </ul>
      </div>
    </section>
  );
}
