import type { Metadata } from 'next';
import './globals.css';

export const viewport = { themeColor: '#083747' };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://yeohang.lexid.site'),
  title: '여행갈지도 | 길별이와 떠나는 스마트 여행 지도',
  description: '여행갈지도 NAV에서 주변 숙소와 여행지를 지도에서 탐색하고 길별이와 함께 여행 계획을 세워보세요. 지도·숙소·쿠폰은 일부 시연 데이터입니다.',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/apple-icon.png' },
  manifest: '/manifest.webmanifest',
  ...(process.env.AGODA_VERIFY_META ? { other: { 'agoda-verification': process.env.AGODA_VERIFY_META } } : {}),
  twitter: { card: 'summary_large_image', title: '여행갈지도 NAV', images: ['/opengraph-image'] },
  openGraph: {
    title: '여행갈지도 NAV | 그때는 대동여지도, 지금은 여행갈지도',
    description: '인공지능 검색으로 여행과 숙소를 탐색하세요. 데모용 숙소 정보입니다.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: '여행갈지도 여행 내비게이션 브랜드' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="yeohang-map-tile-url" content={process.env.NEXT_PUBLIC_MAP_TILE_URL || ""} />
        <meta name="yeohang-kakao-js-key" content={process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY || ""} />
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
        <link rel="stylesheet" href="/navigation-v9.css" />
        <link rel="stylesheet" href="/map-kakao-provider.css" />
        <link rel="stylesheet" href="/nav-brand-v3.css" />
        <link rel="stylesheet" href="/deal.css" />
        <link rel="stylesheet" href="/ai-search.css" />
        <link rel="stylesheet" href="/places.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
