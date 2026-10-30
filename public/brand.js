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
  return `<div class="wrap"><div class="weekly-strip-inner"><img src="/assets/mascot-coupon-goblin.webp" alt="쿠폰도깨비 캐릭터"><div class="weekly-strip-copy"><span class="eyebrow">매주 월요일 · WEEKLY DROP</span><h2>쿠폰도깨비가 찾아왔어요!</h2><p>이번 주 테마 <strong>${h(w?.iso_week||'주간 업데이트 준비')}</strong> · ${h(benefits)}</p><small>유효기간: ${h(w?.starts_on||'')} ~ ${h(w?.ends_on||'')} · 다음 갱신 ${h(w?.next_refresh||'')}</small></div><a class="weekly-cta" href="#weekly">이번 주 혜택과 여행길 보기 ↗</a></div></div>`;
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
   if(stat)stat.innerHTML=`<div><span class="eyebrow">이번 주 혜택 상태</span><strong>${h(w.iso_week)} · ${w.actual_discount_available?'제휴 승인 혜택':'시연용 혜택'}</strong><p>${h(w.notice)}</p><small>${h(w.starts_on)} ~ ${h(w.ends_on)} · 다음 갱신 ${h(w.next_refresh)}</small></div><a href="#events">쿠폰 이용 조건 확인 ↗</a>`;
  }catch(e){if(strip)strip.innerHTML='<div class="wrap weekly-strip-fallback">주간 행사를 확인할 수 없습니다. <a href="#events">기존 행사 보기</a></div>';if(stat)stat.textContent=e.message;}
  finally{loading=false}
  if(trips){trips.innerHTML=places.map((p,i)=>`<article class="trip-card"><div class="trip-thumb"><img loading="lazy" src="/assets/${h(p.pic)}" alt="AI 제작 여행 풍경 콘셉트. 실제 장소 사진 아님"><span>AI 콘셉트 이미지</span></div><div class="trip-copy"><span class="trip-tag">${h(p.city)} · ${h(p.tag)}</span><h3>${h(p.title)}</h3><p>${h(p.story)}</p><div class="trip-actions"><a href="${h(mapsLink(p.addr))}" target="_blank" rel="noopener noreferrer">Google 길찾기 ↗</a><a href="${h(youtubeSearch(p.title))}" target="_blank" rel="noopener noreferrer">관련 영상 찾기 ↗</a></div></div></article>`).join('')}
 }
 window.travelWeeklyLoad=load;
 window.travelMapLink=mapsLink;
 document.addEventListener('DOMContentLoaded',()=>setTimeout(load,160));
 window.addEventListener('hashchange',()=>setTimeout(load,50));
})();
