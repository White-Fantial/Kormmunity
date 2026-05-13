type HomeStatsBarProps = {
  todayNewPosts: number;
  activeCityCount: number;
  popularKeywords: string[];
};

export function HomeStatsBar({ todayNewPosts, activeCityCount, popularKeywords }: HomeStatsBarProps) {
  return (
    <section className="rounded-2xl border border-[#e8e8e8] bg-white px-4 py-3 shadow-sm">
      <div className="grid gap-1 text-sm sm:grid-cols-3 sm:gap-3">
        <p className="font-medium text-[#333]">오늘 새 글 {todayNewPosts.toLocaleString('ko-KR')}개</p>
        <p className="font-medium text-[#333]">활성 지역 {activeCityCount.toLocaleString('ko-KR')}개 도시</p>
        <p className="truncate font-medium text-[#555]">인기 키워드 {popularKeywords.join(' · ')}</p>
      </div>
    </section>
  );
}
