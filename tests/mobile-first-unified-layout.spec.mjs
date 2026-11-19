import {test,expect} from '@playwright/test';

test('same mobile-first app shell is used at every viewport',async({page},testInfo)=>{
  const externalRequests=[];
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(['127.0.0.1','localhost'].includes(url.hostname)||['data:','blob:'].includes(url.protocol)){
      return route.continue();
    }
    externalRequests.push(url.hostname);
    return route.abort();
  });

  await page.goto('/',{waitUntil:'domcontentloaded'});
  const menu=page.locator('dialog#dj-install-menu');
  await expect(menu).toBeAttached({timeout:15000});
  if(await menu.isVisible())await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
  await page.waitForSelector('#app');
  await page.waitForSelector('#dj-v794-toolbar',{timeout:15000});
  await page.waitForTimeout(900);

  const metrics=await page.evaluate(()=>{
    const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,right:r.right,bottom:r.bottom};};
    const style=el=>{const s=getComputedStyle(el);return {position:s.position,display:s.display,gridTemplateColumns:s.gridTemplateColumns,flexDirection:s.flexDirection,visibility:s.visibility};};
    const topbar=document.querySelector('#app > .topbar');
    const toolbar=document.querySelector('#app > #dj-v794-toolbar');
    const nav=document.querySelector('#app > #bottom-nav');
    const actions=document.querySelector('#app .map-actions');
    return {
      viewport:{width:innerWidth,height:innerHeight},
      topbar:topbar?{...rect(topbar),...style(topbar)}:null,
      toolbar:toolbar?{...rect(toolbar),...style(toolbar)}:null,
      nav:nav?{...rect(nav),...style(nav),children:nav.querySelectorAll(':scope > .nav-tab').length}:null,
      actions:actions?{...rect(actions),...style(actions)}:null,
      desktopRail:document.querySelectorAll('#dj-desktop-safety-rail').length,
      tabletRail:document.querySelectorAll('#dj-tablet-utility-group').length
    };
  });

  expect(metrics.topbar,'search header must exist').not.toBeNull();
  expect(metrics.toolbar,'shared feature toolbar must mount').not.toBeNull();
  expect(metrics.nav,'shared five-tab navigation must exist').not.toBeNull();
  expect(metrics.actions,'map controls must remain available').not.toBeNull();

  expect(metrics.topbar.position).toBe('fixed');
  expect(metrics.toolbar.position).toBe('fixed');
  expect(metrics.nav.position).toBe('fixed');
  expect(metrics.nav.display).toBe('grid');
  expect(metrics.nav.children).toBe(5);
  expect(metrics.nav.gridTemplateColumns.trim().split(/\s+/)).toHaveLength(5);

  expect(metrics.nav.x).toBeGreaterThanOrEqual(-1);
  expect(metrics.nav.right).toBeLessThanOrEqual(metrics.viewport.width+1);
  expect(metrics.nav.bottom).toBeLessThanOrEqual(metrics.viewport.height+1);
  expect(metrics.nav.y).toBeGreaterThan(metrics.viewport.height-140);

  expect(metrics.toolbar.x).toBeGreaterThanOrEqual(-1);
  expect(metrics.toolbar.right).toBeLessThanOrEqual(metrics.viewport.width+1);
  expect(metrics.toolbar.y).toBeGreaterThan(metrics.topbar.bottom-1);
  expect(metrics.toolbar.y).toBeLessThan(metrics.nav.y);

  expect(metrics.actions.position).toBe('fixed');
  expect(metrics.actions.right).toBeLessThanOrEqual(metrics.viewport.width+1);
  expect(metrics.desktopRail).toBe(0);
  expect(metrics.tabletRail).toBe(0);

  await page.screenshot({path:testInfo.outputPath('unified-layout.png'),fullPage:false});
  await testInfo.attach('layout-metrics.json',{body:Buffer.from(JSON.stringify(metrics,null,2)),contentType:'application/json'});
});
