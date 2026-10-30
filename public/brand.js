/* 여행갈지도(가칭) brand navigation & verified Maps URL handoff.
 * No AR camera access or automatic business-funded coupon claims.
 */
(()=>{
 const qs=s=>document.querySelector(s);
 const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const places=[
  {city:'서울',title:'경복궁과 서촌 산책',addr:'서울특별시 종로구 사직로 161 경복궁',story:'궁궐에서 골목까지, 느리게 걷는 서울',tag:'도심·전통',pic:'listing-1.webp'},
  {city:'전주',title:'전주한옥마을 골목 여행',addr:'전북특별자치도 전주시 완산구 기린대로 99',story:'한옥 처마를 따라 만나는 하루',tag:'한옥·미식',pic:'listing-3.webp'},
  {city:'부산',title:'광안리 바다 산책',addr:'부산광역시 수영구 광안해변로 219',story:'광안대교가 반짝이는 해변의 저녁',tag:'해안·야경',pic:'listing-5.webp'},
  {city:'제주',title:'성산일출봉 새벽 여행',addr:'제주특별자치도 서귀포시 성산읍 일출로 284-12',story:'한라의 바람과 바다를 만나는 길',tag:'자연·탐방',pic:'listing-6.webp'},
  {city:'강릉',title:'경포 해변 아침 코스',addr:'강원특별자치도 강릉시 창해로 514',story:'동해의 아침을 담는 휴식',tag:'바다·카페',pic:'listing-4.webp'},
  {city:'경주',title:'대릉원·황리단길',addr:'경상북도 경주시 황남동 31-1 대릉원',story:'천년의 흔적 옆에서 보내는 하루',tag:'역사·골목',pic:'listing-7.webp'}
 ];
 function mapsLink(addr,travelmode='walking'){
   const p=new URLSearchParams({api:'1',destination:addr,travelmode,dir_action:'navigate'});
   return 'https://www.google.com/maps/dir/?'+p.toString();
 }
 function youtubeSearch(title){return 'https://www.youtube.com/results?'+new URLSearchParams({search_query:`${title} 여행 브이로그`}).toString()}
 function weeksWidget(w){
  const benefits=w?.actual_discount_available?'제휴 승인 혜택이 있습니다. 쿠폰 상세 조건을 확인하세요.':'체험용 주간 혜택입니다 · 실제 무료 숙박권이 아닙니다.';
  return `<div class="wrap"><div class="weekly-strip-inner"><img src="/assets/mascot-coupon-goblin.webp" alt="쿠폰도깨비 캐릭터"><div class="weekly-strip-copy"><span class="eyebrow">매주 월요일 · WEEKLY DROP</span><h2>쿠폰도깨비가 찾아왔어요!</h2><p>이번 주 테마 <strong>${h(w?.iso_week||'주간 업데이트 준비')}</strong> · ${h(benefits)}</p><small>유효기간: ${h(w?.starts_on||'')} ~ ${h(w?.ends_on||'')} · 다음 갱신 ${h(w?.next_refresh||'')}</small></div><a class="weekly-cta" href="#weekly">캐릭터와 이번 주 여행 ↗</a></div></div>`;
 }
 let lastWeek='',loading=false;
 async function load(){
  const strip=qs('#brandWeeklyStrip'),stat=qs('#weeklyStatus'),trips=qs('#nearbyTrips');
  if(!strip&&!stat&&!trips)return;
  if(loading)return;loading=true;
  try{
   const r=await fetch('/api/weekly',{credentials:'same-origin',headers:{Accept:'application/json'}});
   if(!r.ok)throw new Error('이번 주 안내를 불러올 수 없습니다.');
   const data=await r.json();const w=data.weekly||{};
   if(strip)strip.innerHTML=weeksWidget(w);
   if(stat)stat.innerHTML=`<div class="weekly-status-cast"><img src="/assets/mascot-coupon-goblin.webp" alt=""><div><span class="eyebrow">이번 주 혜택 상태</span><strong>${h(w.iso_week)} · ${w.actual_discount_available?'제휴 승인 혜택':'시연용 혜택'}</strong><p>${h(w.notice)}</p><small>${h(w.starts_on)} ~ ${h(w.ends_on)} · 다음 갱신 ${h(w.next_refresh)}</small></div><a href="#events">쿠폰 이용 조건 확인 ↗</a></div>`;
   const board=qs('#weeklyDropBoard');
   if(board) board.innerHTML=`<ul><li><span>ISO 주</span><strong>${h(w.iso_week||'-')}</strong></li><li><span>기간</span><strong>${h(w.starts_on)} ~ ${h(w.ends_on)}</strong></li><li><span>실제 할인</span><strong>${w.actual_discount_available?'제휴 '+h(w.approved_partner_campaigns)+'건':'아직 없음 · 시연'}</strong></li><li><span>사회자</span><strong>쿠폰도깨비</strong></li></ul>`;
   window.travelWeeklyBind?.(w.iso_week);
   window.travelWeeklyCountdown?.(w.ends_on);
  }catch(e){if(strip)strip.innerHTML='<div class="wrap weekly-strip-fallback">주간 행사를 확인할 수 없습니다. <a href="#events">기존 행사 보기</a></div>';if(stat)stat.textContent=e.message;}
  finally{loading=false}
  if(trips){trips.innerHTML=places.map((p)=>{
    const host=/서울|전주|경주/.test(p.city)?{name:'지도도령',img:'/assets/mascot-jido.webp'}:/부산|제주|강릉/.test(p.city)?{name:'머무리',img:'/assets/mascot-meomuri.webp'}:{name:'길별이',img:'/assets/mascot-gilbyeoli.webp'};
    return `<article class="trip-card"><div class="trip-thumb"><img loading="lazy" src="/assets/${h(p.pic)}" alt="인공지능 제작 여행 풍경 콘셉트. 실제 장소 사진 아님"><span>인공지능 콘셉트 이미지</span><b class="trip-host"><img src="${host.img}" alt="">${h(host.name)}</b></div><div class="trip-copy"><span class="trip-tag">${h(p.city)} · ${h(p.tag)}</span><h3>${h(p.title)}</h3><p>${h(p.story)}</p><div class="trip-actions"><a href="${h(mapsLink(p.addr))}" target="_blank" rel="noopener noreferrer">구글 길찾기 ↗</a><a href="${h(youtubeSearch(p.title))}" target="_blank" rel="noopener noreferrer">관련 영상 찾기 ↗</a></div></div></article>`;
  }).join('')}
 }
 window.travelWeeklyLoad=load;
 window.travelMapLink=mapsLink;
 document.addEventListener('DOMContentLoaded',()=>setTimeout(load,160));
 window.addEventListener('hashchange',()=>setTimeout(load,50));
})();

(() => {
  const CAST = [
    {
      id: 'goblin',
      name: '쿠폰도깨비',
      role: '월요일 드롭',
      job: '주간 혜택 사회자',
      img: '/assets/mascot-coupon-goblin.webp',
      quote: '월요일마다 보따리를 풀어요. 이번 주도 열어볼까요?',
      href: '#weekly-drop',
      cta: '이번 주 드롭 보기',
    },
    {
      id: 'gilbyeoli',
      name: '길별이',
      role: '길 안내',
      job: '여행지·산책 큐레이터',
      img: '/assets/mascot-gilbyeoli.webp',
      quote: '이번 주 길은 여기예요. 지도만 따라오면 돼요.',
      href: '#weekly-trails',
      cta: '주말 코스 보기',
    },
    {
      id: 'jido',
      name: '지도도령',
      role: '골목 탐험',
      job: '전통·도심 코스 안내',
      img: '/assets/mascot-jido.webp',
      quote: '궁궐에서 골목까지, 천천히 걷지요.',
      href: '#weekly-trails',
      cta: '골목 여행 보기',
    },
    {
      id: 'meomuri',
      name: '머무리',
      role: '머물 곳',
      job: '숙소 큐레이션',
      img: '/assets/mascot-meomuri.webp',
      quote: '발 닿는 곳에 머물 곳을 챙겨둘게요.',
      href: '#weekly-stays',
      cta: '숙소 고르기',
    },
    {
      id: 'on',
      name: '여행온',
      role: '여행 영상',
      job: '브이로그 큐레이션',
      img: '/assets/mascot-yeohaengon.webp',
      quote: '가기 전에 한 편만 보고 가요!',
      href: '#weekly-films',
      cta: '영상 둘러보기',
    },
  ];

  const PLAYBOOK = [
    { day: '월', title: '드롭 오픈', host: '쿠폰도깨비', text: '이번 주 테마와 혜택 상태를 공개합니다.' },
    { day: '화·수', title: '길 공개', host: '길별이', text: '산책 코스와 구글 길찾기를 붙여 줍니다.' },
    { day: '목', title: '골목 탐험', host: '지도도령', text: '한옥·궁궐·골목 루트를 깊게 안내합니다.' },
    { day: '금', title: '머물 곳', host: '머무리', text: '코스 근처 숙소를 아고다 예약으로 연결합니다.' },
    { day: '토·일', title: '영상 한 편', host: '여행온', text: '출발 전 브이로그로 분위기를 맞춥니다.' },
  ];

  const FILMS = [
    { city: '서울', title: '서촌 골목 느린 하루', q: '서촌 경복궁 여행 브이로그' },
    { city: '전주', title: '한옥마을 처마 아래', q: '전주한옥마을 여행 브이로그' },
    { city: '부산', title: '광안리 노을 산책', q: '광안리 여행 브이로그' },
    { city: '제주', title: '성산 새벽 바람', q: '성산일출봉 여행 브이로그' },
  ];

  const THEMES = [
    { title: '한옥 골목 주간', host: '지도도령', line: '처마와 골목을 천천히 걷는 일주일입니다.' },
    { title: '바다 산책 주간', host: '머무리', line: '발만 담가도 여행이 되는 해안 코스입니다.' },
    { title: '도심 느린 여행', host: '길별이', line: '가까운 도시에서 하루를 길게 쓰는 주간입니다.' },
  ];

  function youtubeSearch(title) {
    return 'https://www.youtube.com/results?' + new URLSearchParams({ search_query: title }).toString();
  }
  function themeOfWeek() {
    const week = Math.ceil((((Date.now() / 86400000) + 4) % 21) / 7);
    return THEMES[week % THEMES.length];
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function stampKey(week) {
    return 'yeohang-weekly-stamps:' + (week || 'demo');
  }
  function readStamps(week) {
    try {
      const raw = JSON.parse(sessionStorage.getItem(stampKey(week)) || '[]');
      return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  function writeStamps(week, ids) {
    try {
      sessionStorage.setItem(stampKey(week), JSON.stringify(ids.slice(0, 8)));
    } catch {}
  }
  function renderStamps(week) {
    const board = document.querySelector('#weeklyStampBoard');
    if (!board) return;
    const got = new Set(readStamps(week));
    board.innerHTML = CAST.map((c) => {
      const on = got.has(c.id);
      return `<button type="button" class="weekly-stamp ${on ? 'is-on' : ''}" data-stamp="${c.id}">
      <img src="${c.img}" alt="">
      <strong>${esc(c.name)}</strong>
      <small>${on ? '만남 완료' : '만나기'}</small>
    </button>`;
    }).join('');
  }
  function startCountdown(endsOn) {
    const el = document.querySelector('#weeklyCountdown');
    if (!el) return;
    const end = endsOn ? new Date(endsOn + 'T23:59:59+09:00') : null;
    const tick = () => {
      if (!end || Number.isNaN(end.getTime())) {
        el.textContent = '다음 월요일 0시에 새 드롭';
        return;
      }
      const diff = end.getTime() - Date.now();
      if (diff <= 0) {
        el.textContent = '이번 주 드롭이 곧 갱신됩니다';
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      el.textContent = `이번 주 드롭 마감까지 ${d}일 ${h}시간 · 다음 월요일에 새 테마`;
    };
    tick();
    clearInterval(window.__weeklyCountdown);
    window.__weeklyCountdown = setInterval(tick, 60000);
  }

  function weeklyPageHtml({ sectionTitle, stays = [] }) {
    const theme = themeOfWeek();
    const stayCards = stays.length
      ? stays
          .map(
            (p) => `<a class="weekly-stay-card" href="/stay/${esc(p.id)}">
        <img src="${esc(p.photo_url || p.image_url || '/assets/listing-2.webp')}" alt="">
        <span class="weekly-stay-copy"><small>머무리 추천 · ${esc(p.city || '')}</small><strong>${esc(p.name)}</strong><em>${esc(p.category || p.tagline || '숙소')}</em></span>
      </a>`,
          )
          .join('')
      : `<a class="weekly-stay-card weekly-stay-empty" href="#discover"><span class="weekly-stay-copy"><small>머무리</small><strong>머물 곳을 찾으러 가요</strong><em>숙소 탐색에서 지역을 고르면 근처 숙소가 열립니다.</em></span></a>`;

    return `<section class="weekly-hero weekly-hero-cast">
    <div class="wrap weekly-hero-layout">
      <div>
        <span class="eyebrow">주간 여행 클럽 · 캐릭터 드롭</span>
        <p class="weekly-live-pill"><span></span>매주 월요일 0시 · 캐릭터가 테마를 바꿉니다</p>
        <h1>이번 주,<br><em>어디로 갈지도?</em></h1>
        <blockquote class="weekly-speech">
          <p>“${esc(CAST[0].quote)}”</p>
          <cite>쿠폰도깨비 · ${esc(theme.title)}</cite>
        </blockquote>
        <p class="weekly-lead">${esc(theme.line)} 캐릭터 다섯이 길·혜택·숙소·영상을 나눠 맡습니다. 실제 할인권은 제휴 승인 후에만 열립니다.</p>
        <div class="weekly-actions">
          <a class="filled-btn" href="#weekly-drop">이번 주 드롭 보기 ↗</a>
          <a class="outline-btn" href="#weekly-cast">캐릭터와 여행하기</a>
        </div>
        <div class="weekly-countdown" id="weeklyCountdown" aria-live="polite">다음 드롭까지 계산 중</div>
      </div>
      <div class="weekly-hero-stage">
        <img src="/assets/mascot-coupon-goblin.webp" alt="할인 쿠폰을 들고 있는 쿠폰도깨비">
        <div class="weekly-hero-crew" aria-hidden="true">
          ${CAST.slice(1).map((c) => `<img src="${c.img}" alt="">`).join('')}
        </div>
      </div>
    </div>
  </section>
  <nav class="wrap weekly-cast-nav" id="weekly-cast" aria-label="캐릭터로 여행 고르기">
    ${CAST.map(
      (c) => `<a class="weekly-cast-card" href="${c.href}" data-stamp="${c.id}">
      <img src="${c.img}" alt="${esc(c.name)}">
      <span class="weekly-cast-role">${esc(c.role)}</span>
      <strong>${esc(c.name)}</strong>
      <p>${esc(c.quote)}</p>
      <em>${esc(c.cta)} ↗</em>
    </a>`,
    ).join('')}
  </nav>
  <div class="wrap">
    <div id="weeklyStatus" class="weekly-status" aria-live="polite">이번 주 혜택을 불러오는 중입니다.</div>
  </div>
  <section class="section weekly-drop-section" id="weekly-drop">
    <div class="wrap">
      ${sectionTitle('쿠폰도깨비 드롭', '이번 주 보따리를 열어보세요', '캐릭터가 매주 테마를 바꿉니다. 할인은 제휴 승인 건만 실제 혜택입니다.')}
      <div class="weekly-drop-grid">
        <article class="weekly-drop-lead">
          <img src="/assets/mascot-coupon-goblin.webp" alt="쿠폰도깨비">
          <div>
            <span class="eyebrow">WEEKLY DROP</span>
            <h3 id="weeklyDropTitle">${esc(theme.title)}</h3>
            <p>사회자는 쿠폰도깨비, 길 안내는 ${esc(theme.host)}입니다. 아래 상태는 아고다 제휴·숙소 승인 여부를 있는 그대로 보여 줍니다.</p>
            <div id="weeklyDropBoard" class="weekly-drop-board">드롭 정보를 불러오는 중</div>
            <a class="filled-btn" href="#events">행사 조건 확인 ↗</a>
          </div>
        </article>
        <ol class="weekly-playbook">
          ${PLAYBOOK.map((row) => `<li><b>${esc(row.day)}</b><strong>${esc(row.title)}</strong><span>${esc(row.host)}</span><p>${esc(row.text)}</p></li>`).join('')}
        </ol>
      </div>
    </div>
  </section>
  <section class="section" id="weekly-trails">
    <div class="wrap">
      ${sectionTitle('길별이·지도도령', '지도에서 시작하는 주말 여행', '주소 기반 구글 지도 길찾기. 캐릭터가 코스를 고르고, 길은 구글 지도가 안내합니다.')}
      <div id="nearbyTrips" class="trips-grid"></div>
      <div class="map-caveat">구글 지도 도보 길찾기를 엽니다. 렌즈 기반 카메라 증강현실 길안내는 외부 웹사이트에서 강제로 실행할 수 없으며 기기·지역·스트리트뷰 지원 여부에 따라 달라집니다.</div>
    </div>
  </section>
  <section class="section weekly-stay-section" id="weekly-stays">
    <div class="wrap">
      ${sectionTitle('머무리의 머물 곳', '코스를 정했다면, 잠자리도 챙겨요', '해안과 도심 모두 머물 곳을 먼저 고르면 주말이 쉬워집니다. 요금·재고는 아고다에서 확인하세요.', 'discover', '숙소 더 찾기')}
      <div class="weekly-stay-grid">${stayCards}</div>
    </div>
  </section>
  <section class="section weekly-film-section" id="weekly-films">
    <div class="wrap">
      ${sectionTitle('여행온의 한 편', '출발 전에 분위기만 맞춰 보세요', '유튜브 검색으로 연결됩니다. 여행갈지도가 영상을 소유하지 않습니다.', 'shorts', '여행 영상')}
      <div class="weekly-film-grid">
        ${FILMS.map(
          (f) => `<a class="weekly-film-card" href="${esc(youtubeSearch(f.q))}" target="_blank" rel="noopener noreferrer">
          <img src="/assets/mascot-yeohaengon.webp" alt="">
          <span><small>${esc(f.city)} · 여행온</small><strong>${esc(f.title)}</strong><em>관련 영상 찾기 ↗</em></span>
        </a>`,
        ).join('')}
      </div>
    </div>
  </section>
  <section class="section weekly-stamp-section">
    <div class="wrap">
      ${sectionTitle('이번 주 여행 스탬프', '캐릭터를 만나면 스탬프가 모여요', '시연용 참여 장치입니다. 경품·할인권이 아닙니다.')}
      <div id="weeklyStampBoard" class="weekly-stamp-board"></div>
      <p class="mini-info">스탬프는 이 브라우저에만 저장됩니다. 제휴 쿠폰 발급과 연결되어 있지 않습니다.</p>
    </div>
  </section>
  <section class="section brand-mascot-section">
    <div class="wrap">
      ${sectionTitle('안내 캐릭터', '여행을 함께할 친구들', '검색·지도·숙소·혜택·영상을 캐릭터가 나눠 맡는 IP 캠페인입니다.')}
      <div class="mascot-row mascot-row-five">
        ${CAST.map(
          (c) => `<article>
          <img src="${c.img}" alt="${esc(c.name)} 캐릭터 콘셉트">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.job)}</p>
          <a href="${c.href}">${esc(c.cta)} ↗</a>
        </article>`,
        ).join('')}
      </div>
      <div class="weekly-share">
        <img src="/assets/mascot-gilbyeoli.webp" alt="">
        <div>
          <strong>이번 주 한 줄</strong>
          <p id="weeklyShareQuote">여행갈지도 · ${esc(theme.title)} · 이번 주, 어디로 갈지도?</p>
          <button type="button" class="outline-btn" id="weeklyCopyQuote">문구 복사</button>
        </div>
      </div>
    </div>
  </section>`;
  }

  function bindWeeklyPage(week) {
    const iso = week || 'demo';
    const root = document.querySelector('#app');
    if (root && !root.dataset.weeklyBound) {
      root.dataset.weeklyBound = '1';
      root.addEventListener('click', (e) => {
        const node = e.target.closest('[data-stamp]');
        if (!node || !root.contains(node)) return;
        const id = node.getAttribute('data-stamp');
        if (!id) return;
        const w = root.dataset.weeklyIso || iso;
        writeStamps(w, Array.from(new Set(readStamps(w).concat(id))));
        renderStamps(w);
      });
    }
    if (root) root.dataset.weeklyIso = iso;
    renderStamps(iso);
    const copy = document.querySelector('#weeklyCopyQuote');
    const quote = document.querySelector('#weeklyShareQuote');
    if (copy && quote && !copy.dataset.bound) {
      copy.dataset.bound = '1';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(quote.textContent || '');
          copy.textContent = '복사했습니다';
        } catch {
          copy.textContent = '복사할 수 없습니다';
        }
      });
    }
  }

  window.travelWeeklyPageHtml = weeklyPageHtml;
  window.travelWeeklyBind = bindWeeklyPage;
  window.travelWeeklyCountdown = startCountdown;
})();
