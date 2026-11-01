import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';

const read = (name) => readFileSync(new URL('../public/' + name, import.meta.url), 'utf8');

test('SPA and multi-map code parse without browser execution', () => {
  assert.doesNotThrow(() => new Script(read('app.js')));
  assert.doesNotThrow(() => new Script(read('map-multipin.js')));
});

test('SPA wires filtered map and fallback without deleting the existing map', () => {
  const source = read('app.js');
  assert.match(source, /id="multiStayMap"/);
  assert.match(source, /id="googleStayMap"/);
  assert.match(source, /YeohangMultiMap\.render/);
  assert.match(source, /onSelect:\(id,fromMap\)/);
  assert.match(source, /props\.slice\(0,80\)/);
  assert.match(source, /mapCategoryControls\(\)/);
});

function mockNode(tag) {
  return {
    tag, children: [], className: '', textContent: '', hidden: false,
    isConnected: true, classList: { add() {}, remove() {} },
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); },
    addEventListener(name, handler) { this[name] = handler; }
  };
}
function fakeLeaflet() {
  const markers = [];
  const map = {
    layers: [], setView() { return this; }, remove() {},
    removeLayer() {}, panTo() {}, fitBounds() {}, invalidateSize() {}
  };
  const group = { clearLayers() { markers.length = 0; }, addTo() { return this; } };
  return {
    map() { return map; }, tileLayer() { return { addTo() {} }; },
    layerGroup() { return group; }, divIcon(props) { return props; },
    marker([lat, lng], opts) {
      const marker = {
        coords: [lat, lng], opts, events: {}, content: null,
        bindPopup(node) { this.content = node; return this; },
        on(name, fn) { this.events[name] = fn; return this; },
        addTo() { markers.push(this); return this; },
        getLatLng() { return this.coords; }, setIcon() {}, setZIndexOffset() {}, openPopup() {}
      };
      return marker;
    },
    circleMarker() { return { bindTooltip() { return this; }, addTo() { return this; } }; },
    circle() { return { addTo() { return this; } }; },
    latLngBounds() { return { extend() { return this; }, pad() { return this; } }; },
    __markers: markers
  };
}
function initialize() {
  const leaflet = fakeLeaflet();
  const nodes = {
    multiStayMap: mockNode('div'),
    googleStayMap: mockNode('iframe'),
    mapEngineStatus: mockNode('p')
  };
  const callbacks = {};
  const doc = {
    querySelector() { return null; },
    getElementById(id) { return nodes[id] || null; },
    createElement: mockNode,
    head: mockNode('head')
  };
  const location = { hash: '#map' };
  const window = {
    L: leaflet, YeohangGeo: { openDir: () => 'https://www.google.com/maps/dir/?api=1' },
    addEventListener(k, fn) { callbacks[k] = fn; }
  };
  runInNewContext(read('map-multipin.js'), {
    window, document: doc, location, console,
    requestAnimationFrame: (fn) => fn()
  });
  return { leaflet, nodes, window, location, callbacks };
}

test('all nearby pins are drawn and selecting a pin notifies the SPA', async () => {
  const { leaflet, window, nodes } = initialize();
  let selected = null;
  const pins = [
    { id: 'hotel-1', name: '서울 호텔', lat: 37.55, lng: 126.97, stay_type: 'hotel', distance_km: 0.5 },
    { id: 'motel-2', name: '강서 모텔', lat: 37.56, lng: 126.96, stay_type: 'motel', distance_km: 1.1 },
    { id: 'private-3', name: '<img src=x onerror=alert(1)>', lat: 37.57, lng: 126.98, stay_type: 'private', distance_km: 3.4 }
  ];
  const ok = await window.YeohangMultiMap.render({
    pins, center: { lat: 37.56, lng: 126.97 },
    selectedId: 'hotel-1', onSelect: (id) => { selected = id; }
  });
  assert.equal(ok, true);
  assert.equal(leaflet.__markers.length, 3);
  assert.equal(nodes.googleStayMap.hidden, true);
  assert.equal(window.YeohangMultiMap.select('motel-2'), true);
  leaflet.__markers[2].events.click();
  assert.equal(selected, 'private-3');
  assert.equal(leaflet.__markers[2].content.children[0].textContent,
    '<img src=x onerror=alert(1)>', 'untrusted names must use textContent');
});

test('invalid coordinates are excluded; empty results and navigation cleanup succeed', async () => {
  const { leaflet, window, location, callbacks } = initialize();
  const ok = await window.YeohangMultiMap.render({
    pins: [
      { id: 'outside', lat: 50, lng: 120, name: '한국 외부' },
      { id: 'bad', lat: 'oops', lng: 'invalid', name: '잘못된 좌표' }
    ],
    center: { lat: 37.5665, lng: 126.978 }, selectedId: ''
  });
  assert.equal(ok, true);
  assert.equal(leaflet.__markers.length, 0);
  location.hash = '#home';
  callbacks.hashchange();
  assert.equal(window.YeohangMultiMap.isReady(), false);
});

test('category buttons update all active states and trigger a fresh map request', () => {
  const source = read('app.js');
  const start = source.indexOf("target=e.target.closest('[data-mapcategory]')");
  const end = source.indexOf("target=e.target.closest('[data-mapcity]')", start);
  assert.ok(start > 0 && end > start, 'delegated category click handler exists');
  const handler = source.slice(start, end);
  assert.match(handler, /document\.querySelectorAll\('\[data-mapcategory\]'\)\.forEach/, 'must use a NodeList, not first element querySelector');
  const buttons = ['all', 'hotel', 'motel'].map(id => ({
    dataset: { mapcategory: id },
    classList: { active: false, toggle(k, value) { if (k === 'active') this.active = value; } },
    setAttribute(k, value) { this[k] = value; }
  }));
  const state = { mapCategory: 'all', mapSelected: 'old-pin', mapCenter: { lat: 37.493060, lng: 127.118060, city: '' } };
  const requests = [];
  const document = { querySelectorAll() { return buttons; } };
  const e = { target: { closest(selector) { return selector === '[data-mapcategory]' ? buttons[2] : null; } } };
  const f = new Function('e', 'MAP_STAY_CATEGORY_OPTIONS', 'state', 'document', 'GARAK_MARKET_STATION', 'loadGoogleMap', handler + '\nreturn null;');
  f(e, [['all'], ['hotel'], ['motel']], state, document, { lat: 37.493060, lng: 127.118060, city: '' },
    (...args) => requests.push(args));
  assert.equal(state.mapCategory, 'motel');
  assert.equal(state.mapSelected, '');
  assert.equal(buttons[2].classList.active, true);
  assert.equal(buttons[0].classList.active, false);
  assert.equal(buttons[1].classList.active, false);
  assert.equal(requests.length, 1, 'must re-fetch after chip selection');
});

test('different categories replace stale map pins and always respect a 5km radius', async () => {
  const { leaflet, window } = initialize();
  const nearby = [
    { id: 'hotel', name: '호텔', lat: 37.493, lng: 127.118, stay_type: 'hotel', distance_km: 0.3 },
    { id: 'too-far', name: '외곽', lat: 37.55, lng: 127.118, stay_type: 'hotel', distance_km: 6.2 }
  ];
  await window.YeohangMultiMap.render({ pins: nearby, center: { lat: 37.493060, lng: 127.118060 }, originLabel: '가락시장역 · 기본 위치' });
  assert.equal(leaflet.__markers.length, 1, 'outside-5km pins must be excluded');
  window.YeohangMultiMap.clearPins();
  assert.equal(leaflet.__markers.length, 0, 'previous category must disappear immediately');
  await window.YeohangMultiMap.render({
    pins: [{ id: 'motel', name: '모텔', lat: 37.493, lng: 127.119, stay_type: 'motel', distance_km: 0.2 }],
    center: { lat: 37.493060, lng: 127.118060 }, originLabel: '가락시장역 · 기본 위치'
  });
  assert.equal(leaflet.__markers.length, 1);
  assert.match(leaflet.__markers[0].opts.icon.html, /🛏️/);
  assert.equal(window.YeohangMultiMap.select('hotel'), false, 'old hotel pin must be gone');
});

test('5km server and no-GPS Garak station default are enforced', () => {
  const source = readFileSync(new URL('../lib/handler.ts', import.meta.url), 'utf8');
  assert.match(source, /37\.493060/);
  assert.match(source, /127\.118060/);
  assert.match(source, /distance_km_exact\s*<=\s*\$8::float8/);
  assert.match(source, /radiusKm\s*=\s*5/);
  assert.match(source, /origin\s*===\s*'gps'/);
  const client = read('app.js');
  assert.match(client, /GARAK_MARKET_STATION/);
  assert.match(client, /new URLSearchParams\(\{category,lat:String\(lat\),lng:String\(lng\),origin\}\)/);
});
