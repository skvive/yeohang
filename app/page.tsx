import Script from 'next/script';
import { HeaderUser } from '@/app/components/HeaderUser';

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
          <a className="brand v2-brand" href="#home" aria-label="여행갈지도 홈">
            <img className="v2-wordmark" src="/assets/wordmark.svg" alt="여행갈지도" />
          </a>
          <nav className="main-nav" id="mainNav" aria-label="기본 메뉴">
            <a href="#home" data-nav="home">
              홈
            </a>
            <a href="#discover" data-nav="discover">
              숙소 탐색
            </a>
            <a href="#ask" data-nav="ask">
              AI 검색
            </a>
            <a href="#map" data-nav="map">
              내 주변
            </a>
            <a href="#images" data-nav="images">
              숙소 사진
            </a>
            <a href="#places" data-nav="places">
              국내 명소
            </a>
            <a href="#journal" data-nav="journal">
              여행 저널
            </a>
            <a href="#shorts" data-nav="shorts">
              여행 영상
            </a>
            <a href="#events" data-nav="events">
              숙박 할인 행사
            </a>
            <a href="#coupons" data-nav="coupons">
              쿠폰
            </a>
            <a href="#compare" data-nav="compare">
              비교
            </a>
            <a className="nav-kakao" href="#kakao" data-nav="kakao">
              톡 쿠폰
            </a>
            <a className="nav-weekly" href="#weekly" data-nav="weekly">
              🎟 이번 주 혜택
            </a>
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
      </header>
      <main id="app" tabIndex={-1} />
      <nav className="mobile-nav" aria-label="모바일 메뉴">
        <a href="#home">
          ⌂<small>홈</small>
        </a>
        <a href="#discover">
          ⌕<small>탐색</small>
        </a>
        <a href="#ask">
          ✧<small>AI</small>
        </a>
        <a href="#map">
          ♧<small>내 주변</small>
        </a>
        <a href="#weekly">
          ◇<small>주간 혜택</small>
        </a>
        <a href="#kakao">
          ✦<small>톡 쿠폰</small>
        </a>
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
      <Script src="/navigation-v9.js" strategy="afterInteractive" />
      <Script src="/app.js" strategy="afterInteractive" type="module" />
    </>
  );
}
