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

  if(page.viewportSize().width<700){
    // Compare computed (not authored) surfaces after temporarily revealing each
    // existing page without triggering a navigation or theme UI side effect.
    const palette=await page.evaluate(()=>{
      const app=document.getElementById('app');
      const priorTab=app.dataset.tab,priorTheme=app.dataset.theme;
      const samples=[];
      try {
        for(const [theme,expected] of [['light','rgb(237, 243, 239)'],['dark','rgb(34, 40, 46)']]){
          app.dataset.theme=theme;
          for(const [tab,id] of [['route','route-panel'],['participate','participation-panel'],['news','news-panel'],['mine','mine-panel']]){
            const panel=document.getElementById(id),hadHidden=panel.hasAttribute('hidden');
            app.dataset.tab=tab;
            panel.removeAttribute('hidden');
            try{
              const chrome=panel.querySelector(':scope > .dj-sheet-chrome');
              const body=panel.querySelector(':scope > .dj836-sheet-body');
              const footer=tab==='route'?panel.querySelector(':scope > #dj910-route-footer'):null;
              const color=node=>node?getComputedStyle(node).backgroundColor:null;
              samples.push({theme,tab,expected,panel:color(panel),header:color(chrome),body:color(body),footer:footer?color(footer):null});
            }finally{if(hadHidden)panel.setAttribute('hidden','');}
          }
        }
      }finally{
        if(priorTab===undefined)delete app.dataset.tab;else app.dataset.tab=priorTab;
        if(priorTheme===undefined)delete app.dataset.theme;else app.dataset.theme=priorTheme;
      }
      return samples;
    });
    await testInfo.attach('mobile-theme-surfaces.json',{body:Buffer.from(JSON.stringify(palette,null,2)),contentType:'application/json'});
    for(const item of palette){
      for(const zone of ['panel','header','body',...(item.tab==='route'?['footer']:[])]){
        expect(item[zone],item.theme+' '+item.tab+' '+zone+' must match the status header').toBe(item.expected);
      }
    }
  }

});
