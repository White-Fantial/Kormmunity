import Link from 'next/link';

export function GlobalFooter() {
  return (
    <footer className="border-t border-[#e8e8e8] bg-white px-4 py-5">
      <div className="mx-auto max-w-3xl space-y-3">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#888]" aria-label="법적 고지">
          <Link href="/legal/terms" className="hover:text-[#555] hover:underline">
            이용약관
          </Link>
          <Link href="/legal/privacy" className="font-medium hover:text-[#555] hover:underline">
            개인정보처리방침
          </Link>
          <Link href="/legal/community-guidelines" className="hover:text-[#555] hover:underline">
            운영정책
          </Link>
          <a
            href="mailto:hello.kormmunity@gmail.com?subject=문의/제안 (Kormmunity)"
            className="hover:text-[#555] hover:underline"
          >
            문의하기
          </a>
        </nav>
        <p className="text-xs text-[#bbb]">© 2026 Kormmunity. All rights reserved.</p>
      </div>
    </footer>
  );
}
