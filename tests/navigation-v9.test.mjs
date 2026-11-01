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
