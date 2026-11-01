import Link from 'next/link';

export const metadata = {
  title: '김별의 탐험 수첩 | 여행갈지도',
  description: '그때는 대동여지도, 지금은 여행갈지도. 지도 탐험가 김별과 대한민국 관광지·숙소·여행 혜택을 발견해 보세요.',
};

const friends = [
  { name: '김별', role: '전국 관광지와 역사·문화 탐험', image: '/assets/mascot-jido.webp', link: '/#places', action: '발견 노트 열기' },
  { name: '길별이', role: '내 주변 지도와 길안내', image: '/assets/mascot-gilbyeoli.webp', link: '/#map', action: '여행지도 보기' },
  { name: '머무리', role: '숙소·호텔·펜션 탐색', image: '/assets/mascot-meomuri.webp', link: '/#discover', action: '숙소 수첩 보기' },
  { name: '쿠폰도깨비', role: '무료쿠폰과 주간 행사 안내', image: '/assets/mascot-coupon-goblin.webp', link: '/#weekly', action: '혜택 보따리 보기' },
  { name: '여행온', role: '여행 저널과 쇼츠 영상', image: '/assets/mascot-yeohaengon.webp', link: '/#shorts', action: '여행 영상 보기' },
];

export default function KimByeolPage() {
  return (
    <main className="kb6-story">
      <nav className="kb6-story-nav" aria-label="페이지 이동">
        <Link href="/">← 여행갈지도 홈</Link>
        <span>김별의 새로운 대동여지도</span>
      </nav>
      <header className="kb6-story-hero">
        <div>
          <span className="kb6-story-eyebrow">THE NEW DAEDONG TRAVEL ATLAS</span>
          <h1>그때는 대동여지도,<br /><em>지금은 여행갈지도.</em></h1>
          <p>조선시대의 대동여지도에서 영감을 받은 창작 탐험가 김별. 우리나라 구석구석의 여행지와 머무를 곳, 지역의 맛과 혜택을 오늘의 지도로 연결합니다.</p>
          <Link className="kb6-story-cta" href="/#places">김별과 여행 시작하기</Link>
        </div>
        <img src="/assets/mascot-jido.webp" alt="전통 지도를 들고 여행을 안내하는 김별 캐릭터" />
      </header>
      <section className="kb6-story-section">
        <span className="kb6-story-eyebrow">CHARACTER TRAVEL CREW</span>
        <h2>김별과 함께하는 여행 친구들</h2>
        <p>관광지·지도·숙박·쿠폰·여행 콘텐츠를 다섯 친구가 나누어 안내합니다.</p>
        <div className="kb6-friends">
          {friends.map(friend => (
            <article key={friend.name} className="kb6-friend">
              <img src={friend.image} alt={friend.name + ' 캐릭터'} />
              <h3>{friend.name}</h3>
              <p>{friend.role}</p>
              <Link href={friend.link}>{friend.action} ↗</Link>
            </article>
          ))}
        </div>
      </section>
      <section className="kb6-story-section kb6-story-journey">
        <h2>지도 속 한 번의 여행이 만드는 발견</h2>
        <div>
          <article><strong>01 · 발견</strong><p>관광지와 콘텐츠를 보고 여행지를 선택합니다.</p></article>
          <article><strong>02 · 이동</strong><p>길찾기와 주변 장소 정보를 확인합니다.</p></article>
          <article><strong>03 · 머무름</strong><p>숙박과 맛집 조건을 확인하고 예약처로 이동합니다.</p></article>
          <article><strong>04 · 혜택</strong><p>실제 승인된 제휴 쿠폰과 이벤트를 확인합니다.</p></article>
        </div>
      </section>
      <footer className="kb6-story-footer">
        김별은 역사 속 실존 인물 김정호의 지도 제작 정신에서 영감을 받은 창작 캐릭터입니다.
        일러스트는 관광지의 실제 사진이나 실제 방문 증빙이 아닙니다. 쿠폰·요금·예약 조건은 각 제공처에서 확인하세요.
      </footer>
    </main>
  );
}
