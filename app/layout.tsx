import Script from 'next/script';
import type { Metadata } from 'next';
import './globals.css';

export const viewport = { themeColor: '#092D43' };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://yeohang.lexid.site'),
  title: '여행갈지도 | 김별의 새로운 대동여지도',
  description: '인공지능 검색으로 여행과 숙소를 탐색하세요. 데모용 숙소 정보입니다.',
  icons: { icon: '/assets/icon-192.png' },
  manifest: '/manifest.webmanifest',
  ...(process.env.AGODA_VERIFY_META ? { other: { 'agoda-verification': process.env.AGODA_VERIFY_META } } : {}),
  openGraph: {
    title: '그때는 대동여지도, 지금은 여행갈지도 | 김별의 여행지도',
    description: '인공지능 검색으로 여행과 숙소를 탐색하세요. 데모용 숙소 정보입니다.',
    images: ['/assets/brand-logo-horizontal.webp'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="yeohang-map-tile-url" content={process.env.NEXT_PUBLIC_MAP_TILE_URL || ""} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="/promos.css" />
        <link rel="stylesheet" href="/brand.css" />
        <link rel="stylesheet" href="/brand-v2.css" />
        <link rel="stylesheet" href="/map-stay-categories.css" />
        <link rel="stylesheet" href="/map-multipin.css" />
        <link rel="stylesheet" href="/deal.css" />
        <link rel="stylesheet" href="/ai-search.css" />
        <link rel="stylesheet" href="/places.css" />
        <link rel="stylesheet" href="/kimbyeol-v6.css" />
        <link rel="stylesheet" href="/kimbyeol-story.css" />
      </head>
      <body>{children}<Script src="/kimbyeol-v6.js" strategy="afterInteractive" /></body>
    </html>
  );
}
