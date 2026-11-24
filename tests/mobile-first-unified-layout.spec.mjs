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


/**
 * Regression evidence for two confirmed Production hit-target defects.
 * Anonymous reads only. Require a real pointer hit; never force-click.
 */
async function readyForLiveTouch(page){
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const menu=page.locator('dialog#dj-install-menu[open]');
  if(await menu.isVisible().catch(()=>false)){
    await menu.getByRole('button',{name:/웹에서 바로 이용하기/}).click({timeout:12000});
    await expect(menu).toBeHidden({timeout:12000});
  }
  await expect(page.locator('#map')).toBeVisible({timeout:30000});
  const overlay=page.locator('#map-startup-overlay');
  if(await overlay.count()){
    const continueButton=page.locator('#map-startup-continue');
    await expect.poll(async()=>!await overlay.isVisible().catch(()=>false)||
      await continueButton.isVisible().catch(()=>false),{timeout:65000}).toBe(true);
    if(await overlay.isVisible()&&await continueButton.isVisible())await continueButton.click({timeout:10000});
    await expect(overlay).toBeHidden({timeout:25000});
  }
  await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state',/^(signed-out|signed-in)$/,{timeout:30000});
  const tour=page.locator('#dj860-onboarding');
  for(let n=0;n<3&&await tour.isVisible().catch(()=>false);n++){
    const skip=tour.locator('[data-dj860-action="skip"]');
    if(!await skip.isVisible().catch(()=>false))break;
    await skip.click({timeout:15000});
    await expect(tour).toBeHidden({timeout:10000});
  }
}
async function realTapAtCenter(page,locator){
  await expect(locator).toBeVisible({timeout:15000});
  await locator.scrollIntoViewIfNeeded({timeout:15000});
  const pt=await locator.evaluate(el=>{
    const b=el.getBoundingClientRect(),x=Math.round(b.left+b.width/2),y=Math.round(b.top+b.height/2);
    const hit=document.elementFromPoint(x,y);
    return{x,y,hit:!!hit&&(el===hit||el.contains(hit)),
      coveringId:hit?.id||'',coveringClass:String(hit?.className||'').slice(0,120),
      rect:[b.x,b.y,b.width,b.height]};
  });
  expect(pt.hit,'Control must receive actual finger event: '+JSON.stringify(pt)).toBe(true);
  await page.touchscreen.tap(pt.x,pt.y);
}

test('map TIP dismiss stays above the TIP pill and works by touch',async({page})=>{
  test.setTimeout(150000);
  await readyForLiveTouch(page);
  const tip=page.locator('#dj840-map-tip'),close=page.locator('#dj-user-tip-close');
  await expect(tip).toBeVisible({timeout:30000});
  await expect(close).toBeVisible({timeout:30000});
  const layers=await page.evaluate(()=>{
    const tip=document.getElementById('dj840-map-tip'),close=document.getElementById('dj-user-tip-close');
    return{tip:Number(getComputedStyle(tip).zIndex),close:Number(getComputedStyle(close).zIndex)};
  });
  expect(layers.close,'Close control should be above the TIP').toBeGreaterThan(layers.tip);
  await realTapAtCenter(page,close);
  await expect(page.locator('#app')).toHaveAttribute('data-dj-user-tip-dismissed','true',{timeout:10000});
  await expect(tip).toBeHidden({timeout:10000});
});

test('community details hide refresh when closed and expose a tappable refresh when open',async({page})=>{
  test.setTimeout(150000);
  await readyForLiveTouch(page);
  // This is an SPA tab switch, not a document navigation. Waiting on unrelated
  // background news/transport requests caused false Playwright click timeouts.
  // The next assertion still requires the REAL tab state to change.
  await page.locator('#bottom-nav .nav-tab[data-tab="participate"]').click({timeout:12000,noWaitAfter:true});
  await expect(page.locator('#app')).toHaveAttribute('data-tab','participate',{timeout:15000});
  const details=page.locator('#participation-panel .community-view-options'),
    toolbar=details.locator('.community-toolbar'),
    refresh=details.locator('#community-refresh');
  await expect(details).toBeVisible({timeout:15000});
  await expect(details).not.toHaveAttribute('open',/.+/);
  await expect(toolbar).toBeHidden();
  await realTapAtCenter(page,details.locator('summary'));
  await expect(details).toHaveAttribute('open','');
  await expect(toolbar).toBeVisible();
  await realTapAtCenter(page,refresh);
  await expect(refresh).toBeVisible();
});


test('My Info update-history scroller is not masked by a fake footer above the fixed dock',async({page})=>{
  test.setTimeout(150000);
  await readyForLiveTouch(page);
  await page.locator('#bottom-nav .nav-tab[data-tab="mine"]').click({timeout:12000,noWaitAfter:true});
  await expect(page.locator('#app')).toHaveAttribute('data-tab','mine',{timeout:15000});
  const state=await page.evaluate(()=>{
    const panel=document.getElementById('mine-panel');
    const scroller=panel?.querySelector(':scope > .dj836-sheet-body');
    const fake=panel?getComputedStyle(panel,'::after'):null;
    return {
      fakeContent:fake?.content,fakeDisplay:fake?.display,
      outerPaddingBottom:panel?parseFloat(getComputedStyle(panel).paddingBottom):null,
      paddingBottom:scroller?parseFloat(getComputedStyle(scroller).paddingBottom):0,
      scrollPaddingBottom:scroller?parseFloat(getComputedStyle(scroller).scrollPaddingBottom):0,
      bodyBottom:scroller?.getBoundingClientRect().bottom,
      navigationTop:document.getElementById('bottom-nav')?.getBoundingClientRect().top
    };
  });
  expect(state.fakeContent==='none'||state.fakeDisplay==='none',JSON.stringify(state)).toBe(true);
  expect(state.outerPaddingBottom,JSON.stringify(state)).toBe(0);
  expect(state.paddingBottom,JSON.stringify(state)).toBeGreaterThanOrEqual(94);
  expect(state.scrollPaddingBottom,JSON.stringify(state)).toBeGreaterThanOrEqual(94);
  expect(state.bodyBottom,JSON.stringify(state)+' scrollport overlaps dock').toBeLessThanOrEqual(state.navigationTop+3);
  expect(state.navigationTop).toBeGreaterThan(450);
});


test('real phone route editor and CTA clear the bottom dock at all three viewport sizes',async({page},testInfo)=>{
  test.skip(page.viewportSize().width>=700,'phone-only route overlay');
  test.setTimeout(150000);
  await readyForLiveTouch(page);
  await page.locator('#bottom-nav .nav-tab[data-tab="route"]').click({timeout:12000,noWaitAfter:true});
  await expect(page.locator('#app')).toHaveAttribute('data-tab','route',{timeout:15000});
  const route=page.locator('#dj-route-v3');
  await expect(route).toBeVisible({timeout:15000});
  const metrics=await page.evaluate(()=>{
    const host=document.getElementById('dj-route-v3'),root=host?.shadowRoot;
    const dock=document.getElementById('bottom-nav'),legacy=document.getElementById('route-panel');
    const oldMap=document.getElementById('dj-walk-map-actions'),map=document.getElementById('map');
    if(!root||!dock||!legacy||!map)return null;
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,width:r.width}};
    const card=rect(root.querySelector('.route-panel')),header=rect(root.querySelector('.header'));
    const cta=rect(root.querySelector('.action')),nav=rect(dock);
    const mid=document.elementFromPoint(innerWidth/2,Math.round((card.bottom+cta.top)/2));
    const hit=root.elementFromPoint(cta.left+cta.width/2,cta.top+cta.height/2);
    return {viewport:[innerWidth,innerHeight],card,header,cta,nav,
      oldClip:getComputedStyle(legacy).clipPath,
      oldPointer:getComputedStyle(legacy).pointerEvents,
      oldMapDisplay:oldMap?getComputedStyle(oldMap).display:'none',
      tools:root.querySelectorAll('.tools button').length,
      mapHit:Boolean(mid&&(mid===map||map.contains(mid))),
      ctaHit:Boolean(hit&&(hit===root.querySelector('.action')||root.querySelector('.action').contains(hit)))};
  });
  expect(metrics,'new walking route screen should exist').toBeTruthy();
  expect(metrics.card.top).toBeGreaterThanOrEqual(metrics.header.bottom-3);
  expect(metrics.card.bottom).toBeLessThanOrEqual(metrics.cta.top-96);
  expect(metrics.cta.bottom).toBeLessThanOrEqual(metrics.nav.top-5);
  expect(metrics.cta.height).toBeGreaterThanOrEqual(50);
  expect(metrics.tools).toBe(2);
  expect(metrics.oldClip).toBe('inset(100%)');
  expect(metrics.oldPointer).toBe('none');
  expect(metrics.oldMapDisplay).toBe('none');
  expect(metrics.mapHit).toBe(true);
  expect(metrics.ctaHit).toBe(true);
  await testInfo.attach('real-route-v3-dock.json',{body:Buffer.from(JSON.stringify(metrics,null,2)),contentType:'application/json'});
  await testInfo.attach('real-route-v3-dock.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
});

test('map-first walking route preview only lists actually supplied options and fits the viewport',async({page},testInfo)=>{
  test.skip(page.viewportSize().width>=700,'phone UI only');
  test.setTimeout(120000);
  await readyForLiveTouch(page);
  await page.evaluate(()=>{
    const app=document.getElementById('app');
    app.dataset.tab='map';
    document.getElementById('route-panel').hidden=true;
    document.getElementById('route-map-card').hidden=false;
    window.dispatchEvent(new CustomEvent('dongjak:route-variants-ready',{detail:{
      standard:{coords:[[126.953,37.503],[126.955,37.506]],seconds:1440,kilometers:1.73},
      gentle:{coords:[[126.953,37.503],[126.951,37.504],[126.955,37.506]],seconds:1560,kilometers:1.81}
    }}));
    window.dispatchEvent(new CustomEvent('dongjak:route-pri-ready',{detail:{
      standard:{risk:63.1,coverage:.82},gentle:{risk:22.8,coverage:.91},recommendation:'gentle'
    }}));
  });
  await expect(page.locator('#app')).toHaveAttribute('data-dj-route-stage','preview');
  const cards=page.locator('#dj-route-choice-list .dj-route-choice');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('24분');
  await expect(cards.nth(1)).toContainText('26분');
  await expect(cards.nth(1)).toContainText('PRI 22.8점');
  await expect(page.locator('#dj-route-pri-legend')).toBeVisible();
  await expect(page.locator('#route-guide-start')).toBeVisible();
  await expect(page.locator('#dj-walk-map-head')).toBeVisible();
  const boxes=await page.evaluate(()=>{
    const x=id=>document.getElementById(id).getBoundingClientRect();
    const h=x('dj-walk-map-head'),s=x('route-map-card');
    return {headBottom:h.bottom,sheetTop:s.top,sheetBottom:s.bottom,vh:innerHeight,headLeft:h.left,sheetRight:s.right,vw:innerWidth};
  });
  expect(boxes.headLeft).toBeGreaterThanOrEqual(8);
  expect(boxes.sheetRight).toBeLessThanOrEqual(boxes.vw-8);
  expect(boxes.headBottom).toBeLessThan(boxes.sheetTop);
  expect(boxes.sheetBottom).toBeLessThanOrEqual(boxes.vh-4);
  await testInfo.attach('walk-map-first-preview.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
});

test('guidance mode truly blocks map, tabs and keyboard except native end action',async({page},testInfo)=>{
  test.skip(page.viewportSize().width>=700,'phone UI only');
  test.setTimeout(120000);
  await readyForLiveTouch(page);
  await page.evaluate(()=>{
    const app=document.getElementById('app'),card=document.getElementById('nav-live-card');
    app.dataset.tab='map';
    document.getElementById('route-map-card').hidden=true;
    card.hidden=false;
    app.classList.add('route-guiding');
    window.__djWalkMapTouches=0;
    document.getElementById('map').addEventListener('pointerdown',()=>window.__djWalkMapTouches++);
  });
  await expect(page.locator('#app')).toHaveAttribute('data-dj-route-stage','guiding');
  await expect(page.locator('#dj-walk-guidance-lock')).toBeVisible();
  await expect(page.locator('#nav-stop')).toBeVisible();
  await expect(page.locator('#bottom-nav')).toBeHidden();
  const state=await page.evaluate(()=>{
    const card=document.getElementById('nav-live-card').getBoundingClientRect();
    const stop=document.getElementById('nav-stop').getBoundingClientRect();
    const hit=document.elementFromPoint(stop.left+stop.width/2,stop.top+stop.height/2);
    return {cardTop:card.top,cardBottom:card.bottom,stopTop:stop.top,stopBottom:stop.bottom,
      vh:innerHeight,stopHit:hit?.id==='nav-stop'||document.getElementById('nav-stop').contains(hit),
      otherVisible:['nav-follow','nav-voice','nav-orientation'].some(id=>{
        const el=document.getElementById(id),r=el.getBoundingClientRect();
        return getComputedStyle(el).display!=='none'&&r.width>0&&r.height>0;
      })};
  });
  expect(state.stopHit).toBe(true);
  expect(state.otherVisible).toBe(false);
  expect(state.cardTop).toBeGreaterThan(100);
  expect(state.cardBottom).toBeLessThanOrEqual(state.vh-4);
  await page.mouse.click(25,Math.round(page.viewportSize().height*.5));
  expect(await page.evaluate(()=>window.__djWalkMapTouches)).toBe(0);
  await page.keyboard.press('Tab');
  await expect(page.locator('#nav-stop')).toBeFocused();
  await testInfo.attach('walk-locked-guidance.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  await page.locator('#nav-stop').click({timeout:12000});
  await expect(page.locator('#app')).not.toHaveClass(/route-guiding/);
  await expect(page.locator('#bottom-nav')).toBeVisible();
});

test('community new post portal stays inside viewport when keyboard contracts',async({page},testInfo)=>{
  test.skip(page.viewportSize().width!==390,'single targeted iPhone-size keyboard layout check');
  test.setTimeout(150000);
  await readyForLiveTouch(page);
  await page.locator('#bottom-nav .nav-tab[data-tab="participate"]').click({timeout:12000,noWaitAfter:true});
  await expect(page.locator('#app')).toHaveAttribute('data-tab','participate',{timeout:15000});
  await page.locator('#community-compose-toggle').click({timeout:12000,noWaitAfter:true});
  const portal=page.locator('#dj-community-editor-portal');
  await expect(portal).toBeVisible();
  await expect(page.locator('#community-form')).toBeVisible();
  await expect(page.locator('#bottom-nav')).toBeHidden();
  await page.locator('#community-nickname').focus();
  // Chromium has no native iOS software keyboard. Contract the visual
  // viewport to reproduce the same scrolling/geometry constraint.
  await page.setViewportSize({width:390,height:530});
  await expect.poll(()=>page.evaluate(()=>{
    const portal=document.getElementById('dj-community-editor-portal');
    return Math.round(portal.getBoundingClientRect().height);
  }),{timeout:10000}).toBeLessThanOrEqual(530);
  const geometry=await page.evaluate(()=>{
    const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
    const parent=document.getElementById('community-form').parentElement;
    const root=rect('#dj-community-editor-portal');
    const header=rect('#community-form > .community-form-top');
    const body=rect('#community-form > .dj-compose-scroll');
    const footer=rect('#community-form > .dj-compose-footer');
    return {root,header,body,footer,parentId:parent.id,
      navVisibility:getComputedStyle(document.getElementById('bottom-nav')).visibility,
      layoutHeight:innerHeight,scrollportOverflow:getComputedStyle(document.querySelector('#community-form > .dj-compose-scroll')).overflowY};
  });
  await testInfo.attach('community-keyboard-geometry.json',{body:Buffer.from(JSON.stringify(geometry,null,2)),contentType:'application/json'});
  expect(geometry.parentId).toBe('dj-community-editor-portal');
  expect(geometry.navVisibility).toBe('hidden');
  expect(geometry.scrollportOverflow).toBe('auto');
  expect(geometry.root.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.root.bottom).toBeLessThanOrEqual(geometry.layoutHeight+2);
  expect(geometry.header.bottom).toBeLessThanOrEqual(geometry.body.top+2);
  expect(geometry.body.bottom).toBeLessThanOrEqual(geometry.footer.top+2);
  expect(geometry.footer.bottom).toBeLessThanOrEqual(geometry.root.bottom+2);
  await testInfo.attach('community-keyboard-portrait.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  await page.locator('#community-compose-close').click({timeout:12000,noWaitAfter:true});
  await expect(portal).toBeHidden();
  await expect(page.locator('#bottom-nav')).toBeVisible();
  const restored=await page.locator('#community-form').evaluate(node=>node.parentElement?.id);
  expect(restored).toBe('');
});

// A Chromium viewport mock verifies web-owned geometry and color continuity;
// it does not claim to render the real iOS system keyboard/accessory bar.
test('merged route search returns to AI keyboard without a background seam',async({page},testInfo)=>{
  test.skip(page.viewportSize().width>=700,'phone only');
  test.setTimeout(120000);
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});
    Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'iPhone'});
    Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'});
    const vv=window.visualViewport;
    let height=null,top=0;
    const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(vv),'height');
    Object.defineProperty(vv,'height',{configurable:true,get:()=>height??descriptor.get.call(vv)});
    Object.defineProperty(vv,'offsetTop',{configurable:true,get:()=>top});
    window.__djAiViewport=(h,t=0)=>{height=h;top=t;vv.dispatchEvent(new Event('resize'));};
  });
  await readyForLiveTouch(page);
  // Exercise the merged route V3 state owner before the AI keyboard owner.
  await page.locator('#bottom-nav .nav-tab[data-tab="route"]').click({timeout:15000,noWaitAfter:true});
  const route=page.locator('#dj-route-v3');
  await expect(route).toBeVisible();
  await expect(page.locator('#app > .topbar')).toBeHidden();
  await route.locator('[data-v3="end"]').click();
  await route.locator('#v3-query').fill('상도역');
  await expect(route.locator('#v3-results button').filter({hasText:'상도역'}).first()).toBeVisible();
  await route.locator('[data-v3="search-back"]').click();
  await expect(route.locator('[data-v3-screen="search"]')).toBeHidden();
  await route.locator('[data-v3="close"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
  await expect(route).toBeHidden();
  await page.locator('#dj890-ai-orb').click({timeout:15000});
  const modal=page.locator('#dj-ai-search-modal');
  await expect(modal).toBeVisible();
  if(await modal.locator('[data-profile="adult"]').isVisible())await modal.locator('[data-profile="adult"]').click();
  const input=modal.locator('#dj-ai-query');await expect(input).toBeEnabled();
  await input.focus();
  const h=page.viewportSize().height;
  await page.evaluate(height=>window.__djAiViewport(height,0),h-350);
  await expect(modal).toHaveAttribute('data-dj-ai-keyboard','true');
  await expect.poll(()=>page.evaluate(()=>{
    const m=document.getElementById('dj-ai-search-modal'),r=m.getBoundingClientRect(),footer=m.querySelector('.dj-ai-composer').getBoundingClientRect();
    const bg=getComputedStyle(m).backgroundColor;
    return {root:getComputedStyle(document.documentElement).backgroundColor===bg,body:getComputedStyle(document.body).backgroundColor===bg,top:Math.abs(r.top-visualViewport.offsetTop)<=2,bottom:Math.abs(r.bottom-visualViewport.height-visualViewport.offsetTop)<=2,footer:r.bottom-footer.bottom>=-2&&r.bottom-footer.bottom<=10};
  })).toEqual({root:true,body:true,top:true,bottom:true,footer:true});
  await testInfo.attach('ai-keyboard-contract.png',{body:await page.screenshot(),contentType:'image/png'});
  await input.evaluate(n=>n.blur());
  await expect(modal).toHaveAttribute('data-dj-ai-keyboard','true');
  await page.evaluate(()=>window.__djAiViewport(null));
  await expect(modal).toHaveAttribute('data-dj-ai-keyboard','false');
  await modal.getByRole('button',{name:'AI 검색 닫기'}).click();
  await expect(modal).toBeHidden();
});
