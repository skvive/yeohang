import { agodaBookUrl } from '@/lib/agoda';
import { CATEGORY_SLUGS, SITE_URL, type Property } from '@/lib/domain';

type Prop = Property;

function e(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function AgodaBookButton({ href, className, label }: { href: string; className?: string; label?: string }) {
  return (
    <a
      className={className || 'btn btn-main js-agoda-book'}
      href={href}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      data-agoda-book="1"
    >
      {label || '아고다에서 예약하기'}
    </a>
  );
}

export function StayChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/detail.css" />
      <link rel="stylesheet" href="/detail-v2.css" />
      <a className="skip-link" href="#content">
        본문으로 바로가기
      </a>
      <header className="detail-header">
        <div className="detail-shell header-inner">
          <a className="detail-brand detail-brand-v2" href="/#home">
            <img src="/assets/wordmark.svg" alt="여행갈지도" />
          </a>
          <nav className="top-links" aria-label="상단 메뉴">
            <a href="/#discover">숙소 찾기</a>
            <a href="/#images">숙소 사진</a>
            <a href="/#journal">여행 저널</a>
            <a href="/#events">숙박 혜택</a>
            <a href="/#map">지역 지도</a>
          </nav>
          <a className="header-cta" href="/#discover">
            숙소 더 찾기 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      {children}
      <footer className="detail-footer">
        <div className="detail-shell footer-layout">
          <div>
            <a className="footer-brand footer-brand-v2" href="/">
              <img src="/assets/wordmark.svg" alt="여행갈지도" />
            </a>
            <p>더 정확한 숙소 정보, 더 편리한 여행의 시작.</p>
          </div>
          <div>
            <a href="/#discover">숙소 탐색</a>
            <a href="/#journal">여행 저널</a>
            <a href="/#events">숙박 행사</a>
            <a href="/#merchant">숙소 파트너</a>
            <a href="/#privacy">개인정보 안내</a>
          </div>
        </div>
        <div className="detail-shell footer-legal">
          © 2026 여행갈지도 · 숙박 정보 검증 및 이미지 권리 안내 · 실제 요금·예약 가능 여부는 숙소에 재확인해 주세요.
        </div>
      </footer>
      <script defer src="/geo.js" />
      <script defer src="/detail.js" />
    </>
  );
}

export function PropertyBody({ p, nearby }: { p: Prop; nearby: Prop[] }) {
  const licensed = Boolean(p.photo_url && p.photo_license && p.photo_credit && p.photo_author);
  const hero = licensed ? String(p.photo_url) : String(p.image_url || '/assets/hero.webp');
  const hasGeo = p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
  const dest = hasGeo ? `${p.lat},${p.lng}` : String(p.address || p.name);
  const maps = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest) + '&travelmode=walking';
  const mapsPlace = hasGeo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.lat},${p.lng}`)}`
    : maps;
  const mapsEmbed = hasGeo
    ? `https://maps.google.com/maps?q=${p.lat},${p.lng}&ll=${p.lat},${p.lng}&z=16&hl=ko&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(String(p.address || p.name))}&hl=ko&z=15&output=embed`;
  const amenities = ((p.amenities as string[]) || []).slice(0, 12);
  const bookUrl = agodaBookUrl(p);
  return (
    <main id="content" className="detail-shell">
      <nav className="breadcrumbs" aria-label="현재 위치">
        <a href="/">여행갈지도 (가칭)</a>
        <span>/</span>
        <a href="/#discover">국내 숙소</a>
        <span>/</span>
        <span>{e(p.city)}</span>
        <span>/</span>
        <strong>{e(p.name)}</strong>
      </nav>
      <section className="headline">
        <div className="headline-left">
          <div className="kicker">
            <span className="kicker-icon">✦</span> 숙소 안내 / {e(p.category)}
          </div>
          <h1>{e(p.name)}</h1>
          <p className="location-line">
            ⌖ {e(p.city)} · {e(p.area)} · {e(p.address)}
          </p>
          <div className="headline-badges">
            <span className="status-badge">
              {p.source === 'agoda' ? '아고다 제휴 숙소' : p.public_record ? '공개 숙소 정보 · 공식 제휴 미확인' : '시연 전용 데이터'}
            </span>
            <span className="quiet-badge">{p.source === 'agoda' ? '예약·결제는 아고다에서 진행' : '예약 가능 여부 미확인'}</span>
          </div>
        </div>
        {bookUrl ? (
          <div className="headline-actions">
            <AgodaBookButton href={bookUrl} />
          </div>
        ) : null}
      </section>
      <section className="gallery">
        <div className="gallery-cover">
          <img src={hero} alt={`${String(p.name)} 대표 이미지`} />
          <span className="image-badge">{licensed ? '실제 사진 · 라이선스 확인' : '인공지능 콘셉트 이미지 · 실제 숙소 사진 아님'}</span>
        </div>
      </section>
      <p className="photo-credit">
        {licensed ? `실제 숙소 사진 · 저작자: ${e(p.photo_author)} · ${e(p.photo_license)}` : '인공지능 생성 콘셉트 · 실제 숙소 사진이 아닙니다.'}
      </p>
      <section className="detail-section intro-section">
        <span className="section-kicker">숙소 소개</span>
        <h2>이 숙소를 알아보세요</h2>
        <p className="intro-lead">{e(p.tagline)}</p>
        <p className="readable">{e(p.description)}</p>
        <div className="info-alert">
          <strong>정보 확인 안내</strong>
          <p>
            {p.source === 'agoda'
              ? '실시간 요금·객실 재고는 아고다에서 확인하고, 체크아웃 완료 건에 대해 제휴 수수료가 정산됩니다.'
              : '실시간 요금·객실 재고는 연동되지 않았습니다. 최종 결정 전에 숙소 측에서 확인하세요.'}
          </p>
        </div>
        {bookUrl ? (
          <div className="stay-book-panel">
            <div className="booking-card">
              <span className="card-eyebrow">아고다 제휴 예약</span>
              <h2>이 숙소 예약하기</h2>
              <p className="subtle">요금·객실 재고 확인과 결제는 아고다 새 창에서 진행됩니다. 여행갈지도 화면은 그대로 남아 있습니다.</p>
              <AgodaBookButton href={bookUrl} />
              <p className="safe-note">아고다 파트너 링크로 이동합니다. 체크아웃이 완료된 예약에 대해 제휴 수수료가 정산됩니다.</p>
            </div>
          </div>
        ) : null}
      </section>
      <section className="detail-section">
        <span className="section-kicker">시설</span>
        <h2>시설과 숙박 유형</h2>
        <div className="amenities">
          {(amenities.length ? amenities : ['추가 시설 정보 확인 필요']).map((a) => (
            <span className="amenity" key={a}>
              <span className="amenity-star">✦</span>
              {e(a)}
            </span>
          ))}
        </div>
      </section>
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
          {hasGeo ? '아고다 좌표를 구글 지도에 표시합니다. 내 위치를 허용하면 현재 위치에서 이 숙소까지 길을 안내합니다.' : '좌표가 없어 주소로 구글 지도를 엽니다.'}
        </p>
        {bookUrl ? (
          <p className="stay-book-inline">
            <AgodaBookButton href={bookUrl} className="btn btn-main js-agoda-book" />
          </p>
        ) : p.source_url ? (
          <p>
            <a href={String(p.source_url)} target="_blank" rel="nofollow noopener noreferrer">
              외부 숙소 정보 확인 ↗
            </a>
          </p>
        ) : null}
      </section>
      <section className="detail-section">
        <span className="section-kicker">주변 숙소</span>
        <h2>{e(p.city)}의 다른 숙소</h2>
        <div className="nearby-grid">
          {nearby.map((q) => (
            <a className="nearby-card" href={`/stay/${q.id}`} key={String(q.id)}>
              <span className="nearby-locale">
                {e(q.city)} · {e(q.area)}
              </span>
              <strong>{e(q.name)}</strong>
            </a>
          ))}
        </div>
      </section>
      {bookUrl ? (
        <div className="mobile-booking-bar">
          <div>
            <small>아고다에서 예약</small>
            <strong>{e(p.name)}</strong>
          </div>
          <AgodaBookButton href={bookUrl} label="아고다 예약" />
        </div>
      ) : null}
    </main>
  );
}

export function CategoryBody({ slug, rows }: { slug: string; rows: Prop[] }) {
  const cat = CATEGORY_SLUGS[slug];
  return (
    <main className="detail-shell" id="content">
      <nav className="breadcrumbs">
        <a href="/">여행갈지도 (가칭)</a>
        <span>/</span>
        <a href="/#discover">숙소 탐색</a>
        <span>/</span>
        <strong>{cat}</strong>
      </nav>
      <div className="directory-hero">
        <span className="section-kicker">국내 숙소 목록</span>
        <h1>대한민국 {cat} 찾기</h1>
      </div>
      <nav className="category-chips" aria-label="숙박 유형별 보기">
        {Object.entries(CATEGORY_SLUGS).map(([key, label]) => (
          <a className={`category-chip ${key === slug ? 'selected' : ''}`} href={`/korea/${key}`} key={key}>
            {label}
          </a>
        ))}
      </nav>
      <div className="directory-list">
        {rows.length ? (
          rows.map((p) => (
            <article className="directory-item" key={String(p.id)}>
              <span className="directory-top">
                {e(p.city)} · {e(p.area)}
              </span>
              <h2>
                <a href={`/stay/${p.id}`}>
                  {e(p.name)} ↗
                </a>
              </h2>
              <p>주소: {e(p.address)}</p>
              {agodaBookUrl(p) ? (
                <p className="stay-book-inline">
                  <AgodaBookButton href={agodaBookUrl(p)} label="아고다에서 예약하기" />
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="directory-item">
            <h2>등록된 숙소가 없습니다.</h2>
          </div>
        )}
      </div>
    </main>
  );
}

export { SITE_URL };
