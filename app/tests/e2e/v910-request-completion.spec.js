import {test,expect} from '@playwright/test';
import {openMapPage,clickRealPointer,navTab} from './helpers.js';
const compact=page=>page.viewportSize().width<1080;
async function clearDock(page){
 await expect(page.locator('#bottom-nav')).toBeVisible();
}
async function assertFullTab(page,selector){
 const pageHeight=await page.evaluate(()=>document.documentElement.clientHeight);
 await expect.poll(async()=>{const box=await page.locator(selector).boundingBox();return box&&Math.abs(box.y)<=3&&Math.abs(box.x)<=3&&Math.abs(box.height-pageHeight)<=4;},{timeout:5000}).toBe(true);
 await expect(page.locator('#bottom-nav')).toBeVisible();
 await expect(page.locator('.topbar')).toBeHidden();
}
async function assertAboveDock(page,selector){
 await expect.poll(async()=>{const b=await page.locator(selector).boundingBox(),n=await page.locator('#bottom-nav').boundingBox();return b&&n?n.y-(b.y+b.height):-1;},{timeout:5000}).toBeGreaterThanOrEqual(5);
 const box=await page.locator(selector).boundingBox();const nav=await page.locator('#bottom-nav').boundingBox();
 expect(box,'visible sheet '+selector).toBeTruthy();expect(nav).toBeTruthy();
 expect(box.y+box.height,'sheet must leave navigation unobscured').toBeLessThanOrEqual(nav.y-5);
}
test('header, theme, language, settings, news and navigation retain usable hit targets',async({page},info)=>{
 await openMapPage(page);await expect(page.locator('#app')).toHaveAttribute('data-dj910-ready','1');
 const logo=page.locator(compact(page)?'#dj-settings-mobile':'#dj-about-pc');
 await expect(logo).toBeVisible();expect(await logo.evaluate(n=>n.parentElement.classList.contains('map-quick-search-form'))).toBe(true);
 await clickRealPointer(page,logo,'search logo');await expect(page.locator('#dj-app-about')).toBeVisible();
 await page.locator('.dj-about-close').click({noWaitAfter:true});
 await clearDock(page);await clickRealPointer(page,navTab(page,'mine'),'my info');
 await expect(page.locator('#mine-panel')).toBeInViewport();
 await expect(page.locator('#mine-panel')).toHaveCSS('opacity','1');
 console.log('MINE_GEOMETRY',await page.locator('#mine-panel').evaluate(n=>({rect:n.getBoundingClientRect().toJSON(),style:{z:getComputedStyle(n).zIndex,visibility:getComputedStyle(n).visibility,clip:getComputedStyle(n).clipPath,opacity:getComputedStyle(n).opacity,translate:getComputedStyle(n).translate}})));
 const language=page.locator('#dj854-language-select');await language.selectOption('en');
 await expect(page.locator('.dj834-profile-card')).toContainText('Sign in or create an account');
 await expect(page.locator('#map-quick-search-query')).toHaveAttribute('placeholder','Where are you going?');
 await page.screenshot({path:`visual-v910/${info.project.name}-english.png`});
 await language.selectOption('ko');
 // Theme uses the native button and applies without waiting for tile idle.
 await clickRealPointer(page,page.locator('[data-dj834-action=theme]'),'theme');
 await expect(page.locator('#dj840-theme-confirm')).toBeVisible();
 await clickRealPointer(page,page.locator('#dj840-theme-confirm [data-decision=confirm]'),'confirm theme');
 await expect(page.locator('#app')).toHaveAttribute('data-theme','dark');
 await expect(page.locator('.dj-theme-switch-flash')).toBeHidden({timeout:1500});
 await expect(page.locator('#dj-full-transition')).toBeHidden({timeout:1500});
 await expect(page.locator('#mine-panel')).toHaveCSS('background-color','rgb(25, 27, 31)',{timeout:1500});
 await expect.poll(()=>page.locator('.dj834-profile-card').evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgb(37, 40, 45)');
 await expect(page.locator('.dj834-profile-name')).toHaveCSS('color','rgb(229, 231, 235)');
 await page.screenshot({path:`visual-v910/${info.project.name}-dark.png`});
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('dj:open-map-settings')));
 await expect(page.locator('#dj-map-settings')).toBeVisible();
 expect(await page.locator('#dj-map-settings .dj877-legend-grid').count()).toBe(0);
 if(compact(page))await assertAboveDock(page,'#dj-map-settings .dj-map-settings-card');
 await clickRealPointer(page,page.locator('#dj-settings-done'),'settings done');
 await clickRealPointer(page,navTab(page,'news'),'news');
 const radius=await page.locator('#dongjak-news-refresh').evaluate(n=>getComputedStyle(n).borderRadius);expect(parseFloat(radius)).toBeGreaterThan(20);
 if(page.viewportSize().width<700)await assertFullTab(page,'#news-panel');
 else if(compact(page))await assertAboveDock(page,'#news-panel');
 await page.screenshot({path:`visual-v910/${info.project.name}-news.png`});
 await clickRealPointer(page,navTab(page,'route'),'directions');
 await expect(page.locator('#route-panel')).toBeVisible();
 await expect(page.locator('#app')).toHaveAttribute('data-tab','route');
 if(compact(page))await expect(page.locator('#route-calc')).toBeInViewport();
 const primary=await page.locator('#route-calc').evaluate(n=>getComputedStyle(n).backgroundColor);
 const multimodal=await page.locator('#dj815-rail-planner > button').evaluate(n=>getComputedStyle(n).backgroundColor);expect(primary).toBe(multimodal);
 if(page.viewportSize().width<700)await assertFullTab(page,'#route-panel');
 else if(compact(page))await assertAboveDock(page,'#route-panel');
 await page.screenshot({path:`visual-v910/${info.project.name}-route.png`});
});
test('actual transit controller: compact station and bus header, marker focus and route colors',async({page},info)=>{
 await page.route('**/api/transport/bus?**',route=>route.fulfill({json:{status:'ok',items:[{route:'641',routeType:'3',destination:'양재동',message:'출발대기'},{route:'650',routeType:'3',destination:'낙성대입구',message:'출발대기'},{route:'6515',routeType:'4',destination:'경인교육대학교',message:'출발대기'},{route:'N15',destination:'남태령역',message:'18분후 [9정거장 전]'}]}}));
 await openMapPage(page);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place:{kind:'subway',name:'장승배기',lng:126.9298,lat:37.5048,lines:['7호선'],selectedLine:'7호선'}}})));
 const sheet=page.locator('#transport-sheet');await expect(sheet).toBeVisible({timeout:45000});
 await expect(sheet).toHaveCSS('opacity','1');
 await expect(page.locator('#transport-title')).toContainText('장승배기');
 await expect(page.locator('#transport-save-place svg')).toBeVisible();
 const pin=page.locator('.dj-selected-transport-location');await expect(pin).toBeVisible();
 if(compact(page)){
   await assertAboveDock(page,'#transport-sheet');
   await page.screenshot({path:`visual-v910/${info.project.name}-metro-focus.png`});
   console.log('PIN_GEOMETRY',await pin.boundingBox(),await sheet.boundingBox(),await page.locator('#dj-v794-toolbar').boundingBox());
   await expect.poll(async()=>{
    const p=await pin.boundingBox(),s=await sheet.boundingBox(),t=await page.locator('#dj-v794-toolbar').boundingBox();
    return p&&s&&t&&p.y>t.y+t.height&&p.y+p.height<s.y;
   },{timeout:30000}).toBe(true);
   const head=await page.locator('.transport-panel-head').boundingBox();expect(head.height).toBeLessThan(130);
 }
 await page.screenshot({path:`visual-v910/${info.project.name}-metro.png`});
 await clickRealPointer(page,page.locator('#transport-close'),'close metro');
 await expect(sheet).toBeHidden();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place:{kind:'bus',name:'노량진역5번출구',lng:126.9423,lat:37.5133,arsId:'20240'}}})));
 await expect(sheet).toBeVisible();await expect(sheet).toHaveAttribute('data-kind','bus');
 await expect(page.locator('.dj-transit-bus-route').filter({hasText:/^641$/})).toHaveAttribute('data-bus-class','trunk');
 await expect(page.locator('.dj-transit-bus-route').filter({hasText:/^6515$/})).toHaveAttribute('data-bus-class','branch');
 await expect(page.locator('#transport-arrivals')).toContainText('양재동 방면');
 if(compact(page)){
   await assertAboveDock(page,'#transport-sheet');
   await expect(page.locator('#transport-kind')).toBeHidden();
   const cards=page.locator('#transport-arrivals .transport-arrival-row');
   await expect.poll(()=>cards.evaluateAll(rows=>{
     if(rows.length<2)return false;
     const [first,second]=rows.map(row=>row.getBoundingClientRect());
     const main=rows[0].querySelector('.transport-arrival-main').getBoundingClientRect();
     const eta=rows[0].querySelector('.transport-arrival-time').getBoundingClientRect();
     return first.width>0&&second.width>0&&Math.abs(first.y-second.y)<3&&
       second.x>first.right&&eta.left>=main.right-1&&eta.top<eta.bottom&&eta.bottom<=first.bottom;
   })).toBe(true);
   await expect(page.locator('#transport-arrivals')).toContainText('18분 후');
   await expect(page.locator('#transport-arrivals')).toContainText('9 정거장 전');
 }
 await page.screenshot({path:`visual-v910/${info.project.name}-bus.png`});
});
test('facility metadata, AI and favorites scroll inside the compact card above navigation',async({page},info)=>{
 await openMapPage(page);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:map-place-selected',{detail:{place:{name:'동작도서관',category:'공공기관',address:'서울특별시 동작구 장승배기로 94',phone:'02-823-6417',website:'https://djlib.sen.go.kr',lng:126.9304,lat:37.5059}}})));
 const popup=page.locator('.dj-place-detail-popup');await expect(popup).toBeVisible();
 await expect(popup.locator('.dj-place-header-title')).toContainText('동작도서관');
 if(compact(page)){
  await assertAboveDock(page,'.dj-place-detail-popup');
  const header=await popup.locator('.dj-place-header').boundingBox();expect(header.height).toBeLessThan(135);
  const meta=await popup.locator('.dj-place-info-card').boundingBox();expect(meta.height).toBeLessThan(150);
  const b=await popup.locator('.dj-place-body').evaluate(n=>({client:n.clientHeight,scroll:n.scrollHeight,overflow:getComputedStyle(n).overflowY}));
  expect(b.client).toBeGreaterThan(80);expect(b.overflow).toBe('auto');
 }
 await expect(popup).toHaveCSS('opacity','1');
 await expect(popup.locator('.maplibregl-popup-content')).toHaveCSS('opacity','1');
 await page.screenshot({path:`visual-v910/${info.project.name}-facility.png`});
 const ai=popup.locator('.dj-place-ai-heading');await ai.scrollIntoViewIfNeeded();await expect(ai).toBeVisible();
 await clickRealPointer(page,popup.locator('.dj-place-header-close'),'facility close');
 await expect(popup).toBeHidden();
});

test('compact navigation renders real intermediate fade and slide frames, not only final geometry',async({page})=>{
 test.skip(!compact(page),'compact motion owner only');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await openMapPage(page);
 const capture=async(id,tab,slide)=>{
   await page.evaluate(id=>{
     const frames=[];window.__v911MotionFrames=frames;
     const until=performance.now()+60000;
     function sample(){
       const node=document.getElementById(id);
       if(node?.dataset.dj810Animating==='opening'){
         const style=getComputedStyle(node);
         frames.push({opacity:Number(style.opacity),translate:style.translate,clip:style.clipPath});
       }
       if(performance.now()<until&&window.__v911MotionFrames===frames)requestAnimationFrame(sample);
     }
     requestAnimationFrame(sample);
   },id);
   await clickRealPointer(page,navTab(page,tab),tab);
   await expect(page.locator('#'+id)).toBeVisible();
   await expect.poll(()=>page.evaluate(()=>window.__v911MotionFrames.length),{timeout:20000,message:id+' must render multiple motion frames'}).toBeGreaterThan(1);
   await expect(page.locator('#'+id)).not.toHaveAttribute('data-dj810-animating','opening');
   await expect(page.locator('#'+id)).toHaveCSS('opacity','1');
   const frames=await page.evaluate(()=>window.__v911MotionFrames);
   expect(frames.some(f=>f.opacity>.05&&f.opacity<.75),'visible intermediate fade').toBe(true);
   if(slide)expect(frames.some(f=>(f.translate!=='none'&&f.translate.split(' ').some(v=>parseFloat(v)>2))||(f.clip!=='none'&&parseFloat(f.clip.replace('inset(',''))>4)),'visible intermediate slide or dock-safe reveal').toBe(true);
   if(!slide)expect(frames.every(f=>f.translate==='none'||f.translate.split(' ').every(v=>Math.abs(parseFloat(v))<.5)),'fixed-position fade').toBe(true);
   await assertAboveDock(page,'#'+id);
 };
 await capture('route-panel','route',true);
 await clickRealPointer(page,navTab(page,'map'),'map');
 await expect(page.locator('#route-panel')).toBeHidden();
 await capture('mine-panel','mine',false);
});

test('compact More retains working native actions and close hit target',async({page})=>{
 test.skip(!compact(page),'compact More only');
 await openMapPage(page);
 await clickRealPointer(page,page.locator('#dj-v794-more'),'More');
 const panel=page.locator('#dj-mobile-utilities'),close=page.locator('#dj-mobile-utilities-close');
 await expect(panel).toBeVisible();await expect(panel).toHaveCSS('opacity','1');
 const p=await panel.boundingBox(),b=await close.boundingBox();
 expect(p.x+p.width-b.x-b.width).toBeLessThan(24);
 await clickRealPointer(page,close,'More close');await expect(panel).toBeHidden();
 await clickRealPointer(page,page.locator('#dj-v794-more'),'More again');
 await expect(panel).toBeVisible();
 await clickRealPointer(page,page.locator('#dj-mobile-settings'),'More settings');
 await expect(page.locator('#dj-map-settings')).toBeVisible();
 await expect(panel).toBeHidden();
});
