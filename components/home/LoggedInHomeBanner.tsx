import Link from 'next/link';

type LoggedInHomeBannerProps = {
  nickname: string;
  cityId?: string | null;
};

export function LoggedInHomeBanner({ nickname, cityId }: LoggedInHomeBannerProps) {
  return (
    <section className="rounded-2xl border border-[#f1e59a] bg-[#fffce8] p-4 shadow-sm">
      <div className="flex min-h-[86px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-base font-bold text-[#3c1e1e]">안녕하세요, {nickname}님 👋</p>
          <p className="text-sm text-[#6b6b6b]">오늘도 필요한 정보를 쉽게 찾고 알림받아 보세요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/my/profile"
            className="inline-flex items-center justify-center rounded-xl bg-[#fee500] px-3 py-2 text-xs font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
          >
            키워드 알림 관리
          </Link>
          {cityId ? (
            <Link
              href={`/posts?city=${encodeURIComponent(cityId)}`}
              className="inline-flex items-center justify-center rounded-xl border border-[#e8e8e8] bg-white px-3 py-2 text-xs font-semibold text-[#555] hover:border-[#fee500] hover:bg-[#fffde7]"
            >
              내 지역 새 글 보기
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
