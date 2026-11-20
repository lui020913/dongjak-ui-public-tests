import {expect} from './live-qa-fixture.mjs';
export const compact=page=>page.viewportSize().width<1080||page.viewportSize().width===1180;
export const tab=(page,key)=>page.locator('#bottom-nav .nav-tab[data-tab="'+key+'"]');
export async function tap(page,locator){
 await expect(locator).toBeVisible();
 try{
   await expect.poll(()=>locator.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===n||n.contains(hit)})).toBe(true);
 }catch(error){
   const hit=await locator.evaluate(n=>{const r=n.getBoundingClientRect();return {target:{id:n.id,className:n.getAttribute('class'),rect:[r.x,r.y,r.width,r.height]},layers:document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2).slice(0,8).map(e=>({tag:e.tagName,id:e.id,className:e.getAttribute('class'),pointerEvents:getComputedStyle(e).pointerEvents}))};});
   console.log('UI_HIT_DIAGNOSTIC',JSON.stringify(hit));throw error;
 }
 const r=await locator.boundingBox();await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
}
export async function ready(page,{keepTour=false}={}){
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
export async function geometry(page,sel){
 await expect.poll(async()=>{const p=await page.locator(sel).boundingBox(),n=await page.locator('#bottom-nav').boundingBox();return p&&n?n.y-p.y-p.height:-1000}).toBeGreaterThanOrEqual(5);
}
export async function visuallyPresented(locator){
 await expect.poll(()=>locator.evaluate(n=>{
   const r=n.getBoundingClientRect();
   if(r.width<1||r.height<1||r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight)return false;
   for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility!=='visible'||Number(s.opacity)<.98)return false;}
   const x=r.left+r.width/2,y=r.top+r.height/2;
   const hit=document.elementFromPoint(x,y);
   return hit===n||n.contains(hit);
 })).toBe(true);
}
export async function enter(page,id,key){
 await page.evaluate(id=>{
   const frames=[];window.__auditFrames=frames;const until=performance.now()+60000;
   function sample(){const n=document.getElementById(id);if(n?.dataset.dj810Animating==='opening'){const c=getComputedStyle(n);frames.push({o:Number(c.opacity),t:c.translate,p:c.clipPath,kind:n.dataset.djWindowMotionKind,y:n.getBoundingClientRect().y});}if(performance.now()<until&&window.__auditFrames===frames)requestAnimationFrame(sample);}
   requestAnimationFrame(sample);
 },id);
 await tap(page,tab(page,key));await expect(page.locator('#'+id)).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__auditFrames.length)).toBeGreaterThan(1);
 await expect.poll(()=>page.locator('#'+id).getAttribute('data-dj810-animating')).toBeNull();
 await expect(page.locator('#'+id)).toHaveCSS('opacity','1');
 const frames=await page.evaluate(()=>window.__auditFrames);
 expect(frames.every(f=>f.kind==='fade')).toBe(true);
 expect(frames.some(f=>f.o>0&&f.o<1)).toBe(true);
 expect(frames.every(f=>Math.abs(f.y-frames[0].y)<1)).toBe(true);
 await geometry(page,'#'+id);
}
