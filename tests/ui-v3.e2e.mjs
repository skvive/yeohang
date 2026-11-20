import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.MAP_E2E_URL || 'http://127.0.0.1:3000';
const output = process.env.UI_V3_SCREENSHOT_DIR || 'test-results/ui-v3';
mkdirSync(output, { recursive:true });
const browser = await chromium.launch({ headless:true, channel:process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined });

async function openHome(width,height){
  const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(/\/api\/home(?:\?|$)/,r=>r.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({results:[],sponsored:[],coupons:[],plans:[]})
  }));
  await page.route(/\/api\/auth\/status(?:\?|$)/,r=>r.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({authenticated:false,google_configured:false})
  }));
  await page.route(/\/api\/search(?:\?|$)/,r=>r.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({results:[],sponsored:[],coupons:[],count:0,engine:'rules',interpretation:{},disclosure:''})
  }));
  await page.goto(base+'/#home',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('.v3-quick-action').first().waitFor({state:'visible',timeout:20000});
  return {context,page,errors};
}
try{
  const mobile=await openHome(390,844);
  assert.equal(await mobile.page.locator('.v3-quick-action').count(),5);
  const quickTop=await mobile.page.locator('.v3-quick-section').evaluate(el=>el.getBoundingClientRect().top);
  assert.ok(quickTop<790,'home quick actions should begin within the initial mobile viewport: '+quickTop);
  assert.equal(await mobile.page.locator('.v3-destination-card').count(),4);

  const font = await mobile.page.locator('.brand-hero h1 em').evaluate(el=>getComputedStyle(el).fontFamily);
  assert.match(font,/Noto Sans KR/,'hero Korean text must not use Latin-only font');
  const headline = await mobile.page.locator('.brand-hero h1 em').innerText();
  assert.match(headline,/어디로 여행갈지도/);

  const tabs=mobile.page.locator('.v3-mobile-tabs a');
  assert.equal(await tabs.count(),5);
  for(const element of await tabs.all()){
    assert.ok(await element.isVisible(),'mobile tabs visible');
    const b=await element.boundingBox();
    assert.ok(b&&b.height>=44,'mobile tab hit area at least 44px');
  }
  await mobile.page.screenshot({path:resolve(output,'home-390.png')});
  await mobile.page.locator('.v3-quick-action[href="#planner"]').click();
  await mobile.page.locator('#tripPlannerForm').waitFor({state:'visible',timeout:10000});
  await mobile.page.selectOption('#tripPlannerForm [name=region]','부산');
  await mobile.page.selectOption('#tripPlannerForm [name=days]','2');
  await mobile.page.selectOption('#tripPlannerForm [name=theme]','맛집·시장');
  const h=await mobile.page.locator('#tripPlannerForm button[type=submit]').evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(h>=48,'planner CTA at least 48px');
  await mobile.page.locator('#tripPlannerForm button[type=submit]').click();
  assert.equal(await mobile.page.locator('#tripPlanStops li').count(),2);
  assert.match(await mobile.page.locator('#tripPlanTitle').innerText(),/부산/);
  await mobile.page.screenshot({path:resolve(output,'planner-390.png')});
  await mobile.page.reload({waitUntil:'domcontentloaded'});
  await mobile.page.locator('#tripPlanResult').waitFor({state:'visible',timeout:20000});
  assert.equal(await mobile.page.locator('#tripPlanStops li').count(),2,'trip plan saved in local browser');
  assert.deepEqual(mobile.errors.filter(e=>/SyntaxError|ReferenceError|TypeError|app\.js/.test(e)),[]);

  // Both navigation providers are a user choice, not a hard-coded single vendor.
  // Mock only external Google Maps navigation here; no location permission is granted.
  await mobile.context.route('https://www.google.com/maps/dir/**',route=>route.fulfill({
    status:200,contentType:'text/html',body:'<!doctype html><title>Google Maps route fixture</title>'
  }));
  await mobile.page.goto(base+'/#nav',{waitUntil:'domcontentloaded'});
  const providers=mobile.page.locator('[data-nav-provider]');
  await providers.first().waitFor({state:'visible',timeout:15000});
  assert.equal(await providers.count(),2);
  assert.equal(await mobile.page.locator('[data-nav-provider="kakao"]').getAttribute('aria-pressed'),'true','default maintains existing Kakao Navi');
  await mobile.page.locator('[data-nav-provider="google"]').click();
  assert.equal(await mobile.page.locator('[data-nav-provider="google"]').getAttribute('aria-pressed'),'true');
  assert.equal(await mobile.page.locator('[data-nav-provider="kakao"]').getAttribute('aria-pressed'),'false');
  assert.ok(await mobile.page.locator('#googleStayMap').isVisible(),'Google preview becomes visible');
  assert.ok(await mobile.page.locator('#multiStayMap').isHidden(),'non-Google preview is hidden');

  const mapTop=await mobile.page.locator('#mapCanvas').evaluate(el=>el.getBoundingClientRect().top);
  assert.ok(mapTop<730,'mobile navigation must show the map above the bottom navigation: '+mapTop);

  await mobile.page.locator('#carNavDestination').fill('서울역');
  const googlePopup=mobile.page.waitForEvent('popup',{timeout:15000});
  await mobile.page.locator('#carNavForm button[type="submit"]').click();
  const routePage=await googlePopup;
  await routePage.waitForURL(/www\.google\.com\/maps\/dir\//,{timeout:10000});
  const url=new URL(routePage.url());
  assert.equal(url.searchParams.get('destination'),'서울역');
  assert.equal(url.searchParams.get('travelmode'),'driving');
  assert.equal(url.searchParams.get('dir_action'),'navigate');
  await routePage.close();
  await mobile.page.screenshot({path:resolve(output,'google-provider-390.png')});
  await mobile.page.reload({waitUntil:'domcontentloaded'});
  await mobile.page.locator('[data-nav-provider="google"]').waitFor({state:'visible'});
  assert.equal(await mobile.page.locator('[data-nav-provider="google"]').getAttribute('aria-pressed'),'true','provider persists through reload');
  await mobile.page.locator('[data-nav-provider="kakao"]').click();
  assert.equal(await mobile.page.locator('[data-nav-provider="kakao"]').getAttribute('aria-pressed'),'true','can return to Kakao Navi');
  assert.match(await mobile.page.locator('#carNavForm button[type=submit]').innerText(),/카카오내비/);
  await mobile.page.screenshot({path:resolve(output,'kakao-provider-390.png')});

  await mobile.context.close();

  const desktop=await openHome(1440,900);
  assert.ok(await desktop.page.locator('#mainNav').isVisible());
  assert.equal(await desktop.page.locator('.v3-quick-action').count(),5);
  assert.ok(await desktop.page.locator('.v3-more-nav summary').isVisible());
  await desktop.page.screenshot({path:resolve(output,'home-1440.png')});
  assert.deepEqual(desktop.errors.filter(e=>/SyntaxError|ReferenceError|TypeError|app\.js/.test(e)),[]);
  await desktop.context.close();
  console.log('PASS UI v3 390px and 1440px browser journey');
} finally {await browser.close()}
