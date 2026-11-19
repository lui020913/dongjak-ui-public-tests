import { test, expect } from '@playwright/test';
import { openMapPage, navTab } from './helpers.js';

test('mobile pill/route/community clearance, AI orb, and night overlay no blur',async({page})=>{
  test.setTimeout(240000);
  await openMapPage(page);
  const app=page.locator('#app');
  const orb=page.locator('#dj890-ai-orb');
  await expect(orb).toBeVisible();
  await expect(page.locator('#theme-toggle')).toBeHidden();
  await expect(page.locator('#dj887-ai-quick-entry')).toBeHidden();
  const label=orb.locator('.dj890-ai-orb-text');
  await expect(label).toHaveText('AI');
  const motion=await label.evaluate(node=>getComputedStyle(node).animationName);
  expect(motion==='dj890-ai-green-cycle'||motion==='none').toBeTruthy();

  // The new circle proxies the original AI feature; no duplicate modal.
  await orb.click({noWaitAfter:true,timeout:25000});
  await expect(page.locator('#dj-ai-search-modal')).toBeVisible({timeout:20000});
  await page.locator('#dj-ai-search-modal .dj-ai-close').click({noWaitAfter:true});
  await expect(page.locator('#dj-ai-search-modal')).toBeHidden({timeout:20000});

  const gap=async(selector)=>page.evaluate((id)=>{
    const sheet=document.querySelector(id);
    const dock=document.getElementById('bottom-nav');
    if(!sheet||!dock)throw new Error('missing sheet/nav '+id);
    const s=sheet.getBoundingClientRect(),n=dock.getBoundingClientRect();
    return Number((n.top-s.bottom).toFixed(2));
  },selector);
  // Always measure actual mobile pixels, not CSS token equality.
  const tip=page.locator('#dj840-map-tip');
  await expect(tip).toBeVisible({timeout:20000});
  const pillGap=await gap('#dj840-map-tip');
  expect(pillGap).toBeGreaterThanOrEqual(17);
  expect(pillGap).toBeLessThan(55);

  await navTab(page,'route').click({noWaitAfter:true,timeout:25000});
  await expect(app).toHaveAttribute('data-tab','route');
  await expect(page.locator('#route-panel')).toBeVisible({timeout:25000});
  await expect.poll(()=>gap('#route-panel'),{timeout:20000}).toBeGreaterThanOrEqual(13);
  const routeGap=await gap('#route-panel');
  expect(routeGap).toBeLessThan(56);

  await navTab(page,'participate').click({noWaitAfter:true,timeout:25000});
  await expect(app).toHaveAttribute('data-tab','participate');
  await expect(page.locator('#participation-panel')).toBeVisible({timeout:25000});
  await expect.poll(()=>gap('#participation-panel'),{timeout:20000}).toBeGreaterThanOrEqual(13);
  const communityGap=await gap('#participation-panel');
  expect(communityGap).toBeLessThan(56);
  expect(Math.abs(communityGap-routeGap)).toBeLessThanOrEqual(5);
  console.log('MOBILE BOTTOM GAPS',JSON.stringify({pillGap,routeGap,communityGap}));

  await navTab(page,'map').click({noWaitAfter:true,timeout:25000});
  const night=page.locator('#dj-v794-night');
  await expect(night).toBeVisible({timeout:20000});
  await night.click({noWaitAfter:true,timeout:25000});
  const modal=page.locator('#dj833-night-modal');
  await expect(modal).toBeVisible({timeout:20000});
  const filter=await modal.evaluate(n=>({
    webkit:getComputedStyle(n).webkitBackdropFilter,
    standard:getComputedStyle(n).backdropFilter,
    bg:getComputedStyle(n).backgroundColor
  }));
  expect(filter.standard).toBe('none');
  // Chromium does not always expose the vendor-prefixed property. On WebKit,
  // if exposed, it must also be none; undefined is not a blur regression.
  if(typeof filter.webkit==='string')expect(filter.webkit).toBe('none');
  await modal.locator('[data-choice="no"]').click({noWaitAfter:true});
  await expect(modal).toBeHidden();
});
