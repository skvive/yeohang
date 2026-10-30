import { agodaBookUrl } from '@/lib/agoda';
import { CATEGORY_SLUGS, SITE_URL, type Property } from '@/lib/domain';
import { buildStayProfile } from '@/lib/stay-content';
import { tripBookUrl } from '@/lib/trip';

type Prop = Property;

function e(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function PartnerPriceButtons({
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

export function StayChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/detail.css" />
      <link rel="stylesheet" href="/detail-v2.css" />
      <link rel="stylesheet" href="/deal.css" />
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
            <a href="/places">국내 명소</a>
            <a href="/#shorts">여행 영상</a>
            <a href="/#kakao">톡 쿠폰</a>
            <a href="/#weekly">이번 주 혜택</a>
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
            <a href="/#kakao">카카오 타임딜</a>
            <a href="/#weekly">이번 주 혜택</a>
            <a href="/#events">숙박 행사</a>
            <a href="/#privacy">개인정보 안내</a>
          </div>
        </div>
        <div className="detail-shell footer-legal">
          © 2026 여행갈지도 · 숙박 정보 검증 및 이미지 권리 안내 · 실제 요금·예약 가능 여부는 숙소에 재확인해 주세요.
        </div>
      </footer>
      <script defer src="/geo.js" />
      <script defer src="/detail.js" />
      <script defer src="/deal.js" />
    </>
  );
}

export function PropertyBody({ p, nearby }: { p: Prop; nearby: Prop[] }) {
  const profile = buildStayProfile(p);
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
  const bookUrl = agodaBookUrl(p);
  const tripUrl = tripBookUrl(p);
  const hasPartnerBook = Boolean(bookUrl || tripUrl);
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
            {profile.starsMarks ? <span className="stay-stars">{profile.starsMarks}</span> : null}
          </div>
          <h1>{e(p.name)}</h1>
          <p className="location-line">
            ⌖ {e(profile.neighborhood || p.city)} · {e(p.address)}
          </p>
          {profile.score ? (
            <div className="stay-score">
              <b>{profile.score.toFixed(1)}</b>
              <span>
                <strong>
                  {profile.scoreWord} · {profile.starsLabel}
                </strong>
                아고다 {profile.reviewLabel}
              </span>
            </div>
          ) : null}
          <div className="headline-badges">
            <span className="status-badge">
              {p.source === 'agoda' ? '아고다 제휴 숙소' : p.public_record ? '공개 숙소 정보 · 공식 제휴 미확인' : '시연 전용 데이터'}
            </span>
            <span className="quiet-badge">{p.source === 'agoda' ? '요금은 아고다·트립닷컴에서 비교' : '예약 가능 여부 미확인'}</span>
          </div>
        </div>
        {hasPartnerBook ? (
          <div className="headline-actions">
            <PartnerPriceButtons agodaHref={bookUrl} tripHref={tripUrl} />
          </div>
        ) : null}
      </section>
      <section className="gallery">
        <div className="gallery-cover">
          <img src={hero} alt={`${String(p.name)} 대표 이미지`} />
          <span className="image-badge">{licensed ? '실제 사진 · 라이선스 확인' : '인공지능 콘셉트 이미지 · 실제 숙소 사진 아님'}</span>
        </div>
        <div className="gallery-side">
          <div className="gallery-tile gallery-tile-dark">
            <span className="tile-overline">아고다 후기</span>
            <strong>{e(profile.galleryScoreTitle)}</strong>
            <span>{e(profile.galleryScoreBody)}</span>
          </div>
          <div className="gallery-tile gallery-tile-soft">
            <span className="tile-symbol">⌖</span>
            <strong>{e(profile.galleryMetaTitle)}</strong>
            <span>{e(profile.galleryMetaBody)}</span>
          </div>
        </div>
      </section>
      <p className="photo-credit">
        {licensed ? `실제 숙소 사진 · 저작자: ${e(p.photo_author)} · ${e(p.photo_license)}` : '인공지능 생성 콘셉트 · 실제 숙소 사진이 아닙니다.'}
      </p>
      <div className="trust-strip">
        {profile.trust.map((item) => (
          <div key={item.title}>
            <span className="trust-icon">{item.icon}</span>
            <div>
              <strong>{e(item.title)}</strong>
              <small>{e(item.sub)}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section intro-section">
            <span className="section-kicker">숙소 소개</span>
            <h2>이 숙소를 알아보세요</h2>
            <p className="intro-lead">{e(profile.lead)}</p>
            {profile.paragraphs.map((para) => (
              <p className="readable" key={para.slice(0, 24)}>
                {e(para)}
              </p>
            ))}
            {profile.fits.length ? (
              <div className="stay-fits">
                {profile.fits.map((fit) => (
                  <span className="stay-fit" key={fit}>
                    {e(fit)}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
          <section className="detail-section">
            <span className="section-kicker">한눈에 보기</span>
            <h2>이 숙소의 핵심</h2>
            <div className="stories">
              {profile.highlights.map((h) => (
                <article className="story-panel" key={h.title}>
                  <div className="story-icon">{h.icon}</div>
                  <h3>{e(h.title)}</h3>
                  <p>{e(h.body)}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <span className="section-kicker">시설</span>
            <h2>확인된 시설</h2>
            {profile.amenities.length ? (
              <div className="amenities">
                {profile.amenities.map((a) => (
                  <span className="amenity" key={a}>
                    <span className="amenity-star">✦</span>
                    {e(a)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">아고다 숙소 파일에는 유형만 들어 있습니다. 상세 시설은 예약 페이지에서 확인할 수 있습니다.</p>
            )}
            <div className="facts-grid">
              {profile.facts.map((fact) => (
                <div key={fact.label}>
                  <small>{e(fact.label)}</small>
                  <strong>{e(fact.value)}</strong>
                </div>
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
          </section>
          <section className="detail-section">
            <span className="section-kicker">안내</span>
            <h2>자주 묻는 질문</h2>
            <div className="faq-list">
              {profile.faqs.map((faq) => (
                <details key={faq.q}>
                  <summary>{e(faq.q)}</summary>
                  <p>{e(faq.a)}</p>
                </details>
              ))}
            </div>
            <div className="info-alert">
              <strong>정보 확인 안내</strong>
              <p>
                {p.source === 'agoda'
                  ? '소개 문구는 아고다 숙소 파일의 한글 개요를 문단·시설 칩으로 재구성한 초안입니다. 실시간 요금·객실 재고는 아고다에서 확인하고, 체크아웃 완료 건에 대해 제휴 수수료가 정산됩니다.'
                  : '실시간 요금·객실 재고는 연동되지 않았습니다. 최종 결정 전에 숙소 측에서 확인하세요.'}
              </p>
            </div>
          </section>
          <section className="detail-section">
            <span className="section-kicker">주변 숙소</span>
            <h2>{e(p.city)}의 다른 숙소</h2>
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
          <div className="source-card">
            <span className="source-icon">i</span>
            <div>
              <strong>자료 출처</strong>
              <p>
                숙소명·주소·성급·후기·소개 문구는 아고다 제휴 숙소 파일을 사용합니다. 시설 칩은 소개 문장에서 추출한 초안이며, 공식 시설 피드 연동 전입니다.
              </p>
            </div>
          </div>
        </div>
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
              <div className="deal-clock" id="dealClock">18:00:00</div>
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
              <p className="subtle">아고다와 트립닷컴을 각각 새 창에서 열어 실시간 요금을 비교하세요. 여행갈지도는 두 요금을 미리 계산하지 않습니다. 18시간 타임딜 리베이트는 아고다 결제에만 적용됩니다.</p>
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
      </div>
      {hasPartnerBook ? (
        <div className="mobile-booking-bar">
          <div>
            <small>{profile.score ? `아고다 ${profile.score.toFixed(1)} · ${profile.reviewLabel}` : '제휴 최저가 비교'}</small>
            <strong>{e(p.name)}</strong>
          </div>
          <PartnerPriceButtons agodaHref={bookUrl} tripHref={tripUrl} compact />
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
              {agodaBookUrl(p) || tripBookUrl(p) ? (
                <p className="stay-book-inline">
                  <PartnerPriceButtons agodaHref={agodaBookUrl(p)} tripHref={tripBookUrl(p)} compact />
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
