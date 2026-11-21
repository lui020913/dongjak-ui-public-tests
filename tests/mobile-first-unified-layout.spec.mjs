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
      nav:nav?{...rect(nav),...style(nav),children:nav.querySelectorAll(':scope > .nav-tab').length,items:[...nav.children].map(el=>({id:el.id,tab:el.dataset.tab||null,display:getComputedStyle(el).display,gridColumn:getComputedStyle(el).gridColumn,...rect(el)})),pseudo:['::before','::after'].map(p=>({pseudo:p,display:getComputedStyle(nav,p).display,content:getComputedStyle(nav,p).content}))}:null,
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

/* A genuine mobile-browser check: the four native content tabs now open as
 * complete pages, but the map-linked layers retain their bottom-sheet owner. */
test('phone route, community, news and account fill the viewport without swallowing the pill navigation',async({page},testInfo)=>{
  test.setTimeout(115000);
  if(page.viewportSize().width>=700)test.skip();
  await page.route('**/*',route=>{
    const u=new URL(route.request().url());
    return ['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol)
      ? route.continue() : route.abort();
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const menu=page.locator('dialog#dj-install-menu');
  await expect(menu).toBeAttached({timeout:15000});
  if(await menu.isVisible())await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
  const startup=page.locator('#map-startup-overlay');
  const continueButton=page.locator('#map-startup-continue');
  await expect.poll(async()=>!(await startup.isVisible())||(await continueButton.isVisible()),{timeout:60000}).toBe(true);
  if(await startup.isVisible())await continueButton.click();
  const onboarding=page.locator('#dj860-onboarding');
  await expect(onboarding).toBeAttached({timeout:15000});
  if(await onboarding.isVisible())await onboarding.locator('.dj860-skip').click({noWaitAfter:true});
  await expect(onboarding).toBeHidden({timeout:15000});
  const dock=page.locator('#bottom-nav');
  await expect(dock).toBeVisible();
  for(const [tab,id] of [['route','route-panel'],['participate','participation-panel'],['news','news-panel'],['mine','mine-panel']]){
    await page.locator(`#bottom-nav .nav-tab[data-tab="${tab}"]`).click({noWaitAfter:true});
    await expect(page.locator('#app')).toHaveAttribute('data-tab',tab);
    const panel=page.locator('#'+id);
    await expect(panel).toBeVisible();
    await expect.poll(async()=>{
      const b=await panel.boundingBox(),h=await page.evaluate(()=>document.documentElement.clientHeight);
      return Boolean(b&&Math.abs(b.x)<3&&Math.abs(b.y)<3&&Math.abs(b.height-h)<5);
    },{timeout:10000}).toBe(true);
    await expect(page.locator('#app > .topbar')).toBeHidden();
    await expect(dock).toBeVisible();
    await expect(panel.locator('.dj-sheet-chrome-grip')).toBeHidden();
    const dims=await page.evaluate(id=>{
      const panel=document.getElementById(id),nav=document.getElementById('bottom-nav');
      const a=panel.getBoundingClientRect(),b=nav.getBoundingClientRect();
      return {pageHeight:a.height,navTop:b.top,navLayer:parseInt(getComputedStyle(nav).zIndex,10),panelLayer:parseInt(getComputedStyle(panel).zIndex,10)};
    },id);
    expect(dims.navLayer,'pill must be above the page').toBeGreaterThan(dims.panelLayer);
    await testInfo.attach(tab+'-geometry.json',{body:Buffer.from(JSON.stringify(dims)),contentType:'application/json'});
  }
  await page.locator('#bottom-nav .nav-tab[data-tab="map"]').click({noWaitAfter:true});
  await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
  await expect(page.locator('#app > .topbar')).toBeVisible();
});
