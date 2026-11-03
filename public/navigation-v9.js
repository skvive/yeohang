
/* 여행갈지도 V9 지도 전용 쉘: 기존 기능 재사용, 카카오맵 앱 복제/사칭 금지. */
(() => {
 'use strict';
 let prevRoute='';
 const isMap=()=>location.hash.split('?')[0]==='#map';
 function sync(){
   const on=isMap();
   document.body.classList.toggle('yeohang-map-mode',on);
   if(!on){prevRoute='';return;}
   const canvas=document.getElementById('mapCanvas');
   if(!canvas||canvas.querySelector('.y-nav-float'))return;
   const section=canvas.closest('.section-tight');
   const wrap=section?.querySelector('.wrap');
   if(!wrap)return;
   if(!wrap.querySelector('.y-nav-shell')){
     const shell=document.createElement('div');
     shell.className='y-nav-shell';
     shell.innerHTML=`<div class="y-nav-top"><div class="y-nav-brand"><img src="/assets/nav-brand-mark.svg" alt="여행갈지도 공식 심벌"><div><small>TRAVEL GALJIDO · NAV</small><b>지금은 여행갈지도</b><span class="y-nav-brand-copy">길별이가 안내하는 스마트 여행 지도</span></div></div><div class="y-nav-info"><strong>⌖ 내 주변 5km</strong><span>위치 미허용 시 가락시장역 기준</span></div></div>
     <label class="y-nav-search"><span aria-hidden="true">⌕</span><input id="navMapSearch" type="search" autocomplete="off" placeholder="숙소 이름·지역·주소 검색" aria-label="주변 숙소 검색"><button type="button" data-ynav="search">검색</button></label>
     <div class="y-nav-quick" aria-label="여행 바로가기"><button type="button" data-ynav="near">⌖ 내 위치</button><button type="button" data-ynav="all">✦ 전체 숙소</button><button type="button" data-ynav="map">▦ 지도 보기</button><button type="button" data-ynav="list">☷ 검색 결과</button><button type="button" data-ynav="route">↗ 길찾기</button></div>`;
     wrap.prepend(shell);
     const caption=document.createElement('p');
     caption.className='y-nav-location-caption';
     caption.textContent='지도 배경: 승인된 카카오맵 SDK 사용 시 카카오맵 · 그 외 기본 지도. 길찾기는 외부 앱에서 열립니다. 앱 내 주행 안내는 별도 SDK 연동이 필요합니다.';
     const mapStatus=wrap.querySelector('#mapEngineStatus');
     if(mapStatus)mapStatus.before(caption);
     const nav=document.createElement('nav');
     nav.className='y-nav-bottom';nav.setAttribute('aria-label','지도 하단 메뉴');
     nav.innerHTML='<a href="#home"><span>⌂</span>홈</a><a href="#discover"><span>⌕</span>탐색</a><a href="#map" aria-current="page"><span>⌖</span>내 주변</a><a href="#weekly"><span>◇</span>혜택</a><a href="#coupons"><span>♧</span>쿠폰</a>';
     wrap.appendChild(nav);
   }
   const bar=document.createElement('div');bar.className='y-nav-float';
   bar.innerHTML=`<button type="button" data-ynav="near" aria-label="내 위치로 이동">⌖ 내 위치</button>
      <button class="y-nav-character" type="button" data-ynav="list" aria-label="길별이가 추천하는 숙소 목록"><img src="/assets/mascot-gilbyeoli.webp" alt="">길별이 추천</button>
      <button type="button" data-ynav="route" aria-label="선택한 숙소 카카오맵 길찾기">↗ 길찾기</button>`;
   canvas.appendChild(bar);
   prevRoute='map';
 }
 function act(action){
   const api=window.YeohangNavigation;
   if(action==='near'){document.querySelector('#mapCanvas')?.closest('.wrap')?.querySelector('[data-near]')?.click();return;}
   if(action==='all'){document.querySelector('[data-mapcategory="all"]')?.click();return;}
   if(action==='route'){if(!api?.openDirections?.())alert('목적지를 선택한 다음 길찾기를 눌러 주세요.');return;}
   if(action==='search'){
     const input=document.getElementById('navMapSearch');
     if(input){api?.search?.(input.value);input.blur();}
     return;
   }
   const target=action==='list'?document.getElementById('mapSide'):document.getElementById('mapCanvas');
   target?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 document.addEventListener('click',e=>{
   const button=e.target.closest('[data-ynav]');if(!button)return;
   e.preventDefault();act(button.dataset.ynav);
 });
 document.addEventListener('input',e=>{
   if(e.target?.id==='navMapSearch')window.YeohangNavigation?.search?.(e.target.value);
 });
 document.addEventListener('keydown',e=>{
   if(e.key==='Enter' && e.target?.id==='navMapSearch'){e.preventDefault();act('search');}
 });
 window.addEventListener('hashchange',()=>queueMicrotask(sync));
 function ensureBundledFallback(){
   // When APK loads the older production site, the V9 UI remains functional.
   // This adapter is unused once V9 web source exposes the full search API.
   if(window.YeohangNavigation || !window.__YV9_APK__)return;
   window.YeohangNavigation={
     search(query){
       const needle=String(query||'').trim().toLocaleLowerCase('ko');
       const rows=[...document.querySelectorAll('#mapSide .map-list-row')];
       let found=0;
       rows.forEach(row=>{
         const visible=!needle||row.textContent.toLocaleLowerCase('ko').includes(needle);
         row.hidden=!visible;
         if(visible)found++;
       });
       const message=document.getElementById('mapGeoStatus');
       if(message&&needle)message.textContent='현재 검색 목록 '+found+'곳 · 지도 핀은 숙소 유형 필터를 따릅니다.';
       return found;
     },
     openDirections(){
       const selected=document.querySelector('#mapSide .map-list-row.active')||
         [...document.querySelectorAll('#mapSide .map-list-row')].find(row=>!row.hidden);
       const name=selected?.querySelector('h4')?.textContent?.trim();
       if(!name)return false;
       const open=document.getElementById('openGoogleMaps');
       let coordinates='';
       try{
         const u=new URL(open?.href||'',location.href);
         coordinates=u.searchParams.get('query')||u.searchParams.get('q')||'';
       }catch{}
       const match=coordinates.match(/(-?\d{2}\.\d+)\s*,\s*(-?\d{3}\.\d+)/);
       const route=match?
         'https://map.kakao.com/link/to/'+encodeURIComponent(name)+','+match[1]+','+match[2]:
         'https://map.kakao.com/link/search/'+encodeURIComponent(name);
       location.assign(route);
       return true;
     }
   };
 }
 const boot=()=>{
   ensureBundledFallback();
   const root=document.getElementById('app');
   if(root){const o=new MutationObserver(()=>{if(isMap())sync();});o.observe(root,{childList:true});}
   sync();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();
