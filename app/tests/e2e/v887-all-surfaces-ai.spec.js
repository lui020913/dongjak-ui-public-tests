import {test,expect} from '@playwright/test';
import {openMapPage,navTab,clickRealPointer} from './helpers.js';

async function screenBox(page,locator){
  return locator.evaluate(n=>{const r=n.getBoundingClientRect();return {
    x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,
    opacity:Number(getComputedStyle(n).opacity),display:getComputedStyle(n).display
  };});
}
async function assertNoOverflow(page){
  const x=await page.evaluate(()=>({
    doc:document.documentElement.scrollWidth,viewport:innerWidth,
    app:document.getElementById('app')?.getBoundingClientRect().width
  }));
  expect(x.doc,JSON.stringify(x)).toBeLessThanOrEqual(x.viewport+3);
}
async function aiCycle(page){
  const button=page.locator('#dj887-ai-quick-entry');
  await expect(button).toBeVisible({timeout:12000});
  expect(await button.getAttribute('type')).toBe('button');
  expect(await button.getAttribute('aria-haspopup')).toBe('dialog');
  const search=page.locator('#map-quick-search-query');
  const native=page.locator('.map-quick-search-submit');
  const b=await screenBox(page,button);
  const a=await screenBox(page,search);
  const c=await screenBox(page,native);
  expect(b.width).toBeGreaterThanOrEqual(31);
  expect(a.width,'Ordinary place search must remain usable').toBeGreaterThanOrEqual(44);
  expect(b.x).toBeGreaterThanOrEqual(a.right-2);
  expect(c.x).toBeGreaterThanOrEqual(b.right-3);
  await clickRealPointer(page,button,'AI search launcher');
  const modal=page.locator('#dj-ai-search-modal');
  await expect(modal).toBeVisible({timeout:10000});
  await expect(page.locator('#dj-ai-query')).toBeFocused();
  await expect(page.locator('.dj-ai-examples button')).toHaveCount(3);
  await page.screenshot({path:'test-results/v887-ai-visible-'+(await page.evaluate(()=>innerWidth))+'.png'});
  await clickRealPointer(page,page.locator('.dj-ai-close'),'AI modal close');
  await expect(modal).toBeHidden({timeout:5000});
  // The dismissed modal must not leave an invisible overlay on the native search.
  await clickRealPointer(page,search,'native place search after AI close');
  await expect(search).toBeFocused();
  await page.keyboard.press('Escape');
  await assertNoOverflow(page);
}

for(const width of [375,390,430]){
  test('mobile '+width+' AI launcher, modal, native search and full navigation',async({page},testInfo)=>{
    test.skip(testInfo.project.name==='desktop','mobile-only audit');
    test.setTimeout(480000);
    await page.setViewportSize({width,height:844});
    await openMapPage(page);
    await aiCycle(page);
    const tabs={route:'route-panel',participate:'participation-panel',
      news:'news-panel',mine:'mine-panel'};
    for(const [key,id] of Object.entries(tabs)){
      console.log('V887_MOBILE_BEGIN',width,key);
      await clickRealPointer(page,navTab(page,key),'mobile '+width+' '+key+' tab');
      console.log('V887_MOBILE_CLICKED',width,key);
      await expect(page.locator('#app')).toHaveAttribute('data-tab',key);
      const panel=page.locator('#'+id);
      await expect(panel).toBeVisible({timeout:10000});
      const rect=await screenBox(page,panel);
      expect(rect.width).toBeGreaterThan(225);
      expect(rect.x).toBeGreaterThanOrEqual(-4);
      expect(rect.right).toBeLessThanOrEqual(width+4);
      // The measured DOM geometry already includes computed opacity. Avoid a
      // second expensive evaluate() on software-only Chromium when it is
      // already readable. A real 0-opacity frame must settle within a bounded
      // timeout instead of being treated as a successful open.
      console.log('V887_MOBILE_PANEL_GEOMETRY',width,key,JSON.stringify(rect));
      if(rect.opacity<=.70){
        await expect.poll(async()=>Number(await panel.evaluate(n=>getComputedStyle(n).opacity)),
          {timeout:45000,intervals:[300,750,1500,3000]}).toBeGreaterThan(.70);
      }
      await expect(panel.locator('.dj877-expand-button')).toHaveCount(0);
      const close=panel.locator('.dj-sheet-chrome-close');
      await expect(close).toBeVisible();
      const cr=await screenBox(page,close);
      expect(cr.width).toBeGreaterThanOrEqual(42);
      // Avoid screenshotting the live WebGL canvas after every tab switch.
      // Under software-rendered Chromium screenshot can stall with fonts loaded,
      // although DOM hit target, geometry and content assertions already pass.
      // Playwright retains a failure screenshot and trace for regressions.
    }
    await clickRealPointer(page,navTab(page,'map'),'return to map');
    await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
    await assertNoOverflow(page);
  });
}

for(const width of [1280,1440,1920]){
  test('desktop '+width+' AI search, native search and four primary panels',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop','desktop-only audit');
    test.setTimeout(330000);
    await page.setViewportSize({width,height:900});
    await openMapPage(page);
    await aiCycle(page);
    for(const key of ['route','participate','news','mine']){
      console.log('V887_DESKTOP_BEGIN',width,key);
      await clickRealPointer(page,navTab(page,key),'desktop '+width+' '+key+' tab');
      console.log('V887_DESKTOP_CLICKED',width,key);
      await expect(page.locator('#app')).toHaveAttribute('data-tab',key);
      await expect(page.locator('#'+({route:'route-panel',participate:'participation-panel',
        news:'news-panel',mine:'mine-panel'}[key]))).toBeVisible();
      // Avoid screenshotting the live WebGL canvas after every tab switch.
      // Under software-rendered Chromium screenshot can stall with fonts loaded,
      // although DOM hit target, geometry and content assertions already pass.
      // Playwright retains a failure screenshot and trace for regressions.
    }
    await clickRealPointer(page,navTab(page,'map'),'return to map');
    await assertNoOverflow(page);
  });
}

test('mobile WebKit surface motion, safety menu and subway controls',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='desktop','mobile-only audit');
  test.setTimeout(185000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  const safety=page.locator('#dj-v794-safety');
  await expect(safety).toBeVisible();
  const night=page.locator('#dj-v794-night');
  await expect(night).toBeVisible();
  const palette=await page.evaluate(()=>({
    safety:getComputedStyle(document.querySelector('#dj-v794-safety')).color,
    night:getComputedStyle(document.querySelector('#dj-v794-night')).color
  }));
  expect(palette.safety).not.toEqual(palette.night);
  await clickRealPointer(page,safety,'mobile safety shield');
  await expect(page.locator('#app')).toHaveClass(/map-safety-open/);
  await expect(page.locator('#map-safety-controls')).toBeVisible();
  await page.screenshot({path:'test-results/v887-mobile-safety.png'});
  await page.locator('#map-safety-close').click({noWaitAfter:true});
  await expect(page.locator('#app')).not.toHaveClass(/map-safety-open/);


  // The safety UI's dismissal and subway transport opening are separate
  // lifecycle transactions. Test each on a fresh app page to distinguish
  // a broken subway opener from an asynchronous safety-menu exit.
});

test('mobile direct subway open / previous-current-next pill / close',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='desktop','mobile-only audit');
  test.setTimeout(125000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  // Reuse the same transport event as existing checked-in regression tests.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{
    detail:{place:{kind:'subway',name:'이수',lng:126.981605,lat:37.485196,
      lines:['4호선','7호선'],selectedLine:'7호선'}}
  })));
  const sheet=page.locator('#transport-sheet');
  await expect(sheet).toBeVisible({timeout:20000});
  await expect(sheet.locator('.metro-neighbor-row')).toBeVisible({timeout:20000});
  // CSS geometry and the real close interaction are asserted; no live WebGL screenshot.
  const pill=sheet.locator('.metro-neighbor-row').first();
  const radius=await pill.evaluate(n=>parseFloat(getComputedStyle(n).borderTopLeftRadius));
  expect(radius).toBeGreaterThanOrEqual(20);
  const close=page.locator('#transport-close');
  await close.click({noWaitAfter:true});
  await expect(sheet).toBeHidden({timeout:10000});
  await expect(page.locator('#dj887-ai-quick-entry')).toBeVisible();
  await aiCycle(page);
});
