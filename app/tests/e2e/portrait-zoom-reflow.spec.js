import {test, expect} from '@playwright/test';
import {openMapPage} from './helpers.js';

/*
 * Geometry-only regression for portrait desktop monitors and desktop zoom.
 * No external transport API or GPS is required; the real application's
 * transport DOM is made visible only inside this disposable test page.
 */
test('portrait and zoom CSS widths keep navigation and transport surfaces bounded', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Desktop browser responsive audit');
  test.setTimeout(120000);

  await page.goto('/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transport-sheet', {state:'attached',timeout:30000});

  const sizes = [
    [700,900], [768,1024], [820,1180], [839,900],
    [840,900], [900,1100], [1024,768], [1079,900],
    [1080,800], [1280,800], [1440,900], [1920,1080],
  ];

  for (const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    const layout = await page.evaluate(() => {
      const sheet = document.querySelector('#transport-sheet');
      const header = document.querySelector('#app .topbar');
      const search = document.querySelector('#app .topbar > .map-quick-search');
      const tools = document.querySelector('#app .topbar > .header-tools');
      const nav = document.querySelector('#bottom-nav');
      sheet.hidden = false;
      sheet.classList.remove('dj871-sheet-expanded','dj-float-user-positioned','dj-sheet-dragging');
      sheet.dataset.kind='subway';
      const box = el => {
        const r=el.getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      };
      const css=getComputedStyle(sheet);
      // Chromium resolves used bottom:auto to a numeric value for fixed boxes.
      // Measure actual whitespace beneath the last visible child instead.
      const rect=sheet.getBoundingClientRect();
      const visibleChildren=[...sheet.children].filter(child=>{
        const style=getComputedStyle(child), bounds=child.getBoundingClientRect();
        return style.display!=='none' && style.visibility!=='hidden' && bounds.height>0;
      });
      const lastContentBottom=Math.max(rect.top,...visibleChildren.map(child=>child.getBoundingClientRect().bottom));
      return {
        viewport:{width:innerWidth,height:innerHeight},
        header:box(header),
        search:box(search),
        tools:box(tools),
        nav:box(nav),
        toolDock:box(nav.querySelector('#dj-tablet-utility-group')),
        toolDockHidden:nav.querySelector('#dj-tablet-utility-group')?.hidden,
        legacyToolsDisplay:getComputedStyle(document.querySelector('#map-tools-toggle')).display,
        legacySafetyDisplay:getComputedStyle(document.querySelector('#map-safety-toggle')).display,
        tabletToolCount:nav.querySelectorAll('.dj-tablet-utility-button').length,
        tabBoxes:[...nav.querySelectorAll('.nav-tab')].map(box),
        transport:box(sheet),
        sheetBottom:css.bottom,
        contentBottomGap:Math.max(0, rect.bottom-lastContentBottom),
        sheetHeight:css.height,
        sheetScrollHeight:sheet.scrollHeight,
        sheetClientHeight:sheet.clientHeight,
        handleDisplay:getComputedStyle(sheet.querySelector(':scope > .handle')).display,
      };
    });

    console.log('VIEWPORT_GEOMETRY', JSON.stringify(layout));
    expect.soft(layout.viewport.width, `wrong responsive viewport at ${width}`).toBe(width);
    expect.soft(layout.transport.left,`sheet off left edge ${width}`).toBeGreaterThanOrEqual(-1);
    expect.soft(layout.transport.right,`sheet off right edge ${width}`).toBeLessThanOrEqual(width+1);
    expect.soft(layout.transport.top,`sheet off top edge ${width}`).toBeGreaterThanOrEqual(0);
    expect.soft(layout.transport.bottom,`sheet off bottom edge ${width}`).toBeLessThanOrEqual(height+1);
    expect.soft(layout.contentBottomGap,`unexpected empty region below transit content at ${width}`).toBeLessThanOrEqual(48);
    expect.soft(layout.handleDisplay,`desktop drag handle visible at ${width}`).toBe('none');

    expect.soft(layout.header.right,`header exceeds viewport at ${width}`).toBeLessThanOrEqual(width+1);
    expect.soft(layout.search.right,`search exceeds viewport at ${width}`).toBeLessThanOrEqual(width+1);
    expect.soft(layout.tools.right,`tools exceed viewport at ${width}`).toBeLessThanOrEqual(width+1);

    if(width<=1079){
      expect.soft(layout.nav.left,`bottom dock offscreen at ${width}`).toBeGreaterThanOrEqual(-1);
      expect.soft(layout.nav.right,`bottom dock overflow at ${width}`).toBeLessThanOrEqual(width+1);
      expect.soft(layout.nav.bottom,`bottom dock beyond screen at ${width}`).toBeLessThanOrEqual(height+1);
      expect.soft(layout.nav.top,`bottom dock starts above header at ${width}`).toBeGreaterThan(layout.header.bottom);
      for(const [i,tab] of layout.tabBoxes.entries()){
        expect.soft(tab.left,`tab ${i} left overflow at ${width}`).toBeGreaterThanOrEqual(layout.nav.left-1);
        expect.soft(tab.right,`tab ${i} right overflow at ${width}`).toBeLessThanOrEqual(layout.nav.right+1);
      }

      // This must test the intended layout, not only that elements happen to
      // remain within the viewport (the old 620px card passed that weak test).
      expect.soft(layout.transport.width,`tablet panel must be compact at ${width}`).toBeLessThanOrEqual(471);
      expect.soft(layout.transport.top,`panel overlaps header at ${width}`).toBeGreaterThanOrEqual(layout.header.bottom+5);
      // Tablet uses a VERTICAL left navigation rail beside the map card.
      // Rectangles must not collide horizontally, even if their Y spans overlap.
      expect.soft(layout.nav.width,`tablet navigation must be a compact rail at ${width}`).toBeLessThanOrEqual(102);
      expect.soft(layout.nav.right,`transport card overlaps the tablet navigation rail at ${width}`).toBeLessThanOrEqual(layout.transport.left-8);
      expect.soft(layout.nav.height,`tablet navigation must be vertical at ${width}`).toBeGreaterThan(270);
      for(let i=1;i<layout.tabBoxes.length;i++){
        expect.soft(layout.tabBoxes[i].top,`rail actions not stacked vertically at ${width}`).toBeGreaterThan(layout.tabBoxes[i-1].bottom-1);
      }
      // Genuine tablet layout: one compact row at ALL widths, even 700px.
      expect.soft(layout.header.height,`tablet header must be single-row at ${width}`).toBeLessThanOrEqual(76);
      expect.soft(layout.header.height,`tablet header too small at ${width}`).toBeGreaterThanOrEqual(60);
      expect.soft(Math.abs(layout.search.top-layout.tools.top),`header items are staggered at ${width}`).toBeLessThanOrEqual(8);
      expect.soft(layout.toolDockHidden,`tablet tool dock hidden at ${width}`).toBe(false);
      expect.soft(layout.toolDock.top,`secondary map tools appear above primary navigation at ${width}`).toBeGreaterThanOrEqual(layout.tabBoxes[layout.tabBoxes.length-1].bottom-1);
      expect.soft(layout.toolDock.left,`tool dock outside rail at ${width}`).toBeGreaterThanOrEqual(layout.nav.left-1);
      expect.soft(layout.toolDock.right,`tool dock outside rail at ${width}`).toBeLessThanOrEqual(layout.nav.right+1);
      expect.soft(layout.toolDock.bottom,`tool dock below viewport at ${width}`).toBeLessThanOrEqual(height+1);
      expect.soft(layout.tabletToolCount,`missing tablet tools at ${width}`).toBe(3);
      expect.soft(layout.legacyToolsDisplay,`old floating options button remains at ${width}`).toBe('none');
      expect.soft(layout.legacySafetyDisplay,`old floating safety button remains at ${width}`).toBe('none');

      const horizontalOverlap = layout.search.right > layout.tools.left + 1 &&
        layout.search.left < layout.tools.right - 1 &&
        layout.search.bottom > layout.tools.top + 1 &&
        layout.search.top < layout.tools.bottom - 1;
      expect.soft(horizontalOverlap,`header search/tools overlap at ${width}`).toBe(false);
    }
  }
});

test('phone keeps its established bottom sheet contract', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile only');
  test.setTimeout(90000);
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transport-sheet', {state:'attached',timeout:30000});
  for(const [width,height] of [[375,812],[390,844],[430,932]]){
    await page.setViewportSize({width,height});
    const x=await page.evaluate(()=>{
      const sheet=document.querySelector('#transport-sheet');
      sheet.hidden=false;
      sheet.dataset.kind='subway';
      const s=getComputedStyle(sheet);
      const r=sheet.getBoundingClientRect();
      return {width:innerWidth,bottom:s.bottom,left:r.left,right:r.right,viewportHeight:innerHeight};
    });
    expect.soft(x.width).toBe(width);
    expect.soft(x.left).toBeGreaterThanOrEqual(-1);
    expect.soft(x.right).toBeLessThanOrEqual(width+1);
    expect.soft(x.bottom).not.toBe('auto');
  }
});


test('touch tablet landscape retains tablet workspace while desktop stays desktop', async ({browser}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop','Chromium desktop browser fixture');
  test.setTimeout(150000);
  const tablet = await browser.newContext({viewport:{width:1194,height:834},isMobile:true,hasTouch:true});
  const page = await tablet.newPage();
  try {
    // Exercise the real startup continue button and dismiss onboarding before
    // asserting pointer hit targets. The 16,000-z-index loading overlay is
    // intentionally above map controls until startup settles.
    await openMapPage(page);
    const data = await page.evaluate(()=>{
      const rect=q=>document.querySelector(q).getBoundingClientRect();
      return {
        coarse:matchMedia('(pointer:coarse)').matches,
        rail:rect('#bottom-nav'), header:rect('.topbar'),
        search:rect('.topbar>.map-quick-search'),
        options:rect('#map-tools-toggle'),
        toolDock:rect('#dj-tablet-utility-group'),
        toolDockHidden:document.querySelector('#dj-tablet-utility-group')?.hidden,
        legacyToolsDisplay:getComputedStyle(document.querySelector('#map-tools-toggle')).display,
        mapActions:rect('.map-actions'),
        innerWidth:innerWidth,innerHeight:innerHeight,
        visualScale:visualViewport?.scale,devicePixelRatio:devicePixelRatio,
        navComputedWidth:getComputedStyle(document.querySelector('#bottom-nav')).width,
        navTransform:getComputedStyle(document.querySelector('#bottom-nav')).transform,
        optionsComputedTop:getComputedStyle(document.querySelector('#map-tools-toggle')).top,
        optionsComputedLeft:getComputedStyle(document.querySelector('#map-tools-toggle')).left,
        optionsPosition:getComputedStyle(document.querySelector('#map-tools-toggle')).position,
        optionsTransform:getComputedStyle(document.querySelector('#map-tools-toggle')).transform,
        optionsTranslate:getComputedStyle(document.querySelector('#map-tools-toggle')).translate,
        appTransform:getComputedStyle(document.querySelector('#app')).transform,
        metaViewport:document.querySelector('meta[name="viewport"]')?.content,
      };
    });
    console.log('TABLET_LANDSCAPE_METRICS',JSON.stringify(data));
    expect(data.coarse).toBe(true);
    expect(data.rail.width).toBeLessThanOrEqual(102);
    expect(data.rail.height).toBeGreaterThan(260);
    expect(data.rail.top).toBeGreaterThan(data.header.bottom);
    expect(data.header.height).toBeLessThanOrEqual(76);
    expect(data.toolDockHidden).toBe(false);
    expect(data.legacyToolsDisplay).toBe('none');
    expect(data.toolDock.top).toBeGreaterThan(data.header.bottom);
    expect(data.toolDock.left).toBeGreaterThanOrEqual(data.rail.left-1);
    expect(data.toolDock.right).toBeLessThanOrEqual(data.rail.right+1);
    expect(data.mapActions.right).toBeLessThanOrEqual(1195);
    // Real native map options must suppress right-side canvas buttons; otherwise
    // the fixed map control stack intercepts the settings panel close button.
    const optionsState=await page.evaluate(()=>{
      document.getElementById('map-tools-toggle').click();
      const app=document.getElementById('app');
      const actions=document.querySelector('.map-actions');
      const close=document.getElementById('map-options-desktop-close');
      const r=close.getBoundingClientRect();
      const target=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {
        expanded:app.classList.contains('map-controls-open'),
        controlVisible:getComputedStyle(actions).visibility,
        hitClose:close===target||close.contains(target),
        closeVisible:getComputedStyle(close).visibility,
        closeRect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},
        topHit:{tag:target?.tagName,id:target?.id,cls:target?.className,
          parent:target?.parentElement?.id||target?.parentElement?.className,
          zIndex:target?getComputedStyle(target).zIndex:null},
        parentClass:close.parentElement?.className,
        closePosition:getComputedStyle(close).position,
        closeZIndex:getComputedStyle(close).zIndex,
        blockers:document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2)
          .slice(0,6).map(el=>({tag:el.tagName,id:el.id,cls:String(el.className).slice(0,120),z:getComputedStyle(el).zIndex})),
      };
    });
    console.log('TABLET_OPTION_CLOSE_HIT',JSON.stringify(optionsState));
    expect(optionsState.expanded).toBe(true);
    expect(optionsState.controlVisible).toBe('hidden');
    expect(optionsState.closeVisible).not.toBe('hidden');
    expect(optionsState.hitClose).toBe(true);
  }finally{await tablet.close();}
});
