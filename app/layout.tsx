import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import './globals.css';
import { HeaderAuthButton } from '@/components/ui/header-auth-button';
import { HeaderNavConditional } from '@/components/ui/header-nav-conditional';

function getMetadataBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return undefined;
}

const metadataBaseUrl = getMetadataBaseUrl();

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl ? new URL(metadataBaseUrl) : undefined,
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
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full text-[#1a1a1a]" style={{ background: 'var(--background)' }}>
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
          <header className="sticky top-0 z-10 border-b border-[#e8e8e8] bg-white/95 px-4 py-3 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <Link href="/posts" className="flex items-center gap-2 text-lg font-bold">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#fee500] text-base font-black text-[#3c1e1e]">K</span>
                <span>NZ 한인 커뮤니티</span>
              </Link>
              <Suspense fallback={<div className="w-16" />}>
                <HeaderAuthButton />
              </Suspense>
            </div>
            <nav className="flex gap-2 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link href="/posts" className="shrink-0 rounded-full border border-[#e8e8e8] bg-white px-3 py-1.5 font-medium text-[#1a1a1a] hover:border-[#fee500] hover:bg-[#fffde7]">
                홈
              </Link>
              <Link href="/posts/new" className="shrink-0 rounded-full bg-[#fee500] px-3 py-1.5 font-semibold text-[#3c1e1e] hover:bg-[#f5db00]">
                글쓰기
              </Link>
              <Link href="/my/posts" className="shrink-0 rounded-full border border-[#e8e8e8] bg-white px-3 py-1.5 font-medium text-[#1a1a1a] hover:border-[#fee500] hover:bg-[#fffde7]">
                내 글
              </Link>
              <Link href="/my/saved" className="shrink-0 rounded-full border border-[#e8e8e8] bg-white px-3 py-1.5 font-medium text-[#1a1a1a] hover:border-[#fee500] hover:bg-[#fffde7]">
                저장한 글
              </Link>
              <Link href="/my/profile" className="shrink-0 rounded-full border border-[#e8e8e8] bg-white px-3 py-1.5 font-medium text-[#1a1a1a] hover:border-[#fee500] hover:bg-[#fffde7]">
                내 프로필
              </Link>
              <Suspense fallback={null}>
                <HeaderNavConditional />
              </Suspense>
            </nav>
          </header>
          <main className="flex-1 p-4">{children}</main>
        </div>
      </body>
    </html>
  );
}
