import { StayChrome } from '@/lib/stay';
import { PLACE_CITIES, type PlaceSample } from '@/lib/places-catalog';
import type { CuratedVideo } from '@/lib/youtube-curate';

function e(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type PlaceView = PlaceSample & {
  visitkorea_url?: string;
  youtube_videos_url?: string;
  youtube_shorts_url?: string;
  maps_url?: string;
  image_url?: string;
  source?: string;
  disclosure?: string;
  tel?: string;
  homepage?: string;
};

type StayLite = { id: string; name: string; city: string; category?: string; image_url?: string; photo_url?: string };

export function PlaceChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/places.css" />
      <StayChrome>{children}</StayChrome>
    </>
  );
}

export function PlacesIndexBody({
  city,
  q,
  places,
}: {
  city: string;
  q: string;
  places: PlaceView[];
}) {
  return (
    <main className="detail-shell" id="content">
      <nav className="breadcrumbs">
        <a href="/">여행갈지도</a>
        <span>/</span>
        <strong>국내 명소</strong>
      </nav>
      <div className="directory-hero">
        <span className="section-kicker">한국관광공사 · 유튜브 · 블로거</span>
        <h1>{city ? `${city} 여행 명소` : '국내 명소를 지역으로 찾아보세요'}</h1>
        <p>관광공사 TourAPI 공개 자료와 유튜브 Data API, 구글 블로거 공식 연동만 사용합니다. 사이트 무단 수집은 하지 않습니다.</p>
        <form className="place-search" action="/places" method="get">
          <input type="search" name="q" defaultValue={q} placeholder="명소 이름 · 키워드" maxLength={80} />
          <select name="city" defaultValue={city} aria-label="지역">
            <option value="">전체 지역</option>
            {PLACE_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit">지역 검색</button>
        </form>
      </div>
      <nav className="category-chips" aria-label="지역">
        <a className={`category-chip ${!city ? 'selected' : ''}`} href="/places">
          전체
        </a>
        {PLACE_CITIES.map((c) => (
          <a key={c} className={`category-chip ${city === c ? 'selected' : ''}`} href={`/places?city=${encodeURIComponent(c)}`}>
            {c}
          </a>
        ))}
      </nav>
      <div className="directory-list place-grid">
        {places.length ? (
          places.map((p) => (
            <article className="directory-item" key={p.id}>
              <span className="directory-top">
                {e(p.city)} · {e(p.category)}
              </span>
              <h2>
                <a href={`/place/${encodeURIComponent(p.id)}`}>{e(p.name)} ↗</a>
              </h2>
              <p>{e(p.overview.slice(0, 90))}…</p>
            </article>
          ))
        ) : (
          <div className="directory-item">
            <h2>이 지역 샘플이 아직 없습니다.</h2>
            <p>TourAPI 키를 설정한 뒤 npm run db:import-places 를 실행하세요.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function VideoGrid({ videos, emptyHref, emptyLabel }: { videos: CuratedVideo[]; emptyHref: string; emptyLabel: string }) {
  if (!videos.length) {
    return (
      <p className="mini-info">
        아직 수집된 영상이 없습니다.{' '}
        <a href={emptyHref} target="_blank" rel="noopener noreferrer">
          {emptyLabel} ↗
        </a>
      </p>
    );
  }
  return (
    <div className="place-videos">
      {videos.map((v) => (
        <a
          key={v.id}
          className="place-video"
          href={`https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={v.thumbnail} alt="" />
          <b>{e(v.title)}</b>
          <small>
            {v.kind === 'shorts' ? '쇼츠' : '영상'} · {e(v.channel)}
          </small>
        </a>
      ))}
    </div>
  );
}

export function PlaceBody({
  place,
  stays,
  videos,
  shorts,
  posts,
}: {
  place: PlaceView;
  stays: StayLite[];
  videos: CuratedVideo[];
  shorts: CuratedVideo[];
  posts: Array<{ title: string; url: string }>;
}) {
  const hero = place.image_url || `/assets/listing-${place.image}.webp`;
  const hasGeo = place.lat != null && place.lng != null;
  const embed = hasGeo
    ? `https://maps.google.com/maps?q=${place.lat},${place.lng}&ll=${place.lat},${place.lng}&z=15&hl=ko&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(place.address || place.name)}&hl=ko&z=14&output=embed`;
  return (
    <main className="detail-shell" id="content">
      <nav className="breadcrumbs" aria-label="현재 위치">
        <a href="/">여행갈지도</a>
        <span>/</span>
        <a href="/places">국내 명소</a>
        <span>/</span>
        <a href={`/places?city=${encodeURIComponent(place.city)}`}>{e(place.city)}</a>
        <span>/</span>
        <strong>{e(place.name)}</strong>
      </nav>
      <section className="headline">
        <div className="headline-left">
          <div className="kicker">
            <span className="kicker-icon">✦</span> {e(place.city)} · {e(place.category)}
          </div>
          <h1>{e(place.name)}</h1>
          <p className="location-line">
            ⌖ {e(place.area)} · {e(place.address)}
          </p>
          <div className="headline-badges">
            <span className="status-badge">{place.source === 'tourapi' ? '한국관광공사 TourAPI' : '지역 샘플 페이지'}</span>
            <span className="quiet-badge">영업시간·입장료는 공식 페이지에서 재확인</span>
          </div>
        </div>
        <div className="headline-actions">
          <a className="btn btn-main" href={place.visitkorea_url} target="_blank" rel="noopener noreferrer">
            관광공사에서 보기 ↗
          </a>
        </div>
      </section>
      <section className="gallery">
        <div className="gallery-cover">
          <img src={hero} alt={`${place.name} 안내 이미지`} />
          <span className="image-badge">
            {place.source === 'tourapi' && place.image_url?.startsWith('http')
              ? '한국관광공사 제공 이미지'
              : '분위기 콘셉트 이미지 · 해당 장소 공식 사진 아님'}
          </span>
        </div>
        <div className="gallery-side">
          <div className="gallery-tile gallery-tile-dark">
            <span className="tile-overline">공식 자료</span>
            <strong>VisitKorea 검색</strong>
            <span>한국관광공사 사이트에서 같은 키워드를 엽니다.</span>
          </div>
          <div className="gallery-tile gallery-tile-soft">
            <span className="tile-overline">영상 큐레이션</span>
            <strong>쇼츠 + 브이로그</strong>
            <span>유튜브 Data API로 지역 인기 여행 영상을 붙입니다.</span>
          </div>
        </div>
      </section>
      <section className="detail-section">
        <span className="section-kicker">소개</span>
        <h2>이 장소, 왜 가나요</h2>
        <p className="readable">{e(place.overview)}</p>
        <p className="mini-info">{e(place.disclosure)}</p>
      </section>
      <section className="detail-section">
        <span className="section-kicker">지도</span>
        <h2>찾아가는 길</h2>
        <div className="stay-google-map">
          <iframe title={`${place.name} 구글 지도`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
        <p className="stay-map-actions">
          <a className="btn btn-map" href={place.maps_url} target="_blank" rel="noopener noreferrer">
            구글 지도에서 열기 ↗
          </a>
        </p>
      </section>
      <section className="detail-section">
        <span className="section-kicker">쇼츠</span>
        <h2>짧은 영상으로 먼저 보기</h2>
        <VideoGrid videos={shorts} emptyHref={place.youtube_shorts_url || '#'} emptyLabel="유튜브 쇼츠 검색" />
      </section>
      <section className="detail-section">
        <span className="section-kicker">브이로그</span>
        <h2>인기 여행 유튜버 · 지역 영상</h2>
        <VideoGrid videos={videos} emptyHref={place.youtube_videos_url || '#'} emptyLabel="유튜브 브이로그 검색" />
      </section>
      <section className="detail-section">
        <span className="section-kicker">구글 블로그</span>
        <h2>이 지역 이야기</h2>
        {posts.length ? (
          <ul className="place-posts">
            {posts.map((p) => (
              <li key={p.url}>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  {e(p.title)} ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mini-info">연결된 공개 블로거 글이 없습니다. 숙소 파트너가 블로그 ID를 연결하거나, 공식 Blogger API로 공개 글을 가져오면 여기에 표시됩니다.</p>
        )}
      </section>
      <section className="detail-section">
        <span className="section-kicker">근처 숙소</span>
        <h2>{e(place.city)}에서 머물 곳</h2>
        <div className="directory-list">
          {stays.length ? (
            stays.map((s) => (
              <article className="directory-item" key={s.id}>
                <span className="directory-top">{e(s.category || '숙소')}</span>
                <h2>
                  <a href={`/stay/${encodeURIComponent(s.id)}`}>{e(s.name)} ↗</a>
                </h2>
              </article>
            ))
          ) : (
            <p className="mini-info">이 지역 숙소 목록은 아고다 제휴 자료에서 이어집니다.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export { StayChrome };
