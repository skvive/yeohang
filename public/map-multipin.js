/* 여행갈지도: 주행안내가 아닌 주변 숙소 탐색용 멀티핀 지도.
   Leaflet 1.9.4 / OpenStreetMap 기본 타일(MVP). 상용 대량 트래픽은 계약 타일 공급자로 교체.
   외부 API에서 받아온 숙소명/주소는 모두 textContent로 렌더링한다. */
(() => {
  'use strict';
  const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
  const STYLE_URL = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
  const DEFAULT_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
  const ICONS = {
    hotel: '🏨', motel: '🛏️', pension: '🏡', private: '🏠',
    resort: '🌴', guesthouse: '🎒', hanok: '🏯', camping: '⛺', other: '📍'
  };
  let scriptPromise = null;
  let map = null;
  let container = null;
  let group = null;
  let origin = null;
  let radiusCircle = null;
  let markers = new Map();
  let current = '';
  let ticket = 0;

  function validPoint(p) {
    return p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) &&
      Number(p.lat) >= 33 && Number(p.lat) <= 39.6 &&
      Number(p.lng) >= 124.5 && Number(p.lng) <= 132;
  }
  function safeTiles() {
    const configured = String(document.querySelector('meta[name="yeohang-map-tile-url"]')?.content || window.YEOHANG_TILE_URL || '');
    if (configured && /^https:\/\/[^<>"'\s]+\/\{z\}\/\{x\}\/\{y\}\.(png|jpg|webp)(\?[^<>"'\s]*)?$/i.test(configured))
      return configured;
    return DEFAULT_TILES;
  }
  function loadLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (scriptPromise) return scriptPromise;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = STYLE_URL;
    stylesheet.crossOrigin = 'anonymous';
    document.head.appendChild(stylesheet);
    scriptPromise = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(window.L && window.L.map ? window.L : null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
    return scriptPromise;
  }
  function fallback(reason) {
    const iframe = document.getElementById('googleStayMap');
    const surface = document.getElementById('multiStayMap');
    if (iframe) { iframe.hidden = false; iframe.classList.remove('map-fallback-hidden'); }
    if (surface) surface.hidden = true;
    const status = document.getElementById('mapEngineStatus');
    if (status) status.textContent = reason || '여러 숙소 지도 연결이 제한되어 선택한 숙소를 Google 지도에 표시합니다.';
  }
  function destroy() {
    ticket += 1;
    if (map) {
      try { map.remove(); } catch {}
    }
    map = null;
    group = null;
    origin = null;
    radiusCircle = null;
    container = null;
    markers = new Map();
    current = '';
  }
  function makeIcon(type, selected) {
    const label = ICONS[type] || ICONS.other;
    return window.L.divIcon({
      className: 'ym-marker' + (selected ? ' ym-marker-selected' : ''),
      html: '<span aria-hidden="true">' + label + '</span>',
      iconSize: [40, 45],
      iconAnchor: [20, 42],
      popupAnchor: [0, -35]
    });
  }
  function popupFor(p, choose, position) {
    const box = document.createElement('div');
    box.className = 'ym-popup';
    const title = document.createElement('strong');
    title.textContent = String(p.name || '숙소');
    const sub = document.createElement('p');
    sub.textContent = [p.city || '', p.category || '숙소', p.distance_km == null ? '' : String(p.distance_km) + 'km'].filter(Boolean).join(' · ');
    const actions = document.createElement('div');
    actions.className = 'ym-popup-actions';
    const chooseButton = document.createElement('button');
    chooseButton.type = 'button';
    chooseButton.textContent = '목록에서 보기';
    chooseButton.addEventListener('click', () => choose(String(p.id), true));
    const details = document.createElement('a');
    details.href = '/stay/' + encodeURIComponent(String(p.id));
    details.textContent = '숙소 상세 ↗';
    const directions = document.createElement('a');
    const g = window.YeohangGeo;
    directions.href = g ? g.openDir(position && validPoint(position) ? position : null, p, 'driving') :
      'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(String(p.lat) + ',' + String(p.lng));
    directions.target = '_blank';
    directions.rel = 'noopener noreferrer';
    directions.textContent = '길찾기 ↗';
    actions.append(chooseButton, details, directions);
    box.append(title, sub, actions);
    return box;
  }
  function chooseIcon(id) {
    current = String(id || '');
    for (const [key, marker] of markers) {
      marker.setIcon(makeIcon(marker.ymType, key === current));
      marker.setZIndexOffset(key === current ? 300 : 0);
    }
  }
  // 카테고리 변경 시 이전 유형의 마커를 즉시 없애고, 이전 비동기 렌더도 무효화한다.
  function clearPins() {
    ticket += 1;
    if (group) group.clearLayers();
    if (map) map.closePopup?.();
    markers = new Map();
    current = '';
    const status = document.getElementById('mapEngineStatus');
    if (status) status.textContent = '새 숙소 유형의 반경 5km 핀을 불러오는 중입니다…';
  }
  function select(id, pan = true, popup = false) {
    const key = String(id || '');
    const marker = markers.get(key);
    if (!marker || !map) return false;
    chooseIcon(key);
    if (pan) map.panTo(marker.getLatLng(), { animate: true, duration: 0.25 });
    if (popup) marker.openPopup();
    return true;
  }
  async function render({ pins = [], center = null, userLoc = null, originLabel = '', selectedId = '', onSelect }) {
    const run = ++ticket;
    const surface = document.getElementById('multiStayMap');
    if (!surface) return false;
    const L = await loadLeaflet();
    if (run !== ticket || !surface.isConnected || !location.hash.startsWith('#map')) return false;
    if (!L) { fallback('지도 라이브러리를 불러오지 못해 Google 지도 단일 위치 보기를 사용합니다.'); return false; }
    try {
      if (container !== surface) {
        if (map) destroy();
        // destroy() changes the ticket; new container stays valid for this render.
        container = surface;
        surface.hidden = false;
        const fallbackIframe = document.getElementById('googleStayMap');
        if (fallbackIframe) { fallbackIframe.classList.add('map-fallback-hidden'); fallbackIframe.hidden = true; }
        const initial = validPoint(center) ? [Number(center.lat), Number(center.lng)] : [37.5665, 126.978];
        map = L.map(surface, { preferCanvas: true, scrollWheelZoom: false, zoomControl: true }).setView(initial, 11);
        L.tileLayer(safeTiles(), {
          minZoom: 5, maxZoom: 18, attribution: ATTRIBUTION, detectRetina: false,
          updateWhenIdle: true, keepBuffer: 2
        }).addTo(map);
        group = L.layerGroup().addTo(map);
      }
      group.clearLayers();
      if (origin) { map.removeLayer(origin); origin = null; }
      if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
      markers = new Map();
      const points = pins.filter(p => validPoint(p) && Number.isFinite(Number(p.distance_km)) && Number(p.distance_km) <= 5).slice(0, 80);
      for (const p of points) {
        const id = String(p.id);
        const marker = L.marker([Number(p.lat), Number(p.lng)], {
          icon: makeIcon(String(p.stay_type || 'other'), id === String(selectedId))
        });
        marker.ymType = String(p.stay_type || 'other');
        marker.bindPopup(popupFor(p, onSelect, userLoc), { maxWidth: 260 });
        marker.on('click', () => {
          chooseIcon(id);
          if (typeof onSelect === 'function') onSelect(id, true);
        });
        marker.addTo(group);
        markers.set(id, marker);
      }
      const originPoint = validPoint(userLoc) ? userLoc : center;
      if (validPoint(originPoint)) {
        const pos = [Number(originPoint.lat), Number(originPoint.lng)];
        radiusCircle = L.circle(pos, { radius: 5000, color: '#047f82', weight: 2,
          opacity: 0.7, fillColor: '#10a49b', fillOpacity: 0.045, interactive: false }).addTo(map);
        origin = L.circleMarker(pos, { radius: 9, color: '#fff', weight: 3,
          fillColor: validPoint(userLoc) ? '#147de0' : '#d97326', fillOpacity: 1
        }).bindTooltip(originLabel || (validPoint(userLoc) ? '현재 위치' : '가락시장역 · 기본 위치 (실제 위치 아님)')).addTo(map);
      }
      current = '';
      chooseIcon(selectedId);
      if (points.length) {
        const bounds = L.latLngBounds(points.map(p => [Number(p.lat), Number(p.lng)]));
        if (validPoint(originPoint)) bounds.extend([Number(originPoint.lat), Number(originPoint.lng)]);
        // 중심 반경 5km 전체가 모바일 지도 영역에 들어오도록 가시 범위를 조정한다.
        if (radiusCircle?.getBounds) bounds.extend(radiusCircle.getBounds());
        map.fitBounds(bounds.pad(0.12), { maxZoom: 13, padding: [22, 22], animate: false });
      } else {
        const p = validPoint(userLoc) ? userLoc : validPoint(center) ? center : { lat: 37.5665, lng: 126.978 };
        map.setView([Number(p.lat), Number(p.lng)], 12, { animate: false });
      }
      requestAnimationFrame(() => { if (map && surface.isConnected) map.invalidateSize(); });
      const status = document.getElementById('mapEngineStatus');
      if (status) status.textContent = '반경 5km · 숙소 ' + points.length + '곳 지도 핀 · 선택한 유형만 표시됩니다.';
      return true;
    } catch (error) {
      console.warn('여행갈지도 멀티핀 지도 오류', error);
      if (map) destroy();
      fallback();
      return false;
    }
  }
  window.addEventListener('hashchange', () => {
    if (!location.hash.startsWith('#map')) destroy();
  });
  window.YeohangMultiMap = { render, select, clearPins, destroy, validPoint, isReady: () => Boolean(map && container && container.isConnected) };
})();
