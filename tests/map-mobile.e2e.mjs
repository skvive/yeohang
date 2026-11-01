import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const base = process.env.MAP_E2E_URL || 'http://127.0.0.1:3000';
const shotDir = process.env.MAP_SCREENSHOT_DIR || 'test-results/map-mobile';
mkdirSync(shotDir, { recursive: true });
const asset = name => resolve(fileURLToPath(new URL('../node_modules/leaflet/dist/', import.meta.url)), name);
const hotels = [
  { id: 'h1', name: '가락 관광 호텔', city: '서울', category: '호텔', stay_type: 'hotel', distance_km: 0.3, lat: 37.4933, lng: 127.1180, image_url: '/assets/listing-1.webp', source: 'agoda' },
  { id: 'm1', name: '가락 모텔', city: '서울', category: '모텔', stay_type: 'motel', distance_km: 0.6, lat: 37.4942, lng: 127.1225, image_url: '/assets/listing-1.webp', source: 'agoda' },
  { id: 'p1', name: '송파 프라이빗 하우스', city: '서울', category: '프라이빗 하우스', stay_type: 'private', distance_km: 1.2, lat: 37.4970, lng: 127.1270, image_url: '/assets/listing-1.webp', source: 'agoda' }
];
const browser = await chromium.launch({ headless: true });
async function makePage(gps = false) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    ...(gps ? { permissions: ['geolocation'], geolocation: { latitude: 37.4900, longitude: 127.1190 } } : {})
  });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\/api\/map\?/, async route => {
    const u = new URL(route.request().url);
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
  await page.route(/\/api\/auth\/status(?:\?|$)/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, google_configured: false }) }));
  await page.route('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js', route => route.fulfill({ path: asset('leaflet.js'), contentType: 'application/javascript' }));
  await page.route('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css', route => route.fulfill({ path: asset('leaflet.css'), contentType: 'text/css' }));
  await page.route(/https:\/\/tile\.openstreetmap\.org\//, route => route.fulfill({ status: 204, body: '' }));
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
  await page.screenshot({ path: resolve(shotDir, 'garak-map-390px.png'), fullPage: true });
  assert.equal(errors.length, 0, 'no JavaScript page error: ' + errors.join('; '));
  await context.close();

  const gpsRun = await makePage(true);
  await gpsRun.page.waitForFunction(() => document.querySelector('#mapGeoStatus')?.textContent.includes('내 위치 주변'), { timeout: 25000 });
  assert.ok(gpsRun.requests.some(req => req.origin === 'gps'), 'granted GPS should be used only after permission is checked');
  await gpsRun.page.screenshot({ path: resolve(shotDir, 'gps-map-390px.png'), fullPage: true });
  assert.equal(gpsRun.errors.length, 0, 'GPS scenario page errors: ' + gpsRun.errors.join('; '));
  await gpsRun.context.close();
  console.log('PASS: real mobile browser filter interaction, map markers, no-GPS fallback, granted GPS');
} finally {
  await browser.close();
}
