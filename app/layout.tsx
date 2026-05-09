import type { Metadata } from 'next';
import Link from 'next/link';

import './globals.css';
import { logoutAction } from '@/app/login/actions';
import { getCurrentUser } from '@/lib/auth/session';
import { canHoldPost, canMakeFinalUserDecision } from '@/lib/permissions';

function getMetadataBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  return process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://example.com';
}

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title: {
    default: 'NZ 한인 커뮤니티 보드',
    template: '%s | NZ 한인 커뮤니티 보드',
  },
  description: '뉴질랜드 한인을 위한 카카오 친화형 지역 커뮤니티 마켓',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: 'NZ 한인 커뮤니티 보드',
    description: '뉴질랜드 한인을 위한 카카오 친화형 지역 커뮤니티 마켓',
    siteName: 'NZ 한인 커뮤니티 보드',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NZ 한인 커뮤니티 보드',
    description: '뉴질랜드 한인을 위한 카카오 친화형 지역 커뮤니티 마켓',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
          <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <Link href="/posts" className="text-lg font-bold">
                NZ 한인 커뮤니티 보드
              </Link>
              {currentUser ? (
                <form action={logoutAction}>
                  <button type="submit" className="text-sm text-zinc-600 underline">
                    로그아웃
                  </button>
                </form>
              ) : (
                <Link href="/login" className="text-sm text-zinc-600 underline">
                  로그인
                </Link>
              )}
            </div>
            <nav className="flex gap-2 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link href="/posts" className="shrink-0 rounded-full border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2">
                홈
              </Link>
              <Link href="/posts/new" className="shrink-0 rounded-full border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2">
                글쓰기
              </Link>
              <Link href="/my/posts" className="shrink-0 rounded-full border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2">
                내 글
              </Link>
              <Link href="/my/profile" className="shrink-0 rounded-full border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2">
                내 프로필
              </Link>
              {currentUser && canHoldPost(currentUser) ? (
                <Link href="/coordinator" className="shrink-0 rounded-full border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2">
                  운영 관리
                </Link>
              ) : null}
              {currentUser && canMakeFinalUserDecision(currentUser) ? (
                <Link href="/admin" className="shrink-0 rounded-full border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2">
                  관리자
                </Link>
              ) : null}
            </nav>
          </header>
          <main className="flex-1 p-4">{children}</main>
        </div>
      </body>
    </html>
  );
}
