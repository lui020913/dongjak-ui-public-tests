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
      nav:nav?{...rect(nav),...style(nav),children:nav.querySelectorAll(':scope > .nav-tab').length,items:[...nav.children].map(el=>({id:el.id,classes:el.className,position:getComputedStyle(el).position,tab:el.dataset.tab||null,display:getComputedStyle(el).display,gridColumn:getComputedStyle(el).gridColumn,...rect(el)})),pseudo:['::before','::after'].map(p=>({pseudo:p,display:getComputedStyle(nav,p).display,content:getComputedStyle(nav,p).content}))}:null,
      actions:actions?{...rect(actions),...style(actions)}:null,
      desktopRail:document.querySelectorAll('#dj-desktop-safety-rail').length,
      tabletRail:document.querySelectorAll('#dj-tablet-utility-group').length
    };
  });

  await testInfo.attach('layout-metrics.json',{body:Buffer.from(JSON.stringify(metrics,null,2)),contentType:'application/json'});
  expect(metrics.topbar,'search header must exist').not.toBeNull();
  expect(metrics.toolbar,'shared feature toolbar must mount').not.toBeNull();
  expect(metrics.nav,'shared five-tab navigation must exist').not.toBeNull();
  expect(metrics.actions,'map controls must remain available').not.toBeNull();

  expect(metrics.topbar.position).toBe('fixed');
  expect(metrics.toolbar.position).toBe('fixed');
  expect(metrics.nav.position).toBe('fixed');
  expect(metrics.nav.display).toBe('grid');
  expect(metrics.nav.children).toBe(5);
  expect(metrics.nav.gridTemplateColumns.trim().split(/\s+/),JSON.stringify(metrics.nav)).toHaveLength(5);
  const tabs=metrics.nav.items.filter(item=>item.tab);
  const indicator=metrics.nav.items.find(item=>String(item.classes).includes('dj-motion-indicator'));
  expect(indicator).toBeTruthy();
  expect(indicator.position).toBe('absolute');
  expect(indicator.display).not.toBe('none');
  expect(tabs.map(item=>item.tab)).toEqual(['route','participate','map','news','mine']);
  expect(Math.max(...tabs.map(item=>item.width))-Math.min(...tabs.map(item=>item.width))).toBeLessThanOrEqual(2);
  expect(tabs.every(item=>item.width>0&&item.height>0&&item.right<=metrics.nav.right+1)).toBe(true);

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
});

test('installed iOS PWA status color follows scrims, native dialogs, and both themes',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'standalone',{configurable:true,value:true});
    Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  });
  await page.route('**/*',route=>{const url=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(url.hostname)||['data:','blob:'].includes(url.protocol)?route.continue():route.abort();});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveClass(/dj-ios-home-pwa/);
  const meta=page.locator('meta[name="theme-color"]');
  await page.evaluate(()=>{document.getElementById('app').dataset.theme='light';});
  await expect(meta).toHaveAttribute('content','#eaf0ec');

  const expectedBlend=async(rgb,alpha)=>page.evaluate(({rgb,alpha})=>{
    const base=document.documentElement.style.getPropertyValue('--dj-ios-pwa-base-color').trim();
    const channels=base.slice(1).match(/../g).map(x=>parseInt(x,16));
    return '#'+channels.map((value,index)=>Math.round(value*(1-alpha)+rgb[index]*alpha).toString(16).padStart(2,'0')).join('');
  },{rgb,alpha});

  await page.evaluate(()=>{
    const scrim=document.createElement('div');scrim.id='dj-ci-status-scrim';scrim.dataset.djOverlayScrim='true';
    scrim.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.4);pointer-events:none';
    document.body.append(scrim);
  });
  const genericDim=await expectedBlend([0,0,0],0.4);
  await expect(meta).toHaveAttribute('content',genericDim);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.style.getPropertyValue('--dj-ios-pwa-status-color'))).toBe(genericDim);
  await page.evaluate(()=>document.getElementById('dj-ci-status-scrim').remove());
  await expect(meta).toHaveAttribute('content','#eaf0ec');

  await page.evaluate(()=>{
    for(const open of document.querySelectorAll('dialog[open]'))open.close();
    const style=document.createElement('style');
    style.id='dj-ci-native-dialog-style';
    style.textContent='#dj-ci-native-dialog::backdrop{background:rgba(15,31,32,.43)!important}';
    document.head.append(style);
    const dialog=document.createElement('dialog');
    dialog.id='dj-ci-native-dialog';
    dialog.textContent='Status-bar regression check';
    dialog.style.cssText='width:220px;height:120px;border:0;background:#fff';
    document.body.append(dialog);
    dialog.showModal();
  });
  const dialogDim=await expectedBlend([15,31,32],0.43);
  await expect(meta).toHaveAttribute('content',dialogDim);
  await page.evaluate(()=>document.getElementById('dj-ci-native-dialog').close());
  await expect(meta).toHaveAttribute('content','#eaf0ec');

  await page.evaluate(()=>{document.getElementById('app').dataset.theme='dark';});
  await expect(meta).toHaveAttribute('content','#192d32');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.evaluate(()=>{
    document.getElementById('dj-mobile-header-dim')?.remove();
    const dim=document.createElement('div');
    dim.id='dj-mobile-header-dim';
    dim.style.cssText='position:fixed;top:0;left:0;right:0;height:132px;z-index:3110;background:rgba(9,25,24,.36);pointer-events:none';
    document.body.append(dim);
  });
  const darkHeaderDim=await expectedBlend([9,25,24],0.36);
  await expect(meta).toHaveAttribute('content',darkHeaderDim);
  await page.evaluate(()=>document.getElementById('dj-mobile-header-dim').remove());
  await expect(meta).toHaveAttribute('content','#192d32');
  await page.evaluate(()=>{document.getElementById('app').dataset.theme='light';});
  await expect(meta).toHaveAttribute('content','#eaf0ec');
});
