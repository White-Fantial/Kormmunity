import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import './globals.css';
import { HeaderNavConditional } from '@/components/ui/header-nav-conditional';
import { HeaderNavLink } from '@/components/ui/header-nav-link';
import { NotificationBell } from '@/components/ui/notification-bell';

function getMetadataBaseUrl() {
  const normalizeSiteUrl = (value: string) => {
    try {
      return new URL(value).origin;
    } catch {
      return value.replace(/\/$/, '');
    }
  };

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }

  if (process.env.NEXTAUTH_URL) {
    return normalizeSiteUrl(process.env.NEXTAUTH_URL);
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return undefined;
}

const metadataBaseUrl = getMetadataBaseUrl();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl ? new URL(metadataBaseUrl) : undefined,
  title: {
    default: 'Kormmunity 한인 커뮤니티',
    template: '%s | Kormmunity 한인 커뮤니티',
  },
  description: '전 세계 한인 이민자를 위한 지역 커뮤니티',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: 'Kormmunity 한인 커뮤니티',
    description: '전 세계 한인 이민자를 위한 지역 커뮤니티',
    siteName: 'Kormmunity 한인 커뮤니티',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kormmunity 한인 커뮤니티',
    description: '전 세계 한인 이민자를 위한 지역 커뮤니티',
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
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#fee500] text-base font-black text-[#3c1e1e]">
                  K
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kormmunity-logo.png"
                  alt="Kormmunity logo"
                  width={210}
                  height={149}
                  className="h-8 w-auto sm:h-6"
                />
                <span>한인 커뮤니티</span>
              </Link>
              <div className="flex items-center gap-2">
                <Suspense fallback={<div aria-hidden="true" className="h-9 w-9 shrink-0" />}>
                  <NotificationBell />
                </Suspense>
              </div>
            </div>
            <nav className="flex gap-2 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <HeaderNavLink href="/posts">홈</HeaderNavLink>
              <HeaderNavLink href="/posts/new">글쓰기</HeaderNavLink>
              <HeaderNavLink href="/my/posts">내 글</HeaderNavLink>
              <HeaderNavLink href="/my/saved">저장한 글</HeaderNavLink>
              <HeaderNavLink href="/my/notifications">알림</HeaderNavLink>
              <HeaderNavLink href="/my/profile">내 프로필</HeaderNavLink>
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
