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
    { id: 'hotel-1', name: '서울 호텔', lat: 37.55, lng: 126.97, stay_type: 'hotel' },
    { id: 'motel-2', name: '강서 모텔', lat: 37.56, lng: 126.96, stay_type: 'motel' },
    { id: 'private-3', name: '<img src=x onerror=alert(1)>', lat: 37.57, lng: 126.98, stay_type: 'private' }
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
