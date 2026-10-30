import { dbQuery } from '@/lib/db';
import { StayChrome } from '@/lib/stay';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const campaigns = await dbQuery(`SELECT * FROM promo_campaigns WHERE status IN ('demo','active') ORDER BY title`);
  return (
    <StayChrome>
      <section className="promo-hero">
        <div className="wrap">
          <span className="promo-overline">YEOHAENG GALJIDO · TRAVEL CLUB</span>
          <h1>여행갈지도 숙박 할인 행사</h1>
          <p>숙소와 지역별로 조건을 확인하는 여행 혜택 안내. 실제 할인은 업소 승인을 기준으로 합니다.</p>
          <a href="/#events">혜택 조건 비교하고 발급하기 ↗</a>
        </div>
      </section>
      <section className="promo-intro">
        <div className="wrap">
          <h2>여행 스타일별 혜택</h2>
          <div className="promo-grid">
            {campaigns.map((c) => (
              <article className="promo-card" key={String(c.id)}>
                <div className="promo-card-content">
                  <span className="promo-state">{c.status === 'active' && c.funding_approved ? '실제 승인 행사' : '체험 시안 · 실제 할인 불가'}</span>
                  <h2>{String(c.title)}</h2>
                  <p>{String(c.subtitle)}</p>
                  <a className="promo-btn promo-link-btn" href="/#events">
                    조건 확인하기 ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </StayChrome>
  );
}
