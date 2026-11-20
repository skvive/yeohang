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
  assert.equal(await mobile.page.locator('.v3-destination-card').count(),4);
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
