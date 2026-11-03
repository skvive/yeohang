# 여행갈지도 NAV · 브랜드 및 지도 UI V3 디자인 QA (2026-11-04)

## 변경 범위 / 기존 코드 재사용
- 기존 V9 지도 로직 (`public/app.js`, `public/map-multipin.js`, `public/map-kakao-provider.js`) 및 5km 숙소 필터·마커·길찾기 이벤트는 유지.
- 정적 AI 이미지 자산: `/public/assets/yeohang-nav-master-logo.png`, `yeohang-nav-og-1200x630.jpg`, `yeohang-nav-appicon-512.png`, `yeohang-nav-icon-32.png`.
- 접힘지도·산·도로·오렌지 핀 심벌 SVG: `/public/assets/nav-brand-mark.svg`, `/public/assets/nav-brand-lockup.svg`, `/app/icon.svg`.
- OG 이미지 라우트: `/app/opengraph-image.jpg` (실제 생성한 1200×630 AI 이미지); `/app/apple-icon.png`.
- 브랜드 UI 스타일: `/public/nav-brand-v3.css`(기존 CSS 유지, 오버라이드).
- 지도 브라우저 접근 진입점: `/navigation` → `/#map`. 실제 엔진은 기존 지도 컴포넌트 재사용.
- 원본 이미지: `/public/assets/wordmark.svg`, `/public/assets/icon-192.png`, `/public/assets/icon-512.png`, `/public/assets/brand-hero.webp` 그대로 보관.
- 2026-11-04 이전 AI 생성 원본 이미지 묶음은 Google Drive `여행갈지도_NAV_브랜드_20261104`에 별도로 저장.

## 브랜드 디자인 언어
- Navy `#082C42`, Teal `#087F7B`, Orange `#FF7925`, Cream `#FFF8EC`.
- 로고: 네이버/모바일 UI에서 강한 인지성을 갖는 지도·산·도로·핀 조합.
- 김별·길별이 캐릭터 및 예전 AI 숙소 콘셉트 8종을 제거하지 않고 유지.
- 모바일 지도는 독립적인 지도 높이 52dvh + 리스트 최대 44vh, 카테고리 퀵필터 수평 스크롤, 주요 컨트롤 최소 39~45px.

## 검수 근거 및 상태
- 최신 GitHub 작업 브랜치: `chatgpt/yeohang-nav-brand-20261104` (main 미변경).
- `npm run build` / Vercel Preview READY: [신규 배포 검증 후 채워야 함].
- Node 회귀 테스트: `node --test tests/navigation-v9.test.mjs` (CI 확인 필요).
- OG 이미지 1200×630 및 아이콘 PNG 검사: 이미지 크기·ZIP SHA-256 및 GitHub blob 연결 확인.
- 시각 테스트: PC 1440×900, 모바일 390×844/360×800, 지도 로딩, 검색, 5km 마커, GPS 거부 시 가락시장역 폴백, 이미지 누락 체크 — 브라우저 스크린샷은 별도 수행해야 함.
- Kakao API 키 미등록 시 Leaflet 기본 지도와 외부 카카오맵 길찾기만 표시. 앱 내 턴바이턴·실주행 검증 완료라고 표기하지 않는다.
- 데모 숙소/쿠폰, 상표 사용 관련 기존 고지 유지.
- 최종 운영 배포는 Preview 기능·시각 검증 이후에만 수행.

## 배포 기준
1. 소스 회귀 테스트 통과.
2. Vercel Next.js build/route compile 통과.
3. `/navigation`, `/icon.svg`, `/opengraph-image`, `/assets/yeohang-nav-master-logo.png` 실행 요청 확인.
4. 카카오 실제 OAuth/지도 키 및 Android 에뮬레이터 검증은 별도 관문.
