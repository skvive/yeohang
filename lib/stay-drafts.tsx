import type { Property } from '@/lib/domain';
import type { StayProfile } from '@/lib/stay-content';
import {
  PartnerPriceButtons,
  StayCrumbs,
  StayMapBlock,
  StayNearbyBlock,
  StayOriginalOverview,
  StayPoiBlock,
  StaySidebar,
  escapeStay as e,
} from '@/lib/stay-parts';

type BodyProps = {
  p: Property;
  nearby: Property[];
  profile: StayProfile;
  hero: string;
  licensed: boolean;
  hasGeo: boolean;
  maps: string;
  mapsPlace: string;
  mapsEmbed: string;
  bookUrl: string;
  tripUrl: string;
  hasPartnerBook: boolean;
};

function Headline({
  p,
  profile,
  bookUrl,
  tripUrl,
  hasPartnerBook,
  kicker,
}: {
  p: Property;
  profile: StayProfile;
  bookUrl: string;
  tripUrl: string;
  hasPartnerBook: boolean;
  kicker?: string;
}) {
  return (
    <section className="headline">
      <div className="headline-left">
        <div className="kicker">
          <span className="kicker-icon">✦</span> {kicker || `숙소 안내 / ${e(p.category)}`}
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
  );
}

function Trust({ profile }: { profile: StayProfile }) {
  return (
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
  );
}

function Faq({ p, profile }: { p: Property; profile: StayProfile }) {
  return (
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
            ? '위치·후기·성급은 아고다 숙소 파일, 주변 거점은 좌표 거리로 계산합니다. 실시간 요금·객실 재고는 아고다에서 확인하고, 체크아웃 완료 건에 대해 제휴 수수료가 정산됩니다.'
            : '실시간 요금·객실 재고는 연동되지 않았습니다. 최종 결정 전에 숙소 측에서 확인하세요.'}
        </p>
      </div>
    </section>
  );
}

function SourceNote() {
  return (
    <div className="source-card">
      <span className="source-icon">i</span>
      <div>
        <strong>자료 출처</strong>
        <p>
          숙소명·주소·성급·후기는 아고다 제휴 숙소 파일입니다. 소개 문단은 아고다 개요가 빈약하거나 템플릿일 때 위치·후기·주변 거점으로 다시 씁니다. 시설 칩은 소개 문장에서 추출한 초안이며, 공식 시설 피드 연동 전입니다.
        </p>
      </div>
    </div>
  );
}

function MobileBar({ p, profile, bookUrl, tripUrl, hasPartnerBook }: Pick<BodyProps, 'p' | 'profile' | 'bookUrl' | 'tripUrl' | 'hasPartnerBook'>) {
  if (!hasPartnerBook) return null;
  return (
    <div className="mobile-booking-bar">
      <div>
        <small>{profile.score ? `아고다 ${profile.score.toFixed(1)} · ${profile.reviewLabel}` : '제휴 최저가 비교'}</small>
        <strong>{e(p.name)}</strong>
      </div>
      <PartnerPriceButtons agodaHref={bookUrl} tripHref={tripUrl} compact />
    </div>
  );
}

export function StayDraftA(props: BodyProps) {
  const { p, nearby, profile, hero, licensed, hasGeo, maps, mapsPlace, mapsEmbed, bookUrl, tripUrl, hasPartnerBook } = props;
  return (
    <main id="content" className="detail-shell stay-draft stay-draft-a">
      <StayCrumbs p={p} />
      <Headline p={p} profile={profile} bookUrl={bookUrl} tripUrl={tripUrl} hasPartnerBook={hasPartnerBook} kicker={`${e(profile.neighborhood)} 가이드북`} />
      <section className="gallery stay-guide-hero">
        <div className="gallery-cover">
          <img src={hero} alt={`${String(p.name)} 대표 이미지`} />
          <span className="image-badge">{licensed ? '실제 사진 · 라이선스 확인' : '인공지능 콘셉트 이미지 · 실제 숙소 사진 아님'}</span>
        </div>
        <div className="stay-story-card">
          <span className="section-kicker">한 줄 요약</span>
          <h2>왜 여기에 머무나요</h2>
          {profile.story.map((para) => (
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
        </div>
      </section>
      <p className="photo-credit">
        {licensed ? `실제 숙소 사진 · 저작자: ${e(p.photo_author)} · ${e(p.photo_license)}` : '인공지능 생성 콘셉트 · 실제 숙소 사진이 아닙니다.'}
      </p>
      <Trust profile={profile} />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section">
            <span className="section-kicker">하루 쓰기</span>
            <h2>{e(profile.neighborhood)}에서 이 숙소를 거점으로</h2>
            <ol className="stay-itinerary">
              {profile.itinerary.map((item) => (
                <li key={item.time}>
                  <span>{e(item.time)}</span>
                  <div>
                    <strong>{e(item.title)}</strong>
                    <p>{e(item.body)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="stay-transit">
              {profile.transit.map((item) => (
                <div key={item.label}>
                  <small>{e(item.label)}</small>
                  <strong>{e(item.body)}</strong>
                </div>
              ))}
            </div>
          </section>
          <StayPoiBlock pois={profile.pois} />
          <section className="detail-section">
            <span className="section-kicker">시설</span>
            <h2>확인된 시설</h2>
            {profile.amenityItems.length ? (
              <div className="stay-amenity-grid">
                {profile.amenityItems.map((a) => (
                  <span className="stay-amenity-cell" key={a.label}>
                    <i aria-hidden="true">{a.icon}</i>
                    {e(a.label)}
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
            <StayOriginalOverview paragraphs={profile.originalOverview} />
          </section>
          <StayMapBlock p={p} mapsEmbed={mapsEmbed} mapsPlace={mapsPlace} maps={maps} hasGeo={hasGeo} />
          <Faq p={p} profile={profile} />
          <StayNearbyBlock city={p.city} nearby={nearby} />
          <SourceNote />
        </div>
        <StaySidebar p={p} profile={profile} bookUrl={bookUrl} tripUrl={tripUrl} hasPartnerBook={hasPartnerBook} />
      </div>
      <MobileBar p={p} profile={profile} bookUrl={bookUrl} tripUrl={tripUrl} hasPartnerBook={hasPartnerBook} />
    </main>
  );
}

export function StayDraftB(props: BodyProps) {
  const { p, nearby, profile, hero, licensed, hasGeo, maps, mapsPlace, mapsEmbed, bookUrl, tripUrl, hasPartnerBook } = props;
  return (
    <main id="content" className="detail-shell stay-draft stay-draft-b">
      <StayCrumbs p={p} />
      <Headline p={p} profile={profile} bookUrl={bookUrl} tripUrl={tripUrl} hasPartnerBook={hasPartnerBook} kicker="한눈에 비교" />
      <section className="stay-product-mosaic">
        <div className="gallery-cover">
          <img src={hero} alt={`${String(p.name)} 대표 이미지`} />
          <span className="image-badge">{licensed ? '실제 사진 · 라이선스 확인' : '콘셉트 이미지'}</span>
        </div>
        <div className="stay-product-score">
          <small>아고다 후기</small>
          <strong>{profile.score ? profile.score.toFixed(1) : '—'}</strong>
          <span>
            {profile.scoreWord || '집계 전'} · {profile.reviewLabel}
          </span>
        </div>
        <div className="stay-product-meta">
          <small>숙소 유형</small>
          <strong>{profile.starsLabel}</strong>
          <span>
            {e(profile.neighborhood)} · {e(p.category)}
          </span>
        </div>
        <div className="stay-product-cta">
          <small>지금 비교</small>
          <PartnerPriceButtons agodaHref={bookUrl} tripHref={tripUrl} />
          <span>요금은 제휴사 페이지에서 확인합니다.</span>
        </div>
      </section>
      <p className="photo-credit">
        {licensed ? `실제 숙소 사진 · 저작자: ${e(p.photo_author)} · ${e(p.photo_license)}` : '인공지능 생성 콘셉트 · 실제 숙소 사진이 아닙니다.'}
      </p>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section">
            <span className="section-kicker">시설</span>
            <h2>스캔해서 고르기</h2>
            {profile.amenityItems.length ? (
              <div className="stay-amenity-grid stay-amenity-grid-dense">
                {profile.amenityItems.map((a) => (
                  <span className="stay-amenity-cell" key={a.label}>
                    <i aria-hidden="true">{a.icon}</i>
                    {e(a.label)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">시설 목록은 아고다 예약 페이지에서 확인하세요. 숙소 파일에는 유형만 있습니다.</p>
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
            <span className="section-kicker">짧은 안내</span>
            <h2>이 숙소</h2>
            {profile.story.slice(0, 2).map((para) => (
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
            <StayOriginalOverview paragraphs={profile.originalOverview} />
          </section>
          <StayPoiBlock pois={profile.pois.slice(0, 4)} />
          <StayMapBlock p={p} mapsEmbed={mapsEmbed} mapsPlace={mapsPlace} maps={maps} hasGeo={hasGeo} />
          <Faq p={p} profile={profile} />
          <StayNearbyBlock city={p.city} nearby={nearby} />
          <SourceNote />
        </div>
        <StaySidebar p={p} profile={profile} bookUrl={bookUrl} tripUrl={tripUrl} hasPartnerBook={hasPartnerBook} />
      </div>
      <MobileBar p={p} profile={profile} bookUrl={bookUrl} tripUrl={tripUrl} hasPartnerBook={hasPartnerBook} />
    </main>
  );
}

export function StayDraftC(props: BodyProps) {
  const { p, nearby, profile, hero, licensed, hasGeo, maps, mapsPlace, mapsEmbed, bookUrl, tripUrl, hasPartnerBook } = props;
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${profile.neighborhood || p.city} 여행 브이로그`)}`;
  return (
    <main id="content" className="detail-shell stay-draft stay-draft-c">
      <StayCrumbs p={p} />
      <section className="stay-hood-hero">
        <div>
          <span className="section-kicker">{e(p.city)} 하루</span>
          <h1>
            {e(profile.neighborhood || p.city)}에서
            <br />
            머무는 거점
          </h1>
          <p>
            {e(p.name)} · {profile.starsLabel} · 아고다 {profile.score ? `${profile.score.toFixed(1)}점` : '후기 집계 전'}
          </p>
          {hasPartnerBook ? <PartnerPriceButtons agodaHref={bookUrl} tripHref={tripUrl} /> : null}
        </div>
        <div className="stay-hood-photo">
          <img src={hero} alt={`${String(p.name)} 대표 이미지`} />
          <span>{licensed ? '실제 숙소 사진' : '콘셉트 이미지'}</span>
        </div>
      </section>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section stay-hood-staycard">
            <span className="section-kicker">거점 숙소</span>
            <h2>{e(p.name)}</h2>
            {profile.story.map((para) => (
              <p className="readable" key={para.slice(0, 24)}>
                {e(para)}
              </p>
            ))}
          </section>
          <section className="detail-section">
            <span className="section-kicker">동선</span>
            <h2>이 동네를 하루로 쓰는 법</h2>
            <ol className="stay-itinerary stay-itinerary-wide">
              {profile.itinerary.map((item) => (
                <li key={item.time}>
                  <span>{e(item.time)}</span>
                  <div>
                    <strong>{e(item.title)}</strong>
                    <p>{e(item.body)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="stay-transit">
              {profile.transit.map((item) => (
                <div key={item.label}>
                  <small>{e(item.label)}</small>
                  <strong>{e(item.body)}</strong>
                </div>
              ))}
            </div>
            <p className="stay-vlog-link">
              <a href={yt} target="_blank" rel="noopener noreferrer">
                {e(profile.neighborhood || p.city)} 여행 영상 유튜브에서 찾기 ↗
              </a>
              <a href={`/places?city=${encodeURIComponent(p.city)}`}>국내 명소 {e(p.city)} 보기</a>
            </p>
          </section>
          <StayPoiBlock pois={profile.pois} />
          <section className="detail-section">
            <span className="section-kicker">숙소 시설</span>
            <h2>체크인 전에 볼 것</h2>
            {profile.amenityItems.length ? (
              <div className="stay-amenity-grid">
                {profile.amenityItems.map((a) => (
                  <span className="stay-amenity-cell" key={a.label}>
                    <i aria-hidden="true">{a.icon}</i>
                    {e(a.label)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">시설 상세는 아고다에서 확인하세요.</p>
            )}
            <StayOriginalOverview paragraphs={profile.originalOverview} />
          </section>
          <StayMapBlock p={p} mapsEmbed={mapsEmbed} mapsPlace={mapsPlace} maps={maps} hasGeo={hasGeo} />
          <Faq p={p} profile={profile} />
          <StayNearbyBlock city={p.city} nearby={nearby} />
          <SourceNote />
        </div>
        <StaySidebar p={p} profile={profile} bookUrl={bookUrl} tripUrl={tripUrl} hasPartnerBook={hasPartnerBook} />
      </div>
      <MobileBar p={p} profile={profile} bookUrl={bookUrl} tripUrl={tripUrl} hasPartnerBook={hasPartnerBook} />
    </main>
  );
}
