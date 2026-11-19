import { test, expect } from '@playwright/test';
import { openMapPage, navTab } from './helpers.js';

test('mobile typography options remain responsive and sheets do not overflow', async ({page}) => {
  test.setTimeout(210000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  await navTab(page,'mine').click({noWaitAfter:true,timeout:30000});
  const mine=page.locator('#mine-panel');
  await expect(mine).toBeVisible();
  await expect(mine.locator('.dj834-my-home')).toBeVisible();
  await mine.locator('[data-dj834-action="type"]').click({noWaitAfter:true,timeout:15000});
  const detail=mine.locator('.dj834-my-detail');
  await expect(detail).toBeVisible({timeout:5000});
  const scale=detail.locator('[data-dj885-type="scale"][data-value="large"]');
  const weight=detail.locator('[data-dj885-type="weight"][data-value="bold"]');
  await expect(scale).toBeVisible();
  await expect(detail.locator('select[data-dj877-type]')).toHaveCount(0);
  const title=page.locator('#mine-panel .dj-sheet-chrome-title h2');
  const before=await title.evaluate(node=>Number.parseFloat(getComputedStyle(node).fontSize));
  await scale.click({noWaitAfter:true});
  await weight.click({noWaitAfter:true});
  await expect(scale).toHaveAttribute('aria-pressed','true');
  await expect(weight).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#app')).toHaveAttribute('data-dj885-type-engine','css');
  const after=await title.evaluate(node=>Number.parseFloat(getComputedStyle(node).fontSize));
  expect(after).toBeGreaterThan(before);
  // A suspended WebKit navigation must not lock up the browser event loop.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(detail).toBeVisible();
  await detail.locator('.dj834-detail-back').click({noWaitAfter:true});
  await expect(detail).toBeHidden({timeout:5000});
  await expect(mine.locator('.dj834-my-home')).toBeVisible();
  await mine.locator('[data-dj834-action="type"]').click({noWaitAfter:true});
  await expect(detail).toBeVisible({timeout:5000});
  await detail.locator('.dj834-detail-back').click({noWaitAfter:true});
  await expect(mine.locator('.dj834-my-home')).toBeVisible();
  await navTab(page,'participate').click({noWaitAfter:true,timeout:30000});
  const community=page.locator('#participation-panel');
  await expect(community).toBeVisible();
  const bounds=await community.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(-2);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(392);
  await page.screenshot({path:'test-results/v884-mobile390-community.png'});
  await navTab(page,'map').click({noWaitAfter:true,timeout:30000});
  await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
});

test('mobile quick search uses a bounded scrollable overlay', async ({page}) => {
  test.setTimeout(180000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  const query=page.locator('#map-quick-search-query');
  await query.click({noWaitAfter:true});
  await query.fill('스타벅');
  const results=page.locator('#map-quick-search-dropdown');
  await expect(results).toBeVisible({timeout:15000});
  const data=await results.evaluate(el=>{
    const r=el.getBoundingClientRect(),style=getComputedStyle(el);
    return {width:r.width,left:r.left,top:r.top,height:r.height,
      maxHeight:style.maxHeight,overflowY:style.overflowY,
      room:el.style.getPropertyValue('--dj884-search-room')};
  });
  expect(data.left).toBeGreaterThanOrEqual(-2);
  expect(data.width).toBeLessThanOrEqual(392);
  expect(data.room).toMatch(/px$/);
  expect(data.overflowY).toBe('auto');
  await page.screenshot({path:'test-results/v884-mobile390-search.png'});
});
