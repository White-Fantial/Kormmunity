import Image from 'next/image';
import Link from 'next/link';

const HERO_PHONE_MOCKUP_PATH = '/images/hero/kormmunity-hero-phone-mockup.svg';

export function PublicHomeHero() {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#f1e59a] bg-[#fffce8] p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#8c6b00]">전 세계 한인을 위한 커뮤니티</p>
          <h1 className="text-2xl font-black leading-tight text-[#3c1e1e] sm:text-3xl">
            한인 생활, 더 편하게
            <br />
            정보는 더 쉽게 👋
          </h1>
          <p className="text-sm text-[#5f5f5f]">
            지역 정보부터 중고거래, 구인구직까지
            <br />
            한 곳에서 찾고, 카톡 알림으로 놓치지 마세요.
          </p>
          <ul className="grid gap-2 text-sm text-[#3f3f3f]">
            <li className="rounded-xl bg-white/75 px-3 py-2">
              <p className="font-semibold">키워드 알림</p>
              <p className="text-xs text-[#666]">원하는 글이 올라오면 카카오톡으로 바로!</p>
            </li>
            <li className="rounded-xl bg-white/75 px-3 py-2">
              <p className="font-semibold">지역별 정보</p>
              <p className="text-xs text-[#666]">내 지역의 글만 모아보기</p>
            </li>
            <li className="rounded-xl bg-white/75 px-3 py-2">
              <p className="font-semibold">검색은 쉽게</p>
              <p className="text-xs text-[#666]">지난 글도 쉽게 검색하고 찾기</p>
            </li>
          </ul>
          <div className="space-y-2 pt-1">
            <Link
              href="/api/auth/kakao"
              className="inline-flex items-center justify-center rounded-xl bg-[#fee500] px-4 py-2.5 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
            >
              카카오로 시작하기
            </Link>
            <p className="text-xs text-[#777]">카카오 로그인으로 간편하게 시작해보세요</p>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[240px] items-center justify-center sm:max-w-[260px]">
          <Image
            src={HERO_PHONE_MOCKUP_PATH}
            alt="Kormmunity 모바일 앱 미리보기"
            width={430}
            height={820}
            className="h-auto w-full drop-shadow-xl"
            unoptimized
          />
        </div>
      </div>
    </section>
  );
}
