/* Accessible, framework-free enhancement for the server-rendered property pages. */
(() => {
  'use strict';
  const dialog = document.getElementById('galleryDialog');
  const opener = document.getElementById('openGallery');
  const closer = document.getElementById('closeGallery');
  const toast = document.getElementById('detailToast');
  let lastFocus = null;
  let toastTimer = null;
  function notify(message){
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }
  function open(){
    if (!dialog) return;
    lastFocus=document.activeElement;
    dialog.hidden=false;dialog.setAttribute('aria-hidden','false');
    document.body.classList.add('dialog-open');
    closer?.focus();
  }
  function close(){
    if (!dialog) return;
    dialog.hidden=true;dialog.setAttribute('aria-hidden','true');
    document.body.classList.remove('dialog-open');
    if (lastFocus && typeof lastFocus.focus==='function') lastFocus.focus();
  }
  // Never substitute an unrelated villa as a hotel's factual photo if a licensed link breaks.
  document.querySelectorAll('.gallery-cover img, .gallery-dialog img').forEach((img) => {
    img.addEventListener('error', () => {
      img.style.display='none';
      const parent=img.parentElement;
      if (!parent || parent.querySelector('.image-load-error')) return;
      const fallback=document.createElement('span');
      fallback.className='image-load-error';
      fallback.textContent='사진을 불러올 수 없습니다. 아래 출처 링크에서 원본을 확인해 주세요.';
      parent.appendChild(fallback);
      const badge=parent.querySelector('.image-badge');
      if (badge && badge.textContent.includes('실제 사진')) badge.textContent='실제 사진 연결 실패 · 원본 출처 확인';
    },{once:true});
  });
  opener?.addEventListener('click', open);
  closer?.addEventListener('click', close);
  dialog?.addEventListener('click',(event)=>{if (event.target===dialog)close()});
  document.addEventListener('keydown',(event)=>{
    if (dialog?.hidden===false && event.key==='Escape')close();
    if (dialog?.hidden===false && event.key==='Tab'){event.preventDefault();closer?.focus()}
  });
  const share=document.getElementById('shareProperty');
  share?.addEventListener('click',async()=>{
    const payload={title:document.title,url:location.href.split('#')[0]};
    try {
      if (navigator.share){await navigator.share(payload);return}
      if (!navigator.clipboard)throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(payload.url);notify('숙소 링크를 복사했습니다.');
    }catch(error){if(error?.name!=='AbortError')notify('주소창에서 숙소 링크를 복사해 주세요.')}
  });
  const fav=document.getElementById('favoriteToggle');
  const key='stayro-saved';
  const pid=location.pathname.slice('/stay/'.length);
  function safeRead(){try {const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data.filter(x=>typeof x==='string').slice(0,200):[]}catch{return []}}
  function draw(){if(!fav)return;const active=safeRead().includes(pid);fav.setAttribute('aria-pressed',String(active));fav.innerHTML=active?'♥ <span>저장됨</span>':'♡ <span>저장</span>'}
  fav?.addEventListener('click',()=>{
    const items=safeRead();const next=items.includes(pid)?items.filter(x=>x!==pid):[...items,pid].slice(-200);
    try {localStorage.setItem(key,JSON.stringify(next));draw();notify(next.includes(pid)?'관심 숙소에 저장했습니다.':'관심 숙소에서 제거했습니다.')}catch{notify('이 브라우저에서는 저장할 수 없습니다.')}
  });
  draw();
  const stayMap = document.getElementById('stayMap');
  const note = document.getElementById('stayGeoNote');
  const dirLink = document.getElementById('openStayDirections');
  const iframe = stayMap?.querySelector('iframe');
  const destLat = Number(stayMap?.dataset.lat);
  const destLng = Number(stayMap?.dataset.lng);
  const destName = stayMap?.dataset.name || '';
  const dest = Number.isFinite(destLat) && Number.isFinite(destLng) ? { lat: destLat, lng: destLng } : null;
  function applyUserLoc(loc) {
    if (!window.YeohangGeo || !dest) return;
    if (iframe) iframe.src = window.YeohangGeo.embedDir(loc, dest);
    if (dirLink) dirLink.href = window.YeohangGeo.openDir(loc, dest, 'walking');
    if (note) note.textContent = '내 위치에서 이 숙소까지 구글 지도 길을 표시합니다.';
  }
  const saved = window.YeohangGeo?.read?.();
  if (saved && dest) applyUserLoc(saved);
  document.getElementById('useMyLocation')?.addEventListener('click', async () => {
    if (!window.YeohangGeo) { notify('지도 모듈을 불러오지 못했습니다.'); return; }
    if (!dest) { notify('이 숙소는 좌표가 없어 주소 길찾기를 이용하세요.'); return; }
    try {
      const loc = await window.YeohangGeo.request();
      applyUserLoc(loc);
      notify('내 위치를 반영해 구글 길찾기를 열었습니다.');
      window.open(window.YeohangGeo.openDir(loc, dest, 'walking'), '_blank', 'noopener,noreferrer');
    } catch (error) {
      notify(error instanceof Error ? error.message : '위치를 가져오지 못했습니다.');
    }
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-agoda-book], .js-agoda-book');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
    const url = link.getAttribute('href');
    if (!url) return;
    const popup = window.open(url, 'agodaBooking', 'width=1280,height=860,menubar=yes,toolbar=yes,scrollbars=yes,resizable=yes');
    if (popup) {
      event.preventDefault();
      try { popup.opener = null; } catch {}
    }
  });
})();
