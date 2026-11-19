import {test,expect} from '@playwright/test';
import {openMapPage} from './helpers.js';

test('mobile unified HUD, transparent circular home icon, and repeatable AI modal',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile','Mobile-only toolbar and dialog');
  test.setTimeout(240000);
  await openMapPage(page);
  const orb=page.locator('#dj890-ai-orb');
  await expect(orb).toBeVisible({timeout:45000});
  const home=page.locator('#dj-settings-mobile');
  await expect(home).toBeVisible({timeout:45000});
  const logo=home.locator('img');
  await expect(logo).toHaveAttribute('src','/icons/dongjak-nav-transparent.png',{timeout:20000});
  await expect.poll(()=>logo.evaluate(i=>i.complete?i.naturalWidth:0),{timeout:20000}).toBe(192);
  const header=await page.evaluate(()=>{
    const rect=id=>document.querySelector(id)?.getBoundingClientRect();
    const r=rect('#dj-settings-mobile'),s=rect('#map-quick-search'),a=rect('#dj890-ai-orb');
    return {logoSize:r.width,searchGap:s.left-r.right,aiGap:a.left-s.right,
      radius:getComputedStyle(document.getElementById('dj-settings-mobile')).borderTopLeftRadius,
      iconWidth:document.querySelector('#dj-settings-mobile img').getBoundingClientRect().width};
  });
  console.log('V891 HEADER',JSON.stringify(header));
  expect(header.logoSize).toBeGreaterThanOrEqual(43);
  expect(header.iconWidth).toBeLessThanOrEqual(35);
  expect(header.searchGap).toBeGreaterThanOrEqual(5);
  expect(header.searchGap).toBeLessThanOrEqual(16);
  expect(Math.abs(header.searchGap-header.aiGap)).toBeLessThanOrEqual(5);
  expect(parseFloat(header.radius)).toBeGreaterThanOrEqual(20);
  // App map is asynchronous: the already-existing TIP will only appear when
  // no other sheet/overlay is obscuring the map. The pair must never overlap.
  const tip=page.locator('#dj840-map-tip');
  await expect(tip).toBeVisible({timeout:45000});
  const scale=page.locator('#map .maplibregl-ctrl-bottom-left');
  await expect(scale).toBeVisible({timeout:45000});
  await expect.poll(()=>page.evaluate(()=>{
    const t=document.getElementById('dj840-map-tip'),s=document.querySelector('#map .maplibregl-ctrl-bottom-left');
    return t&&s&&Math.abs(t.getBoundingClientRect().top-s.getBoundingClientRect().top)<=3;
  }),{timeout:20000,intervals:[400,800]}).toBe(true);
  const hud=await page.evaluate(()=>{
    const t=document.getElementById('dj840-map-tip').getBoundingClientRect();
    const s=document.querySelector('#map .maplibregl-ctrl-bottom-left').getBoundingClientRect();
    const d=document.getElementById('bottom-nav').getBoundingClientRect();
    return {tipTop:t.top,scaleTop:s.top,tipHeight:t.height,scaleHeight:s.height,
      gap:t.left-s.right,navClearance:d.top-Math.max(t.bottom,s.bottom)};
  });
  console.log('V891 HUD',JSON.stringify(hud));
  expect(Math.abs(hud.tipTop-hud.scaleTop)).toBeLessThanOrEqual(3);
  expect(hud.gap).toBeGreaterThanOrEqual(6);
  expect(hud.gap).toBeLessThanOrEqual(13);
  expect(hud.navClearance).toBeGreaterThanOrEqual(9);
  expect(hud.tipHeight).toBe(36);
  await orb.click({noWaitAfter:true});
  const dialog=page.locator('#dj-ai-search-modal');
  await expect(dialog).toBeVisible({timeout:25000});
  expect(await page.evaluate(()=>document.activeElement?.id)).not.toBe('dj-ai-query');
  const input=dialog.locator('#dj-ai-query');
  await input.click();
  await expect(input).toBeFocused();
  await dialog.locator('.dj-ai-close').click({noWaitAfter:true});
  await expect(dialog).toBeHidden({timeout:20000});
  await orb.click({noWaitAfter:true});
  await expect(dialog).toBeVisible({timeout:20000});
});
