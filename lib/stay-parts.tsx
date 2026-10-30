import { agodaBookUrl } from '@/lib/agoda';
import type { Property } from '@/lib/domain';
import type { StayProfile } from '@/lib/stay-content';
import { tripBookUrl } from '@/lib/trip';

export type StayDraftId = 'a' | 'b' | 'c' | 'now';

export const STAY_DRAFTS: { id: StayDraftId; label: string; hint: string; recommended?: boolean }[] = [
  { id: 'a', label: 'A 가이드북', hint: '동네 이야기 + 시설', recommended: true },
  { id: 'b', label: 'B 상품카드', hint: '후기·시설 한눈에' },
  { id: 'c', label: 'C 하루동선', hint: '거점 숙소로 쓰기' },
  { id: 'now', label: '현재', hint: '아고다 원문 나열' },
];

export function parseStayDraft(raw?: string): StayDraftId {
  if (raw === 'b' || raw === 'c' || raw === 'now' || raw === 'a') return raw;
  return 'a';
}

export function escapeStay(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function PartnerPriceButtons({
  agodaHref,
  tripHref,
  compact,
}: {
  agodaHref: string;
  tripHref: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'partner-price-btns partner-price-btns-compact' : 'partner-price-btns'}>
      {agodaHref ? (
        <a
          className="btn btn-agoda js-agoda-book"
          href={agodaHref}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          data-agoda-book="1"
        >
          아고다최저가
        </a>
      ) : null}
      {tripHref ? (
        <a
          className="btn btn-trip js-trip-book"
          href={tripHref}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          data-trip-book="1"
        >
          트립닷컴최저가
        </a>
      ) : null}
    </div>
  );
}

export function StayCrumbs({ p }: { p: Property }) {
  const e = escapeStay;
  return (
    <nav className="breadcrumbs" aria-label="현재 위치">
      <a href="/">여행갈지도 (가칭)</a>
      <span>/</span>
      <a href="/#discover">국내 숙소</a>
      <span>/</span>
      <span>{e(p.city)}</span>
      <span>/</span>
      <strong>{e(p.name)}</strong>
    </nav>
  );
}

export function StayDraftSwitcher({ stayId, current }: { stayId: string; current: StayDraftId }) {
  return (
    <nav className="detail-shell stay-draft-switcher" aria-label="상세페이지 초안 비교">
      <div className="stay-draft-switcher-copy">
        <strong>상세페이지 초안 비교</strong>
        <span>아고다 원문이 빈약할 때 쓰는 3안입니다. 하나를 고르면 생성 규칙을 스킬로 고정합니다.</span>
      </div>
      <div className="stay-draft-switcher-links">
        {STAY_DRAFTS.map((d) => (
          <a
            key={d.id}
            className={`stay-draft-chip${current === d.id ? ' is-on' : ''}`}
            href={`/stay/${stayId}?draft=${d.id}`}
          >
            {d.label}
            {d.recommended ? <em>추천</em> : null}
            <small>{d.hint}</small>
          </a>
        ))}
      </div>
    </nav>
  );
}

export function StayMapBlock({
  p,
  mapsEmbed,
  mapsPlace,
  maps,
  hasGeo,
}: {
  p: Property;
  mapsEmbed: string;
  mapsPlace: string;
  maps: string;
  hasGeo: boolean;
}) {
  const e = escapeStay;
  return (
    <section className="detail-section">
      <span className="section-kicker">위치</span>
      <h2>어디에 있나요?</h2>
      <p>{e(p.address)}</p>
      <div
        className="stay-google-map"
        id="stayMap"
        data-lat={hasGeo ? String(p.lat) : ''}
        data-lng={hasGeo ? String(p.lng) : ''}
        data-name={String(p.name)}
      >
        <iframe title={`${String(p.name)} 구글 지도`} src={mapsEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <div className="stay-map-actions">
        <button type="button" className="btn btn-map" id="useMyLocation">
          내 위치에서 가는 길
        </button>
        <a className="btn btn-map" id="openStayGoogle" href={mapsPlace} target="_blank" rel="noopener noreferrer">
          구글 지도에서 위치 보기 ↗
        </a>
        <a className="btn btn-map" id="openStayDirections" href={maps} target="_blank" rel="noopener noreferrer">
          구글 지도 도보 길안내 ↗
        </a>
      </div>
      <p className="mini-info" id="stayGeoNote">
        {hasGeo
          ? '아고다 좌표를 구글 지도에 표시합니다. 내 위치를 허용하면 현재 위치에서 이 숙소까지 길을 안내합니다.'
          : '좌표가 없어 주소로 구글 지도를 엽니다.'}
      </p>
    </section>
  );
}

export function StayNearbyBlock({ city, nearby }: { city: string; nearby: Property[] }) {
  const e = escapeStay;
  return (
    <section className="detail-section">
      <span className="section-kicker">주변 숙소</span>
      <h2>{e(city)}의 다른 숙소</h2>
      <div className="nearby-grid">
        {nearby.map((q) => {
          const qLicensed = Boolean(q.photo_url && q.photo_license && q.photo_credit && q.photo_author);
          const qHero = qLicensed ? String(q.photo_url) : String(q.image_url || '/assets/hero.webp');
          return (
            <a className="nearby-card has-photo" href={`/stay/${q.id}`} key={String(q.id)}>
              <img src={qHero} alt="" />
              <span className="nearby-overlay">
                <span className="nearby-locale">
                  {e(q.city)} · {e(q.area)}
                </span>
                <strong>{e(q.name)}</strong>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function StayPoiBlock({ pois }: { pois: StayProfile['pois'] }) {
  if (!pois.length) return null;
  const e = escapeStay;
  return (
    <section className="detail-section stay-poi-section">
      <span className="section-kicker">주변 거점</span>
      <h2>이 숙소에서 가기 쉬운 곳</h2>
      <div className="stay-poi-grid">
        {pois.map((poi) => (
          <article className="stay-poi-card" key={poi.id}>
            <small>
              {e(poi.kind)} · {e(poi.travel)}
            </small>
            <h3>{poi.href ? <a href={poi.href}>{e(poi.name)}</a> : e(poi.name)}</h3>
            <p>{e(poi.why)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StayOriginalOverview({ paragraphs }: { paragraphs: string[] }) {
  if (!paragraphs.length) return null;
  const e = escapeStay;
  return (
    <details className="stay-original">
      <summary>아고다 원문 개요 보기</summary>
      {paragraphs.map((para) => (
        <p key={para.slice(0, 32)}>{e(para)}</p>
      ))}
      <p className="mini-info">아고다 숙소 파일의 한글 개요입니다. 시설 칩은 이 문장에서 추출한 초안입니다.</p>
    </details>
  );
}

export function StaySidebar({
  p,
  profile,
  bookUrl,
  tripUrl,
  hasPartnerBook,
}: {
  p: Property;
  profile: StayProfile;
  bookUrl: string;
  tripUrl: string;
  hasPartnerBook: boolean;
}) {
  const e = escapeStay;
  return (
    <aside className="booking-sidebar">
      {bookUrl ? (
        <div
          id="timeDealRoot"
          className="deal-root"
          data-stay-id={String(p.id)}
          data-stay-name={e(p.name)}
          data-source="stay"
        >
          <article className="deal-ticket" aria-live="polite">
            <img className="deal-mascot" src="/assets/mascot-coupon-goblin.webp" alt="쿠폰도깨비" />
            <div className="deal-ticket-copy">
              <span className="deal-kicker">쿠폰도깨비 · 18시간 타임딜</span>
              <strong>5,000원 리베이트</strong>
              <p>숙소 조회 후 18시간 안에 아고다 결제까지 끝내야 효력이 있습니다.</p>
            </div>
          </article>
          <div className="deal-clock" id="dealClock">
            18:00:00
          </div>
          <button type="button" className="deal-cta" id="dealStartBtn">
            18시간 타임딜 받기
          </button>
          <button type="button" className="deal-book" id="dealBookBtn" hidden>
            지금 아고다에서 결제하기
          </button>
          <p className="deal-status" id="dealStatus">
            아고다 표시 가격은 그대로입니다. 5,000원은 여행갈지도 제휴 마진에서 돌려드립니다.
          </p>
          <details className="deal-terms">
            <summary>타임딜 이용 조항</summary>
            <ol>
              <li>할인 5,000원은 아고다 프로모션 코드가 아닙니다. 아고다 요금은 아고다가 정하고, 여행갈지도가 수수료 마진 안에서 리베이트를 지급합니다.</li>
              <li>이 숙소를 연 시각부터 18시간 이내에 아고다 예약 결제까지 완료해야 쿠폰이 유효합니다.</li>
              <li>18시간은 아고다가 약 24시간 단위로 제휴 추적을 끊는 관행에서 수수료를 지키기 위한 보호 장치입니다.</li>
              <li>예상 결제액 15만 원 미만이면 마진이 5,000원보다 작아 지급되지 않을 수 있습니다.</li>
              <li>시간이 지나면 이 버튼은 꺼지고, 만료된 쿠폰으로는 혜택을 받을 수 없습니다.</li>
            </ol>
          </details>
          <a className="deal-kakao-link" href="/#kakao">
            카카오 채널에서 쿠폰도깨비 메시지 보기
          </a>
        </div>
      ) : null}
      {hasPartnerBook ? (
        <div className="booking-card">
          <span className="card-eyebrow">제휴 최저가 비교</span>
          <h2>이 숙소 예약하기</h2>
          <p className="subtle">
            아고다와 트립닷컴을 각각 새 창에서 열어 실시간 요금을 비교하세요. 여행갈지도는 두 요금을 미리 계산하지 않습니다. 18시간 타임딜 리베이트는 아고다 결제에만 적용됩니다.
          </p>
          {profile.score ? (
            <div className="price-box">
              <small>아고다 후기</small>
              <strong>
                {profile.score.toFixed(1)} {profile.scoreWord}
              </strong>
            </div>
          ) : null}
          <div className="booking-info">
            <div>
              <span>성급</span>
              <strong>{profile.starsLabel}</strong>
            </div>
            <div>
              <span>후기</span>
              <strong>{profile.reviewLabel}</strong>
            </div>
            <div>
              <span>지역</span>
              <strong>{e(profile.neighborhood || p.city)}</strong>
            </div>
          </div>
          <PartnerPriceButtons agodaHref={bookUrl} tripHref={tripUrl} />
          <p className="safe-note">각 제휴사 파트너 링크로 이동합니다. 체크아웃이 완료된 예약에 대해 해당 제휴 수수료가 정산됩니다.</p>
        </div>
      ) : p.source_url ? (
        <div className="booking-card">
          <span className="card-eyebrow">숙소 정보</span>
          <h2>외부에서 확인</h2>
          <a className="btn btn-main" href={String(p.source_url)} target="_blank" rel="nofollow noopener noreferrer">
            외부 숙소 정보 확인 ↗
          </a>
        </div>
      ) : (
        <div className="booking-card">
          <span className="card-eyebrow">예약 안내</span>
          <h2>제휴 예약 준비 중</h2>
          <p className="subtle">이 숙소는 아직 아고다 예약 버튼이 연결되어 있지 않습니다.</p>
        </div>
      )}
      <div className="ad-card">
        <span>위치 확인</span>
        <strong>{e(p.address || p.city)}</strong>
        <p>내 위치를 허용하면 이 숙소까지 구글 지도 길안내를 받을 수 있습니다.</p>
        <a href="#stayMap">지도로 이동</a>
      </div>
    </aside>
  );
}

export function stayGeo(p: Property) {
  const hasGeo = p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
  const dest = hasGeo ? `${p.lat},${p.lng}` : String(p.address || p.name);
  const maps = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest) + '&travelmode=walking';
  const mapsPlace = hasGeo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.lat},${p.lng}`)}`
    : maps;
  const mapsEmbed = hasGeo
    ? `https://maps.google.com/maps?q=${p.lat},${p.lng}&ll=${p.lat},${p.lng}&z=16&hl=ko&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(String(p.address || p.name))}&hl=ko&z=15&output=embed`;
  const bookUrl = agodaBookUrl(p);
  const tripUrl = tripBookUrl(p);
  return { hasGeo, maps, mapsPlace, mapsEmbed, bookUrl, tripUrl, hasPartnerBook: Boolean(bookUrl || tripUrl) };
}
