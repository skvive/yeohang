import type { Metadata } from 'next';
import './globals.css';

export const viewport = { themeColor: '#092D43' };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://yeohang.lexid.site'),
  title: '여행갈지도 | YEOHAENG GALJIDO',
  description: 'AI 검색으로 여행과 숙소를 탐색하세요. 데모용 숙소 정보입니다.',
  icons: { icon: '/assets/icon-192.png' },
  manifest: '/manifest.webmanifest',
  ...(process.env.AGODA_VERIFY_META ? { other: { 'agoda-verification': process.env.AGODA_VERIFY_META } } : {}),
  openGraph: {
    title: '여행갈지도 | 여행을 발견하는 더 좋은 방법',
    description: 'AI 검색으로 여행과 숙소를 탐색하세요. 데모용 숙소 정보입니다.',
    images: ['/assets/brand-logo-horizontal.webp'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="/promos.css" />
        <link rel="stylesheet" href="/brand.css" />
        <link rel="stylesheet" href="/brand-v2.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
