import { test, expect } from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const output='quality-report/ui-touch-diagnosis';
mkdirSync(output,{recursive:true});
const report={checks:[],createdAt:new Date().toISOString()};
function save(name){writeFileSync(output+'/'+name+'.json',JSON.stringify(report,null,2));}
async function setup(page,tab){
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({colorScheme:'light'});
  const response=await page.goto('/',{waitUntil:'domcontentloaded',timeout:30000});
  expect(response.status()).toBeLessThan(400);
  await expect(page.locator('#map')).toBeVisible({timeout:30000});
  const startup=page.locator('#map-startup-overlay');
  if(await startup.count())await expect(startup).toBeHidden({timeout:60000});
  await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state',/^(signed-out|signed-in)$/,{timeout:30000});
  const menu=page.locator('dialog#dj-install-menu[open]');
  if(await menu.isVisible().catch(()=>false)){
    await menu.getByRole('button',{name:/웹에서 바로 이용하기/}).click({noWaitAfter:true,timeout:15000});
    await expect(menu).toBeHidden({timeout:15000});
  }
  const tour=page.locator('#dj860-onboarding');
  for(let i=0;i<3&&await tour.isVisible().catch(()=>false);i++){
    const skip=tour.locator('[data-dj860-action="skip"]');
    if(!await skip.isVisible().catch(()=>false))break;
    await skip.click({noWaitAfter:true,timeout:15000});
    await expect(tour).toBeHidden({timeout:10000});
  }
  if(tab!=='map'){
    await page.locator('#bottom-nav .nav-tab[data-tab="'+tab+'"]').click({noWaitAfter:true,timeout:15000});
    await expect(page.locator('#app')).toHaveAttribute('data-tab',tab,{timeout:15000});
  }
  await page.waitForTimeout(500);
}
function describeHit(page,selector){
  return page.evaluate(sel=>{
    const node=document.querySelector(sel);
    if(!node)return {exists:false};
    const cs=getComputedStyle(node),rect=node.getBoundingClientRect();
    const pt={x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2)};
    const hit=document.elementFromPoint(pt.x,pt.y);
    const style={visibility:cs.visibility,display:cs.display,opacity:cs.opacity,
      pointerEvents:cs.pointerEvents,position:cs.position,zIndex:cs.zIndex,transform:cs.transform};
    const targetStyle=hit?getComputedStyle(hit):null;
    return {exists:true,selector:sel,style,bounds:[rect.x,rect.y,rect.width,rect.height],
      hitPoint:pt,hitSelf:hit===node||node.contains(hit),hitId:hit?.id||'',
      hitTag:hit?.tagName||'',hitClass:hit?.className?.baseVal||String(hit?.className||'').slice(0,160),
      hitPointerEvents:targetStyle?.pointerEvents||'',html:node.outerHTML.slice(0,450),
      ancestor:[node.parentElement?.id,node.parentElement?.className]};
  },selector);
}
test('Map tip close: measure real hit-test, no force-click',async({page},info)=>{
  test.skip(info.project.name!=='mobile');
  test.setTimeout(150000);
  const result={case:'tip-close'};
  try{
    await setup(page,'map');
    await page.screenshot({path:output+'/tip-before.png',animations:'allow'});
    result.tip=await describeHit(page,'#dj840-map-tip');
    result.close=await describeHit(page,'#dj-user-tip-close');
    result.appAttributes=await page.locator('#app').evaluate(el=>Object.fromEntries([...el.attributes].map(x=>[x.name,x.value]).filter(x=>/tab|tip|sheet/.test(x[0]))));
    if(result.close?.hitSelf){
      await page.touchscreen.tap(result.close.hitPoint.x,result.close.hitPoint.y);
      result.postTip=await describeHit(page,'#dj840-map-tip');
      result.postClose=await describeHit(page,'#dj-user-tip-close');
      await page.screenshot({path:output+'/tip-after.png',animations:'allow'});
    }
    report.checks.push(result);save('tip-close');
    await info.attach('tip-close-details.json',{body:Buffer.from(JSON.stringify(result,null,2)),contentType:'application/json'});
    expect(result.close.exists).toBe(true);
    expect(result.close.hitSelf,'TIP close must be reachable by real user finger').toBe(true);
  }catch(e){result.error=String(e).slice(0,850);if(!report.checks.includes(result))report.checks.push(result);save('tip-close');throw e;}
});
test('Community refresh: click with fresh locator after re-render',async({page},info)=>{
  test.skip(info.project.name!=='mobile');
  test.setTimeout(170000);
  const result={case:'community-refresh',tries:[]};
  await page.context().route('**/*',route=>{
    if(['GET','HEAD','OPTIONS'].includes(route.request().method().toUpperCase()))return route.continue();
    return route.abort('blockedbyclient');
  });
  try{
    await setup(page,'participate');
    const target=page.getByRole('button',{name:/새로고침/}).first();
    result.before=await describeHit(page,'.dj-community-refresh');
    result.visibleRefreshLabels=await page.locator('button').evaluateAll(nodes=>nodes.filter(n=>/(새로고침|다시 확인)/.test(n.innerText||'')||/(새로고침|다시 확인)/.test(n.getAttribute('aria-label')||'')).map(n=>({id:n.id,aria:n.getAttribute('aria-label'),text:n.innerText?.slice(0,80),hidden:n.hidden,rect:[n.getBoundingClientRect().x,n.getBoundingClientRect().y,n.getBoundingClientRect().width,n.getBoundingClientRect().height]})));
    await page.screenshot({path:output+'/community-before.png',animations:'allow'});
    for(let i=0;i<3;i++){
      try{
        await target.click({timeout:12000,noWaitAfter:true});
        result.tries.push({attempt:i+1,status:'clicked'});
        result.clicked=true;
        break;
      }catch(e){
        result.tries.push({attempt:i+1,status:'retry',message:String(e).slice(0,450)});
        await page.waitForTimeout(400);
      }
    }
    result.after=await describeHit(page,'.dj-community-refresh');
    await page.screenshot({path:output+'/community-after.png',animations:'allow'});
    report.checks.push(result);save('community-refresh');
    await info.attach('community-refresh-details.json',{body:Buffer.from(JSON.stringify(result,null,2)),contentType:'application/json'});
    expect(result.clicked,'Refresh button should tolerate a re-render').toBe(true);
  }catch(e){result.error=String(e).slice(0,850);if(!report.checks.includes(result))report.checks.push(result);save('community-refresh');throw e;}
});
