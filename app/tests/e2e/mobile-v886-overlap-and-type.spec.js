import { test, expect } from '@playwright/test';
import { openMapPage, navTab, clickRealPointer } from './helpers.js';

test('Safari install guidance never overlays the walking route sheet',async({page})=>{
  test.setTimeout(180000);
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    Object.defineProperty(window.navigator,'userAgent',{configurable:true,
      get:()=> 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1'});
    Object.defineProperty(window.navigator,'standalone',{configurable:true,get:()=>false});
  });
  await openMapPage(page);
  await expect(page.locator('.dj-ios-add-guide')).toHaveCount(0);
  await navTab(page,'route').click({noWaitAfter:true,timeout:30000});
  const sheet=page.locator('#route-panel');
  await expect(sheet).toBeVisible({timeout:15000});
  await expect(page.locator('.dj-ios-add-guide')).toHaveCount(0);
  await expect(page.locator('#mobile-webapp-help')).toBeHidden();
  const top=await sheet.boundingBox();
  expect(top?.width||0).toBeGreaterThan(250);
  // The normal bottom navigation must own its physical touch target.
  await clickRealPointer(page,navTab(page,'map'),'route to map');
  await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
  await page.screenshot({path:'test-results/v886-route-no-install-prompt-390.png'});
});

test('typography is available from My Info only and stays touch responsive',async({page})=>{
  test.setTimeout(230000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  const moreTrigger=page.locator('#dj-v794-more:visible, #dj-mobile-more-trigger:visible').first();
  await expect(moreTrigger).toBeVisible();
  await clickRealPointer(page,moreTrigger,'More tools');
  const utilities=page.locator('#dj-mobile-utilities');
  await expect(utilities).toBeVisible({timeout:16000});
  await expect(utilities.locator('#dj800-type-trigger')).toBeHidden();
  await clickRealPointer(page,utilities.locator('#dj-mobile-utilities-close'),'Close More');
  await expect(utilities).toBeHidden();
  await clickRealPointer(page,navTab(page,'mine'),'My Info');
  const myInfo=page.locator('#mine-panel');
  await expect(myInfo).toBeVisible({timeout:10000});
  await expect(page.locator('#app')).toHaveAttribute('data-tab','mine');
  const type=myInfo.locator('[data-dj834-action=type]');
  await type.scrollIntoViewIfNeeded();
  await clickRealPointer(page,type,'My Info typography');
  await expect(myInfo.locator('.dj834-my-detail')).toBeVisible({timeout:10000});
  await expect(utilities).toBeHidden({timeout:10000});
  await expect(page.locator('#dj800-type-panel')).toBeHidden({timeout:10000});
  const layoutBeforeType=await page.evaluate(()=>{
    const state=id=>{
      const el=document.getElementById(id);if(!el)return null;
      const rect=el.getBoundingClientRect(),css=getComputedStyle(el);
      return {hidden:el.hidden,className:el.className,
        inline:el.getAttribute('style'),
        rect:{x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)},
        position:css.position,top:css.top,bottom:css.bottom,transform:css.transform,
        translate:css.translate,animation:css.animationName,display:css.display,
        visibility:css.visibility,zIndex:css.zIndex};
    };
    return {appTab:document.getElementById('app')?.dataset.tab,viewport:{w:innerWidth,h:innerHeight},
      mine:state('mine-panel'),more:state('dj-mobile-utilities'),nav:state('bottom-nav'),
      body:(()=>{const e=document.querySelector('#mine-panel .dj836-sheet-body');if(!e)return null;const a=e.getBoundingClientRect();return {y:a.y,h:a.height,scrollTop:e.scrollTop,scrollHeight:e.scrollHeight}})(),
      detail:(()=>{const e=document.querySelector('#mine-panel .dj834-my-detail');if(!e)return null;const a=e.getBoundingClientRect();return {hidden:e.hidden,y:a.y,h:a.height}})()};
  });
  console.log('V886_IOS_LAYOUT_DIAG',JSON.stringify(layoutBeforeType));
  // A DOM-visible sheet outside the physical viewport is NOT an open window.
  // Require that the My Info card actually occupies the screen and has
  // finished any short fade before trying the typography controls.
  await expect.poll(()=>myInfo.evaluate(el=>{
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    return r.top<700 && r.bottom>150 && Number(s.opacity)>.90;
  }),{timeout:5500,intervals:[100,150,250,450]}).toBe(true);
  const button=myInfo.locator('[data-dj885-type="scale"][data-value="large"]');
  // My Info is a genuinely scrollable bottom sheet. Scroll into view first;
  // the real center-point test must never synthesize a tap beyond the screen.
  await button.scrollIntoViewIfNeeded({timeout:15000});
  await expect(button).toBeInViewport();
  await clickRealPointer(page,button,'Large type scale');
  await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#app')).toHaveAttribute('data-dj-type-scale','large');
  await page.evaluate(()=>new Promise((resolve,reject)=>{
    const guard=setTimeout(()=>reject(Error('UI event loop unresponsive')),1800);
    requestAnimationFrame(()=>{clearTimeout(guard);resolve();});
  }));
  await myInfo.locator('.dj834-detail-back').scrollIntoViewIfNeeded({timeout:15000});
  await clickRealPointer(page,myInfo.locator('.dj834-detail-back'),'My Info back');
  await expect(myInfo.locator('.dj834-my-home')).toBeVisible();
  await clickRealPointer(page,navTab(page,'map'),'My Info back to map');
  await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
  await page.screenshot({path:'test-results/v886-my-info-font-390.png'});
});
