import {test,expect} from '@playwright/test';
import {openMapPage,navTab,clickRealPointer} from './helpers.js';

test('phone preferences use nested iPhone-style pages and preserve native settings owners',async({page})=>{
  test.skip(page.viewportSize().width>=700,'phone only');
  test.setTimeout(120000);
  await openMapPage(page);
  await clickRealPointer(page,navTab(page,'mine'),'my info');
  const language=page.locator('#mine-panel .dj834-my-home .dj854-language-section');
  await expect(language).toBeVisible();
  await expect(language.locator('.dj854-language-icon svg')).toBeVisible();
  // The home row no longer contains an interactive native picker.
  await expect(language.locator('select')).toBeHidden();
  await clickRealPointer(page,language,'language preference');
  const detail=page.locator('#mine-panel .dj834-my-detail');
  await expect(detail).toBeVisible();
  await expect(detail.locator('.dj834-detail-title')).toContainText('언어');
  await expect(detail.locator('[data-dj834-language="ko"]')).toBeVisible();
  await clickRealPointer(page,detail.locator('[data-dj834-language="ko"]'),'Korean');
  await expect(detail.locator('[data-dj834-language="ko"]')).toHaveAttribute('aria-pressed','true');
  await clickRealPointer(page,detail.locator('.dj834-detail-back'),'back to preferences');
  await clickRealPointer(page,page.locator('[data-dj834-action="map"]'),'map settings submenu');
  await expect(detail.locator('.dj834-detail-title')).toContainText('지도');
  await clickRealPointer(page,detail.locator('[data-dj834-setting="map"]'),'open map settings');
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
