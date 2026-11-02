/* 김별의 새로운 대동여지도: 기존 검색·결제·내비게이션 코드에 개입하지 않는 UI 레이어 */
(() => {
  'use strict';
  const img = {
    kim: '/assets/mascot-jido.webp',
    star: '/assets/mascot-gilbyeoli.webp',
    stay: '/assets/mascot-meomuri.webp',
    coupon: '/assets/mascot-coupon-goblin.webp',
    video: '/assets/mascot-yeohaengon.webp'
  };
  const topics = {
    discover: ['머무리의 숙소 수첩', '숙소 사진·요금과 제휴 조건을 확인하고 여행을 준비해요.', 'stay'],
    ask: ['김별의 AI 탐험 수첩', '어떤 여행을 원하시나요? 지역과 분위기를 함께 알려 주세요.', 'kim'],
    map: ['길별이의 여행지도', '위치는 동의 후 사용하며, 운전 중 쿠폰 화면은 조작하지 않아요.', 'star'],
    places: ['김별의 발견 노트', '관광정보의 출처를 확인하며 우리나라 구석구석을 탐험해요.', 'kim'],
    images: ['머무리의 사진 도감', '실제 숙소 사진과 인공지능 콘셉트 이미지를 구분해요.', 'stay'],
    journal: ['여행온의 여행 기록', '공개된 여행 이야기와 여행지를 함께 살펴보세요.', 'video'],
    shorts: ['여행온의 영상 상자', '여행 영상은 원본 채널에서 이어 볼 수 있어요.', 'video'],
    coupons: ['쿠폰도깨비의 혜택 보따리', '제휴 승인 혜택과 시연용 쿠폰은 구분됩니다.', 'coupon'],
    events: ['쿠폰도깨비의 이번 주 혜택', '실제 할인을 받기 전에 유효기간과 이용 조건을 확인하세요.', 'coupon'],
    weekly: ['길별이의 주간 탐험', '이번 주에는 어디로 갈지도? 새로운 여행을 발견해요.', 'star'],
    compare: ['머무리의 숙소 비교', '위치와 편의시설, 예약 조건을 비교해 보세요.', 'stay']
  };
  const links = [
    ['김별의 발견 노트', '관광지·역사·자연', '#places', 'kim'],
    ['머무리의 숙소 수첩', '호텔·펜션·숙박', '#discover', 'stay'],
    ['길별이의 여행지도', '지도·내 주변·길찾기', '#map', 'star'],
    ['도깨비의 혜택 보따리', '쿠폰·이벤트', '#weekly', 'coupon']
  ];
  const route = () => location.hash.replace(/^#/, '').split('?')[0] || 'home';
  function homeHero() {
    const wrap = document.createElement('section');
    wrap.className = 'kb6-hero'; wrap.dataset.kb6 = '1';
    wrap.setAttribute('aria-label', '김별의 새로운 대동여지도');
    wrap.innerHTML = '<div class="kb6-hero-text"><span class="kb6-overline">KIM BYEOL · NEW TRAVEL ATLAS</span>' +
      '<h1>그때는 대동여지도,<br><em>지금은 여행갈지도.</em></h1>' +
      '<p>지도 탐험가 김별과 함께 대한민국 구석구석. 관광지·숙소·맛집과 길안내, 확인된 여행 혜택까지 찾아보세요.</p>' +
      '<div class="kb6-buttons"><a href="#places">김별의 발견 지도 보기</a><a href="/kimbyeol">탐험 수첩 펼치기</a></div>' +
      '<small>창작 캐릭터·AI 여행 콘셉트 · 실제 예약 및 제휴 혜택은 제공처 조건 확인</small></div>' +
      '<div class="kb6-hero-characters"><img src="'+img.kim+'" alt="전통 지도를 펼치는 김별"><img class="kb6-spark" src="'+img.star+'" alt="길별이"><span>김별과 어디로 갈지도?</span></div>';
    return wrap;
  }
  function heroLinks() {
    const section = document.createElement('nav'); section.className = 'kb6-links'; section.dataset.kb6 = '1';
    section.setAttribute('aria-label','캐릭터별 여행 탐험 메뉴');
    for(const [name,subtitle,href,mascot] of links) {
      const a=document.createElement('a'); a.href=href;
      const picture=document.createElement('img'); picture.src=img[mascot]; picture.alt='';
      const copy=document.createElement('div');
      const strong=document.createElement('strong'); strong.textContent=name;
      const span=document.createElement('span'); span.textContent=subtitle;
      copy.append(strong,span); a.append(picture,copy); section.append(a);
    }
    return section;
  }
  function pageBadge(name) {
    const [title,description,mascot]=topics[name] || ['김별의 여행 기록','새로운 여행을 발견해 보세요.','kim'];
    const aside=document.createElement('aside'); aside.className='kb6-note'; aside.dataset.kb6='1';
    const pic=document.createElement('img'); pic.src=img[mascot]; pic.alt='';
    const txt=document.createElement('div');
    const h=document.createElement('strong'); h.textContent=title;
    const p=document.createElement('p'); p.textContent=description;
    const a=document.createElement('a'); a.href='/kimbyeol'; a.textContent='김별의 탐험 수첩 보기';
    txt.append(h,p,a);aside.append(pic,txt);return aside;
  }
  let lastRootChild=null,lastRoute='';
  function apply(){
    const root=document.getElementById('app');
    if (!root || !root.children.length) return;
    const r=route(), first=root.firstElementChild;
    if(lastRootChild===first && lastRoute===r && root.querySelector('[data-kb6]'))return;
    root.querySelectorAll('[data-kb6]').forEach(el=>el.remove());
    if(r==='home'){root.prepend(heroLinks());root.prepend(homeHero());}
    else {const note=pageBadge(r),head=root.querySelector('.page-head');if(head)head.insertAdjacentElement('afterend',note);else root.prepend(note);}
    lastRootChild=root.firstElementChild;lastRoute=r;
  }
  function init(){
    const root=document.getElementById('app');if(!root)return;
    let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});};
    new MutationObserver(changes=>{if(changes.some(c=>Array.from(c.addedNodes).some(n=>n.nodeType===1&&!n.dataset?.kb6)))schedule();}).observe(root,{childList:true});
    window.addEventListener('hashchange',schedule);schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();