import {test, expect} from '@playwright/test';
import {openMapPage, navTab, clickRealPointer} from './helpers.js';

test('mobile 390 typography rapid repeated changes do not lock input',async({page})=>{
  test.setTimeout(210000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  await navTab(page,'mine').click({noWaitAfter:true});
  const panel=page.locator('#mine-panel');
  await panel.locator('[data-dj834-action="type"]').click({noWaitAfter:true});
  const detail=panel.locator('.dj834-my-detail');
  await expect(detail).toBeVisible();
  const sizes=['small','normal','large','xlarge','large','normal','xlarge','small','large','normal'];
  for(const value of sizes){
    const button=detail.locator('[data-dj885-type="scale"][data-value="'+value+'"]');
    await button.click({noWaitAfter:true});
    await expect(button).toHaveAttribute('aria-pressed','true');
  }
  for(const value of ['bold','normal','bold','normal']){
    const button=detail.locator('[data-dj885-type="weight"][data-value="'+value+'"]');
    await button.click({noWaitAfter:true});
    await expect(button).toHaveAttribute('aria-pressed','true');
  }
  for(let i=0;i<3;i++){
    await detail.locator('.dj834-detail-back').click({noWaitAfter:true});
    await expect(detail).toBeHidden();
    await panel.locator('[data-dj834-action="type"]').click({noWaitAfter:true});
    await expect(detail).toBeVisible();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
  // Return preferences to default to keep later snapshots predictable.
  await detail.locator('[data-dj885-type="scale"][data-value="normal"]').click({noWaitAfter:true});
  await detail.locator('[data-dj885-type="weight"][data-value="normal"]').click({noWaitAfter:true});
  await expect(page.locator('#app')).toHaveAttribute('data-dj885-type-engine','css');
  await page.screenshot({path:'test-results/v885-font-choices-390.png'});
  await navTab(page,'map').click({noWaitAfter:true});
  await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
});

test('floating onboarding retains border/margins, all sheets have no fullscreen button',async({page})=>{
  test.setTimeout(220000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page,{dismissOnboarding:false});
  const tour=page.locator('#dj860-onboarding .dj860-card');
  await expect(tour).toBeVisible();
  const rect=await tour.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect.x).toBeGreaterThan(8);
  expect(rect.y).toBeGreaterThan(8);
  expect(rect.width).toBeLessThan(390);
  expect(rect.height).toBeLessThan(834);
  await page.screenshot({path:'test-results/v885-tour-floating-390.png'});
  await page.locator('#dj860-onboarding .dj860-skip').click({noWaitAfter:true});
  await expect(page.locator('#dj860-onboarding')).toBeHidden({timeout:20000});
  for(const key of ['route','participate','news','mine']){
    await navTab(page,key).click({noWaitAfter:true,timeout:30000});
    await expect(page.locator('#app')).toHaveAttribute('data-tab',key);
    const p=page.locator('#'+({route:'route-panel',participate:'participation-panel',news:'news-panel',mine:'mine-panel'}[key]));
    await expect(p).toBeVisible();
    await expect(p.locator('.dj877-expand-button')).toHaveCount(0);
    const x=p.locator('.dj-sheet-chrome-close');
    await expect(x).toBeVisible();
    const geometry=await x.boundingBox();
    expect(geometry?.width||0).toBeGreaterThanOrEqual(42);
  }
  await navTab(page,'map').click({noWaitAfter:true});
});

test('subway previous/current/next is one pill with working close',async({page})=>{
  test.setTimeout(220000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{
    detail:{place:{kind:'subway',name:'이수',lng:126.981605,lat:37.485196,
      lines:['4호선','7호선'],selectedLine:'7호선'}}
  })));
  const sheet=page.locator('#transport-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute('data-kind','subway');
  await expect(sheet.locator('.dj877-expand-button')).toHaveCount(0);
  const pill=sheet.locator('.metro-neighbor-row').first();
  await expect(pill).toBeVisible({timeout:20000});
  const styles=await pill.evaluate(n=>{
    const s=getComputedStyle(n);
    const r=n.getBoundingClientRect();
    return {radius:parseFloat(s.borderTopLeftRadius),width:r.width,
      columns:s.gridTemplateColumns,previous:n.querySelector('.metro-rail-previous')?.textContent,
      next:n.querySelector('.metro-rail-next')?.textContent};
  });
  expect(styles.radius).toBeGreaterThanOrEqual(22);
  expect(styles.width).toBeGreaterThan(180);
  expect(styles.columns.trim().split(/\s+/).length).toBe(3);
  expect(styles.previous?.length||0).toBeGreaterThan(1);
  expect(styles.next?.length||0).toBeGreaterThan(1);
  await page.screenshot({path:'test-results/v885-metro-pill-390.png'});
  await clickRealPointer(page,page.locator('#transport-close'),'transit close');
  await expect(sheet).toBeHidden();
});
