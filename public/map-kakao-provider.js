/* 여행갈지도: optional licensed Kakao Maps JS provider, disabled without a registered public JS key.
   Keeps existing YeohangMultiMap SPA API and existing 5km/type backend filtering. */
(() => {
 'use strict';
 const key=document.querySelector('meta[name="yeohang-kakao-js-key"]')?.content?.trim()||'';
 // Kakao JavaScript key is designed for web disclosure, but must still have exact origin authorization.
 if(!/^[A-Za-z0-9]{20,64}$/.test(key))return;
 const original=window.YeohangMultiMap;
 if(!original||!original.render)return;
 const icons={hotel:'🏨',motel:'🛏️',pension:'🏡',private:'🏠',resort:'🌴',guesthouse:'🎒',hanok:'🏯',camping:'⛺',other:'📍'};
 let sdkPromise=null, map=null, surface=null, overlays=new Map(), radius=null, centerPin=null,
     selected='', serial=0, onPick=null, active='kakao';
 const point=p=>original.validPoint(p);
 const K=()=>window.kakao.maps;
 const pos=p=>new (K().LatLng)(Number(p.lat),Number(p.lng));
 function sdk(){
   if(window.kakao?.maps?.Map)return Promise.resolve(true);
   if(sdkPromise)return sdkPromise;
   sdkPromise=new Promise(resolve=>{
     let settled=false;
     const finish=ok=>{if(!settled){settled=true;resolve(Boolean(ok));}};
     const script=document.createElement('script');
     script.src='https://dapi.kakao.com/v2/maps/sdk.js?appkey='+encodeURIComponent(key)+'&autoload=false';
     script.async=true;
     script.referrerPolicy='strict-origin-when-cross-origin';
     script.onload=()=>{
       if(!window.kakao?.maps?.load){finish(false);return;}
       window.kakao.maps.load(()=>finish(Boolean(window.kakao?.maps?.Map)));
     };
     script.onerror=()=>finish(false);
     document.head.appendChild(script);
     setTimeout(()=>finish(false),8500);
   });
   return sdkPromise;
 }
 function clearOverlays(){
   overlays.forEach(p=>p.overlay.setMap(null));
   overlays.clear();
   if(radius){radius.setMap(null);radius=null;}
   if(centerPin){centerPin.setMap(null);centerPin=null;}
   selected='';
 }
 function destroy(){
   serial++;
   clearOverlays();
   if(surface&&active==='kakao')surface.textContent='';
   surface=null;map=null;onPick=null;active='kakao';
 }
 function select(id,pan=true){
   const hit=overlays.get(String(id));
   if(!hit)return active==='leaflet'?original.select(id,pan):false;
   selected=String(id);
   overlays.forEach((m,k)=>{m.icon.classList.toggle('ym-kakao-selected',k===selected);});
   if(pan&&map)map.panTo(hit.position);
   return true;
 }
 function clearPins(){
   serial++;clearOverlays();
   if(active==='leaflet')original.clearPins();
   const status=document.getElementById('mapEngineStatus');
   if(status)status.textContent='선택한 유형의 숙소를 불러오는 중입니다…';
 }
 async function fallback(args){
   active='leaflet';
   if(surface)surface.textContent='';
   map=null;
   const status=document.getElementById('mapEngineStatus');
   if(status)status.textContent='카카오 지도 연동이 제한되어 기본 지도에서 표시합니다.';
   return original.render(args);
 }
 async function render(args){
   const id=++serial;
   const node=document.getElementById('multiStayMap');
   if(!node)return false;
   if(active==='leaflet')return original.render(args);
   if(!await sdk())return fallback(args);
   if(id!==serial||!node.isConnected||!location.hash.startsWith('#map'))return false;
   try{
     const pins=(args.pins||[]).filter(p=>point(p)&&Number.isFinite(Number(p.distance_km))&&Number(p.distance_km)<=5).slice(0,80);
     const anchor=point(args.userLoc)?args.userLoc:point(args.center)?args.center:{lat:37.493060,lng:127.118060};
     node.hidden=false;
     const frame=document.getElementById('googleStayMap');
     if(frame){frame.hidden=true;frame.classList.add('map-fallback-hidden');}
     if(surface!==node){original.destroy?.();destroy();surface=node;node.textContent='';}
     if(!map)map=new (K().Map)(node,{center:pos(anchor),level:5});
     map.relayout();
     clearOverlays();
     onPick=args.onSelect;
     const bounds=new (K().LatLngBounds)();
     const anchorPos=pos(anchor);
     bounds.extend(anchorPos);
     radius=new (K().Circle)({center:anchorPos,radius:5000,strokeWeight:2,strokeColor:'#087f82',
       strokeOpacity:.74,strokeStyle:'solid',fillColor:'#087f82',fillOpacity:.045});
     radius.setMap(map);
     // Keep the 5km search perimeter visible on mobile instead of zooming too far into markers.
     for(const edge of [[.046,0],[-.046,0],[0,.058],[0,-.058]]){
       bounds.extend(new (K().LatLng)(Number(anchor.lat)+edge[0],Number(anchor.lng)+edge[1]));
     }
     const me=document.createElement('div');me.className='ym-kakao-origin';
     me.textContent=point(args.userLoc)?'내 위치':'기준 위치';
     me.title=args.originLabel||'가락시장역 · 실제 위치 아님';
     centerPin=new (K().CustomOverlay)({map,position:anchorPos,content:me,yAnchor:1.2});
     for(const p of pins){
       const pId=String(p.id);
       const latLng=pos(p);
       const button=document.createElement('button');
       button.type='button';button.className='ym-kakao-marker';
       button.setAttribute('aria-label',String(p.name||'숙소')+' 선택');
       const symbol=document.createElement('span');symbol.textContent=icons[p.stay_type]||icons.other;
       const label=document.createElement('small');label.textContent=String(p.name||'숙소').slice(0,20);
       button.append(symbol,label);
       button.addEventListener('click',e=>{
         e.preventDefault();select(pId,true);
         if(typeof onPick==='function')onPick(pId,true);
       });
       const overlay=new (K().CustomOverlay)({map,position:latLng,content:button,yAnchor:1.12});
       overlays.set(pId,{overlay,icon:button,position:latLng});
     }
     map.setBounds(bounds);
     select(args.selectedId,false);
     const status=document.getElementById('mapEngineStatus');
     if(status)status.textContent='카카오 지도 · 반경 5km · 선택한 숙소 '+pins.length+'곳';
     return true;
   }catch(e){console.warn('Kakao provider fallback',e);return fallback(args);}
 }
 window.YeohangMultiMap={render,select,clearPins,destroy,validPoint:original.validPoint,
   isReady:()=>active==='leaflet'?original.isReady():!!(map&&surface?.isConnected),
   provider:()=>active};
 window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#map'))destroy();});
})();
