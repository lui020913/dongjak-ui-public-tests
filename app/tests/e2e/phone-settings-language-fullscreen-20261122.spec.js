import {test,expect} from '@playwright/test';
import {openMapPage,navTab,clickRealPointer} from './helpers.js';

test('phone My Info language remains aligned and preferences occupy a full viewport',async({page})=>{
  test.skip(page.viewportSize().width>=700,'phone only');
  test.setTimeout(120000);
  await openMapPage(page);
  await clickRealPointer(page,navTab(page,'mine'),'my info');
  const group=page.locator('#mine-panel .dj834-my-home .dj834-settings-group').first();
  const language=group.locator('.dj854-language-section');
  await expect(language).toBeVisible();
  await expect(language.locator('.dj854-language-icon svg')).toBeVisible();
  const overlapping=await language.evaluate(node=>{
    const label=node.querySelector('label')?.getBoundingClientRect();
    const select=node.querySelector('select')?.getBoundingClientRect();
    return !label||!select||label.right>select.left+1;
  });
  expect(overlapping,'language label cannot overlap selector').toBe(false);
  await clickRealPointer(page,page.locator('[data-dj834-action="map"]'),'map settings');
  const settings=page.locator('#dj-map-settings');
  await expect(settings).toBeVisible();
  await expect.poll(async()=>{
    const box=await settings.boundingBox();
    return box && Math.abs(box.x)<2 && Math.abs(box.y)<2
      && Math.abs(box.width-page.viewportSize().width)<2
      && Math.abs(box.height-page.viewportSize().height)<2;
  }).toBe(true);
  await expect(settings.locator('.dj877-pref-group')).toHaveCount(1);
  await expect(settings.locator('.dj877-pref-group summary')).toContainText('도보 설정');
  await expect(settings.locator('[data-dj877-layer]')).toHaveCount(0);
  await clickRealPointer(page,settings.locator('#dj-settings-close'),'close settings');
  await expect(settings).toBeHidden();
  await expect(page.locator('#mine-panel')).toBeVisible();
});
