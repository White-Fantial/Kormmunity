import Link from 'next/link';

type KakaoOpenProfileGuideLinkProps = {
  className?: string;
};

export function KakaoOpenProfileGuideLink({ className }: KakaoOpenProfileGuideLinkProps) {
  return (
    <Link
      href="/guides/kakao-open-profile"
      className={`inline-flex items-center rounded-full border border-[#e1e1e1] px-2 py-0.5 text-[11px] font-semibold text-[#666] hover:border-[#d3d3d3] hover:bg-[#fafafa] hover:text-[#333] ${className ?? ''}`.trim()}
    >
      설정방법
    </Link>
  );
}
