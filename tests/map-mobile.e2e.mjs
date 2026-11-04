import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const base = process.env.MAP_E2E_URL || 'http://127.0.0.1:3000';
const shotDir = process.env.MAP_SCREENSHOT_DIR || 'test-results/map-mobile';
mkdirSync(shotDir, { recursive: true });
const asset = name => resolve(fileURLToPath(new URL('../node_modules/leaflet/dist/', import.meta.url)), name);
// Synthetic QA-only map tiles keep visual tests deterministic without claiming
// that the CI screenshot contains live OpenStreetMap imagery.
const fixtureTile = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect width="256" height="256" fill="#e8eee6"/>
<path d="M12 0H107L140 80 96 160H0V85Z M196 0H256V90L208 123 163 86Z M116 180L174 156 220 256H77Z" fill="#c7e6c4"/>
<path d="M0 62H256 M0 184H256 M60 0V256 M196 0V256" stroke="#c5d5d2" stroke-width="19"/>
<path d="M0 62H256 M0 184H256 M60 0V256 M196 0V256" stroke="#fffef7" stroke-width="15"/>
<path d="M0 114H256 M120 0V256" stroke="#dde2d7" stroke-width="9"/>
<path d="M0 114H256 M120 0V256" stroke="#fffef7" stroke-width="6"/>
<path d="M0 225H256" stroke="#b4c8d9" stroke-width="10"/>
<path d="M0 225H256" stroke="#b4e3f4" stroke-width="6"/>
<text x="13" y="245" font-family="sans-serif" font-size="10" fill="#66827b">CI MAP FIXTURE · NOT LIVE TILES</text>
</svg>`;
const hotels = [
  { id: 'h1', name: '가락 관광 호텔', city: '서울', category: '호텔', stay_type: 'hotel', distance_km: 0.3, lat: 37.4933, lng: 127.1180, image_url: '/assets/listing-1.webp', source: 'agoda' },
  { id: 'm1', name: '가락 모텔', city: '서울', category: '모텔', stay_type: 'motel', distance_km: 0.6, lat: 37.4942, lng: 127.1225, image_url: '/assets/listing-1.webp', source: 'agoda' },
  { id: 'p1', name: '송파 프라이빗 하우스', city: '서울', category: '프라이빗 하우스', stay_type: 'private', distance_km: 1.2, lat: 37.4970, lng: 127.1270, image_url: '/assets/listing-1.webp', source: 'agoda' }
];
const browser = await chromium.launch({ headless: true });
async function makePage(gps = false, brokenTiles = false) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    ...(gps ? { permissions: ['geolocation'], geolocation: { latitude: 37.4900, longitude: 127.1190 } } : {})
  });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\/api\/map\?/, async route => {
    const u = new URL(route.request().url());
    const category = u.searchParams.get('category') || 'all';
    const origin = u.searchParams.get('origin') || 'default';
    const pins = category === 'all' ? hotels : hotels.filter(x => x.stay_type === category);
    requests.push({ category, origin, lat: Number(u.searchParams.get('lat')), lng: Number(u.searchParams.get('lng')) });
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ pins, category, origin, count: pins.length, max_results: 80, radius_km: 5 })
    });
  });
  await page.route(/\/api\/home(?:\?|$)/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], coupons: [], plans: [] }) }));
  await page.route(/\/api\/auth\/(?:get-session|session|token)(?:[/?]|$)/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session: null, user: null }) }));
  await page.route(/\/api\/auth\/status(?:\?|$)/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, google_configured: false }) }));
  await page.route('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js', route => route.fulfill({ path: asset('leaflet.js'), contentType: 'application/javascript' }));
  await page.route('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css', route => route.fulfill({ path: asset('leaflet.css'), contentType: 'text/css' }));
  await page.route(/https:\/\/tile\.openstreetmap\.org\//, route => route.fulfill(brokenTiles ? { status: 404, body: '' } : { status: 200, body: fixtureTile, contentType: 'image/svg+xml' }));
  await page.route(/https:\/\/maps\.google\.com\//, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>지도 예비화면</title>' }));
  await page.goto(base + '/#map', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('#mapGeoStatus').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('#mapGeoStatus')?.textContent.includes('반경 5km'), { timeout: 25000 });
  return { context, page, errors, requests };
}
async function markerCount(page) {
  return page.locator('#multiStayMap .ym-marker').count();
}
try {
  const { context, page, errors, requests } = await makePage(false);
  assert.equal(requests[0].origin, 'default');
  assert.ok(Math.abs(requests[0].lat - 37.493060) < 0.0001, 'no GPS defaults to Garak Market Station');
  assert.ok(Math.abs(requests[0].lng - 127.118060) < 0.0001);
  await page.waitForFunction(() => document.querySelectorAll('#multiStayMap .ym-marker').length === 3);
  assert.equal(await markerCount(page), 3);
  await page.locator('[data-mapcategory="motel"]').click();
  await page.waitForFunction(() => document.querySelector('#mapGeoStatus')?.textContent.includes('모텔 1곳'));
  await page.waitForFunction(() => document.querySelectorAll('#multiStayMap .ym-marker').length === 1);
  assert.equal((await page.locator('#multiStayMap .ym-marker').allTextContents()).join(''), '🛏️');
  assert.equal(requests.at(-1).category, 'motel');
  await page.locator('[data-mapcategory="private"]').click();
  await page.waitForFunction(() => document.querySelector('#mapGeoStatus')?.textContent.includes('프라이빗 하우스 1곳'));
  assert.equal((await page.locator('#multiStayMap .ym-marker').allTextContents()).join(''), '🏠');
  await page.locator('[data-mapcategory="all"]').click();
  await page.waitForFunction(() => document.querySelector('#mapGeoStatus')?.textContent.includes('전체 3곳'));
  assert.equal(await markerCount(page), 3);
  // Diagnose map-tile sources independently from mock API pins; an image background is not a verified live map.
  const tiles = await page.locator('#multiStayMap .leaflet-tile').evaluateAll(nodes =>
    nodes.slice(0, 6).map(node => ({ src: node.currentSrc || node.src, width: node.naturalWidth, height: node.naturalHeight }))
  );
  console.log('MAP_TILE_DIAGNOSTIC', JSON.stringify(tiles));
  assert.ok(tiles.length > 0 && tiles.some(tile => tile.width === 256 && tile.height === 256), 'CI map must load visible map-shaped fixture tiles');
  assert.ok(tiles.every(tile => !tile.src.includes('/assets/hero.webp')), 'map tiles must not be replaced by hotel photos');
  const mobileLayout = await page.evaluate(() => {
    const map = document.querySelector('#mapCanvas').getBoundingClientRect();
    const controls = document.querySelector('.y-nav-float').getBoundingClientRect();
    const bottom = document.querySelector('.y-nav-bottom').getBoundingClientRect();
    return { mapTop: map.top, controlBottom: controls.bottom, bottomTop: bottom.top };
  });
  console.log('MOBILE_NAV_LAYOUT', JSON.stringify(mobileLayout));
  assert.ok(mobileLayout.mapTop < 490, 'mobile map should begin above the lower half of the first screen');
  assert.ok(mobileLayout.controlBottom < mobileLayout.bottomTop - 8, 'map floating controls must not overlap fixed bottom navigation');
  await page.screenshot({ path: resolve(shotDir, 'garak-map-390px.png'), fullPage: true });
  const mapErrors = errors.filter(message => /TypeError|ReferenceError|YeohangMultiMap|leaflet|map-multipin|app\.js/i.test(message));
  assert.equal(mapErrors.length, 0, 'no map JavaScript errors: ' + mapErrors.join('; '));
  if(errors.length)console.warn('Non-map authentication test-environment errors:', errors);
  // The brand hero and its actual generated PNG must load at a 390 px mobile width.
  await page.goto(base + '/#home', { waitUntil: 'domcontentloaded' });
  await page.locator('.hero.brand-hero').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.hero-logo-stage img').waitFor({ state: 'visible', timeout: 15000 });
  assert.ok(await page.locator('.hero-logo-stage img').evaluate(img => img.complete && img.naturalWidth > 0), 'new hero logo must load');
  await page.screenshot({ path: resolve(shotDir, 'home-brand-390px.png'), fullPage: true });
  await context.close();

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const desktop = await desktopContext.newPage();
  await desktop.route(/\/api\/home(?:\?|$)/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], coupons: [], plans: [] }) }));
  await desktop.goto(base + '/#home', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await desktop.locator('.hero.brand-hero').waitFor({ state: 'visible', timeout: 15000 });
  await desktop.screenshot({ path: resolve(shotDir, 'home-brand-1440px.png'), fullPage: true });
  await desktopContext.close();

  const gpsRun = await makePage(true);
  await gpsRun.page.waitForFunction(() => document.querySelector('#mapGeoStatus')?.textContent.includes('내 위치 주변'), { timeout: 25000 });
  assert.ok(gpsRun.requests.some(req => req.origin === 'gps'), 'granted GPS should be used only after permission is checked');
  await gpsRun.page.screenshot({ path: resolve(shotDir, 'gps-map-390px.png'), fullPage: true });
  const gpsMapErrors = gpsRun.errors.filter(message => /TypeError|ReferenceError|YeohangMultiMap|leaflet|map-multipin|app\.js/i.test(message));
  assert.equal(gpsMapErrors.length, 0, 'GPS map errors: ' + gpsMapErrors.join('; '));
  await gpsRun.context.close();

  // Actual tile-server failures must not paint repeated hotel photos over the map.
  const failure = await makePage(false, true);
  await failure.page.waitForFunction(() => document.querySelectorAll('#multiStayMap .leaflet-tile').length > 0);
  await failure.page.waitForTimeout(600);
  const failedTileSources = await failure.page.locator('#multiStayMap .leaflet-tile').evaluateAll(nodes => nodes.map(node => node.currentSrc || node.src));
  assert.ok(failedTileSources.length > 0);
  assert.ok(failedTileSources.every(src => !src.includes('/assets/hero.webp')), 'failed tile imagery must never switch to hotel photo fallback');
  await failure.context.close();
  console.log('PASS: mobile layout, map markers, fixture tiles, failed-tile isolation, filters and GPS');
} finally {
  await browser.close();
}
