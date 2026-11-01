import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
const root = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('V9 navigation controller parses and does not replace 5 km server filtering', () => {
  assert.doesNotThrow(() => new Script(root('public/navigation-v9.js')));
  assert.doesNotThrow(() => new Script(root('public/app.js')));
  const source = root('public/app.js');
  assert.match(source, /mapSearchQuery:''/);
  assert.match(source, /window\.YeohangNavigation=Object\.freeze/);
  assert.match(source, /https:\/\/map\.kakao\.com\/link\/to\//);
  assert.match(source, /state\.mapPins=\(r\.pins\|\|\[\]\)\.filter\(p=>Number\.isFinite\(p\.distance_km\)&&p\.distance_km<=5\)/);
  assert.match(source, /origin=city\?'region':state\.userLoc\?'gps':'default'/);
});
test('V9 UI keeps mascot branding and existing filters', () => {
  const source = root('public/navigation-v9.js');
  assert.match(source, /mascot-jido\.webp/);
  assert.match(source, /mascot-gilbyeoli\.webp/);
  assert.match(source, /\[data-mapcategory="all"\]/);
  assert.match(source, /\[data-near\]/);
  assert.match(source, /aria-label="주변 숙소 검색"/);
});
test('V9 Android wrapper does not request background location or embed production secrets', () => {
  const manifest = root('android-app/app/src/main/AndroidManifest.xml');
  const java = root('android-app/app/src/main/java/site/lexid/yeohangnav/MainActivity.java');
  assert.doesNotMatch(manifest, /ACCESS_BACKGROUND_LOCATION/);
  assert.match(java, /site\.lexid\.yeohangnav/);
  assert.match(java, /yeohang\.lexid\.site/);
  assert.match(java, /MIXED_CONTENT_NEVER_ALLOW/);
  assert.match(java, /getHost\(\)/);
  assert.doesNotMatch(java, /addJavascriptInterface/);
});

test('Android offline UI is native and WebView error cannot be misread as loaded', () => {
 const java = root('android-app/app/src/main/java/site/lexid/yeohangnav/MainActivity.java');
 assert.match(java, /if\(pageFailed\) return/);
 assert.match(java, /request\.isForMainFrame\(\)/);
 assert.match(java, /NAV_PAGE_FAILED/);
 assert.match(java, /NAV_MAP_SURFACE_READY/);
 assert.match(java, /NAV_TLS_ERROR/);
 assert.match(java, /handler\.cancel\(\)/);
 assert.match(java, /mascot-jido\.webp/);
 assert.match(java, /지도 다시 연결/);
 assert.doesNotMatch(java, /addJavascriptInterface/);
});
test('CI live map verification is a separate gate from Android package build', () => {
 const yaml = root('.github/workflows/navigation-v9-android.yml');
 assert.match(yaml, /NAV_MAP_SURFACE_READY/);
 assert.match(yaml, /network_or_http_blocked/);
 assert.doesNotMatch(yaml, /continue-on-error: true/);
});

test('Kakao map provider is strictly opt-in, valid JS, and preserves default Leaflet renderer', () => {
 const source = root('public/map-kakao-provider.js');
 assert.doesNotThrow(() => new Script(source));
 const original={render(){return true;},validPoint(){return true;}};
 const window={YeohangMultiMap:original};
 const document={querySelector(){return null;}};
 new Script(source).runInNewContext({window,document});
 assert.equal(window.YeohangMultiMap,original);
 assert.match(source, /https:\/\/dapi\.kakao\.com\/v2\/maps\/sdk\.js/);
 assert.match(source, /script\.onload/);
 assert.match(source, /setTimeout\(\(\)=>finish\(false\)/);
 assert.match(source, /Number\(p\.distance_km\)<=5/);
 assert.match(source, /document\.createElement\('button'\)/);
 assert.match(source, /label\.textContent=/);
 assert.doesNotMatch(source, /innerHTML\s*=/);
 const layout=root('app/layout.tsx');
 assert.match(layout, /NEXT_PUBLIC_KAKAO_MAP_JS_KEY/);
 assert.match(layout, /map-kakao-provider\.css/);
});
