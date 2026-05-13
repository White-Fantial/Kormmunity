import Link from 'next/link';

const HERO_PHONE_IMAGE_PATH = '/images/hero/kormmunity-hero-phone.png';
const HERO_BG_IMAGE_PATH = '/images/hero/kormmunity-hero-bg.png';

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
        <div
          aria-label="Kormmunity 모바일 앱 미리보기"
          className="mx-auto flex h-[300px] w-full max-w-[220px] items-center justify-center rounded-[2rem] border border-[#f0e4a0] bg-[#fff8cf] p-3 shadow-inner sm:h-[340px]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(255, 248, 207, 0.92), rgba(255, 253, 240, 0.95)), url(${HERO_BG_IMAGE_PATH})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div
            className="h-full w-full rounded-[1.5rem] border border-[#e8e8e8] bg-white shadow-md"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.96)), url(${HERO_PHONE_IMAGE_PATH})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }}
          >
            <div className="space-y-2 p-3">
              <div className="h-3 w-1/2 rounded-full bg-[#fee500]/50" />
              <div className="h-8 rounded-xl bg-[#f7f7f7]" />
              <div className="h-12 rounded-xl bg-[#f7f7f7]" />
              <div className="h-12 rounded-xl bg-[#f7f7f7]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
