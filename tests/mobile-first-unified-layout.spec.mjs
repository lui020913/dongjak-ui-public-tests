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
  if(await menu.isVisible()){
    const size=page.viewportSize(),rect=await menu.boundingBox();
    expect(Math.abs(rect.x)).toBeLessThanOrEqual(1);expect(Math.abs(rect.y)).toBeLessThanOrEqual(1);expect(Math.abs(rect.width-size.width)).toBeLessThanOrEqual(2);expect(Math.abs(rect.height-size.height)).toBeLessThanOrEqual(2);
    await testInfo.attach('fullscreen-install-menu',{body:await page.screenshot(),contentType:'image/png'});
    await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
  }
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
      nav:nav?{...rect(nav),...style(nav),children:nav.querySelectorAll(':scope > .nav-tab').length,
        gridItems:[...nav.children].map(el=>{const s=getComputedStyle(el);return {id:el.id,classes:el.className,tag:el.tagName,hidden:el.hidden,display:s.display,position:s.position,gridColumn:s.gridColumn,gridRow:s.gridRow,width:el.getBoundingClientRect().width};}),
        pseudo:['::before','::after'].map(p=>{const s=getComputedStyle(nav,p);return {p,content:s.content,display:s.display,position:s.position,gridColumn:s.gridColumn};})}:null,
      actions:actions?{...rect(actions),...style(actions)}:null,
      desktopRail:document.querySelectorAll('#dj-desktop-safety-rail').length,
      tabletRail:document.querySelectorAll('#dj-tablet-utility-group').length
    };
  });

  console.log('Mobile dock geometry: '+JSON.stringify(metrics.nav));
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


test('installed iOS PWA status color follows a visible scrim and restores on close',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'standalone',{configurable:true,value:true});
    Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  });
  await page.route('**/*',route=>{const url=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(url.hostname)||['data:','blob:'].includes(url.protocol)?route.continue():route.abort();});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveClass(/dj-ios-home-pwa/);
  const baseline=await page.evaluate(()=>{
    const root=document.documentElement;return root.style.getPropertyValue('--dj-ios-pwa-base-color').trim();
  });
  expect(baseline).toMatch(/^#[0-9a-f]{6}$/i);
  const meta=page.locator('meta[name="theme-color"]');
  await page.evaluate(()=>{
    const scrim=document.createElement('div');scrim.id='dj-ci-status-scrim';scrim.dataset.djOverlayScrim='true';
    scrim.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.4);pointer-events:none';
    document.body.append(scrim);
  });
  const dimmed='#'+baseline.slice(1).match(/../g).map(x=>Math.round(parseInt(x,16)*.6).toString(16).padStart(2,'0')).join('');
  await expect(meta).toHaveAttribute('content',dimmed);
  await page.evaluate(()=>document.getElementById('dj-ci-status-scrim').remove());
  await expect(meta).toHaveAttribute('content',baseline);
});
