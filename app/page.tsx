import type { Metadata } from 'next';
import Script from 'next/script';
import { HeaderUser } from '@/app/components/HeaderUser';


export const metadata: Metadata = {
  title: '여행갈지도 | 여행·숙소 탐색 프로토타입',
  description: '여행지 탐색, 여행 일정, AI 여행 추천 및 숙소 탐색을 소개하는 디자인·기능 프로토타입입니다. 숙소·쿠폰은 시연 데이터이며 실시간 요금·재고를 제공하지 않습니다.',
  alternates: { canonical: 'https://yeohang.lexid.site/' },
};

export default function HomePage() {
  return (
    <>
      <a className="skip-to-content" href="#app">
        본문으로 바로가기
      </a>
      <div id="demoBar">
        <span className="demo-bullet" /> <strong>가칭 · 디자인/기능 프로토타입</strong>
        <span>
          ‘여행갈지도’는 타사에서도 사용 중인 명칭입니다. 정식 출시 전 상표 검토 필요 · 숙소/쿠폰은 시연 데이터 · 실시간
          요금/재고 미제공
        </span>
        <button id="dismissDemo" aria-label="안내 닫기">
          ×
        </button>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand v2-brand" href="#nav" aria-label="여행갈지도 홈 및 네비">
            <img className="v2-wordmark" src="/assets/wordmark.svg" alt="여행갈지도" />
          </a>

          <nav className="main-nav v3-primary-nav" id="mainNav" aria-label="주요 여행 메뉴">
            <a href="#home" data-nav="home">홈</a>
            <a href="#places" data-nav="places">여행지 찾기</a>
            <a href="#discover" data-nav="discover">숙소 예약</a>
            <a href="#planner" data-nav="planner">여행 일정</a>
            <a href="#weekly" data-nav="weekly">혜택</a>
            <details className="v3-more-nav">
              <summary aria-label="추가 여행 메뉴">더보기 ▾</summary>
              <div className="v3-more-list">
                <a href="#ask" data-nav="ask">AI 여행 추천</a>
                <a href="#map" data-nav="map">내 주변 숙소</a>
                <a href="#images" data-nav="images">숙소 사진</a>
                <a href="#journal" data-nav="journal">여행 저널</a>
                <a href="#shorts" data-nav="shorts">여행 영상</a>
                <a href="#events" data-nav="events">숙박 할인 행사</a>
                <a href="#coupons" data-nav="coupons">쿠폰</a>
                <a href="#compare" data-nav="compare">숙소 비교</a>
                <a href="#kakao" data-nav="kakao">톡 쿠폰</a>
                <a href="#saved" data-nav="saved">저장한 여행</a>
              </div>
            </details>
          </nav>
          <div className="header-actions">
            <HeaderUser />
            <button className="small-text-btn" id="partnerBtn">
              숙소 파트너
            </button>
            <button className="outline-btn" id="savedBtn" title="찜한 숙소">
              ♡ <span>저장</span>
            </button>
            <button className="menu-toggle" id="menuToggle" aria-label="메뉴 열기">
              ☰
            </button>
          </div>
        </div>
        <nav className="app-mode-switch" aria-label="앱 모드">
          <a className="app-mode-choice" href="#home" data-mode="stay" data-nav="home">
            <span className="mode-index">01</span>
            <span><strong>숙소 탐색 데모</strong><small>숙소 찾기 · 혜택</small></span>
          </a>
          <a className="app-mode-choice" href="#nav" data-mode="nav" data-nav="nav">
            <span className="mode-index">02</span>
            <span><strong>여행갈지도 네비</strong><small>차량 길안내</small></span>
          </a>
        </nav>
      </header>
      <main id="app" tabIndex={-1} />
      <nav className="mobile-nav v3-mobile-tabs" aria-label="모바일 여행 메뉴">
        <a href="#home" data-nav="home"><span className="v3-tab-icon" aria-hidden="true">⌂</span><small>홈</small></a>
        <a href="#places" data-nav="places"><span className="v3-tab-icon" aria-hidden="true">⌖</span><small>여행지</small></a>
        <a href="#discover" data-nav="discover"><span className="v3-tab-icon" aria-hidden="true">▰</span><small>숙소</small></a>
        <a href="#planner" data-nav="planner"><span className="v3-tab-icon" aria-hidden="true">▦</span><small>일정</small></a>
        <a href="#saved" data-nav="saved"><span className="v3-tab-icon" aria-hidden="true">♡</span><small>내 여행</small></a>
      </nav>
      <nav className="mobile-nav app-mode-mobile" aria-label="앱 모드">
        <a href="#home" data-mode="stay"><span aria-hidden="true">🏨</span><small>숙소 탐색 데모</small></a>
        <a href="#nav" data-mode="nav"><span aria-hidden="true">🚘</span><small>여행갈지도 네비</small></a>
      </nav>
      <div id="overlay" className="overlay hidden" role="presentation">
        <div className="modal" role="dialog" aria-modal="true" aria-label="상세 정보">
          <button id="closeModal" className="close-modal" aria-label="닫기">
            ×
          </button>
          <div id="modalContent" />
        </div>
      </div>
      <div id="toast" className="toast" aria-live="polite" />
      <div id="promoModal" className="promo-modal-backdrop" hidden>
        <div className="promo-modal-box" role="dialog" aria-modal="true" aria-label="여행갈지도 여행 쿠폰 발급">
          <button type="button" className="promo-close" data-promo-close aria-label="창 닫기">
            ×
          </button>
          <div className="promo-modal-content" />
        </div>
      </div>
      <Script src="/geo.js" strategy="afterInteractive" />
      <Script src="/promos.js" strategy="afterInteractive" />
      <Script src="/brand.js" strategy="afterInteractive" />
      <Script src="/kakao-channel.js" strategy="afterInteractive" />
      <Script src="/brand-v2.js" strategy="afterInteractive" />
      <Script src="/map-multipin.js" strategy="afterInteractive" />
      <Script src="/app.js" strategy="afterInteractive" type="module" />
    </>
  );
}
