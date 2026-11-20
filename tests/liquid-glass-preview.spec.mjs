import {test,expect} from '@playwright/test';
const tab=(page,key)=>page.locator('#bottom-nav .nav-tab[data-tab="'+key+'"]');
async function tap(page,locator){
 await expect(locator).toBeVisible();
 try{
   await expect.poll(()=>locator.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===n||n.contains(hit)})).toBe(true);
 }catch(error){
   const hit=await locator.evaluate(n=>{const r=n.getBoundingClientRect();return {target:{id:n.id,className:n.getAttribute('class'),rect:[r.x,r.y,r.width,r.height]},layers:document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2).slice(0,8).map(e=>({tag:e.tagName,id:e.id,className:e.getAttribute('class'),pointerEvents:getComputedStyle(e).pointerEvents}))};});
   console.log('UI_HIT_DIAGNOSTIC',JSON.stringify(hit));throw error;
 }
 const r=await locator.boundingBox();await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
}
async function ready(page,{keepTour=false}={}){
 await page.goto('/',{waitUntil:'domcontentloaded'});
 if(page.viewportSize().width<700){
   const menu=page.locator('#dj-install-menu');
   if(!await page.evaluate(()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches))await expect(menu).toBeAttached({timeout:20000});
   if(await menu.isVisible()){
     await expect(menu.locator('.dj-install-choice')).toHaveCount(4);
     await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
     await expect(menu).toBeHidden();
   }
 }
 await expect(page.locator('#map')).toBeVisible({timeout:45000});
 const startup=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
 await expect.poll(async()=>!await startup.isVisible()||await next.isVisible(),{timeout:60000}).toBe(true);
 if(await startup.isVisible()&&await next.isVisible())await tap(page,next);
 await expect(startup).toBeHidden({timeout:30000});
 await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state',/^(signed-out|signed-in)$/,{timeout:30000});
 // Fresh anonymous context, never enter credentials.
 const tour=page.locator('#dj860-onboarding');
 await expect(page.locator('#app')).toHaveAttribute('data-dj860-auto-resolved','true',{timeout:45000});
 await expect(tour).toBeVisible({timeout:30000});
 await visuallyPresented(tour);
 if(keepTour)return;
 await tour.locator('[data-dj860-action="skip"]').click();
 await expect(tour).toBeHidden();
}
async function visuallyPresented(locator){
 await expect.poll(()=>locator.evaluate(n=>{
   const r=n.getBoundingClientRect();
   if(r.width<1||r.height<1||r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight)return false;
   for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility!=='visible'||Number(s.opacity)<.98)return false;}
   const x=r.left+r.width/2,y=r.top+r.height/2;
   const hit=document.elementFromPoint(x,y);
   return hit===n||n.contains(hit);
 })).toBe(true);
}

async function isGlass(locator,{blur=true}={}){
 await expect(locator).toBeVisible();
 await expect.poll(()=>locator.evaluate(n=>{const c=getComputedStyle(n);return {gradient:c.backgroundImage.includes('linear-gradient'),blur:(c.backdropFilter||c.webkitBackdropFilter||'').includes('blur(')};})).toEqual({gradient:true,blur});
}
test('glass material persists when real sheets and tabs open',async({page})=>{
 await ready(page);
 const nav=page.locator('#bottom-nav');
 await isGlass(nav);
 await isGlass(page.locator('.topbar .map-quick-search-form'));
 await tap(page,page.locator('#djNext-layers'));
 const layer=page.locator('#djNext-layer-panel');
 await isGlass(layer.locator('.djNext-modal-body'));
 await isGlass(layer.locator('.djNext-modal-body > header'),{blur:false});
 await layer.getByRole('button',{name:'레이어 설정 닫기'}).click();
 await expect(layer).toBeHidden();
 for(const [key,id] of [['route','route-panel'],['news','news-panel'],['mine','mine-panel']]){
  await tap(page,tab(page,key));await isGlass(page.locator('#'+id));await isGlass(nav);
 }
 await tap(page,tab(page,'map'));await isGlass(nav);
 // Verify dark cascade directly without triggering PWA theme reload.
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.querySelector('#app').dataset.theme='dark';});
 await isGlass(nav);
 await expect.poll(()=>nav.evaluate(n=>getComputedStyle(n).getPropertyValue('--lg-ink').trim())).toBe('#edf8f3');
 await tap(page,page.locator('#djNext-layers'));await isGlass(layer.locator('.djNext-modal-body'));
 await isGlass(layer.locator('.djNext-modal-body > header'),{blur:false});
 await page.screenshot({path:test.info().outputPath('glass-dark-layer.png')});
});
