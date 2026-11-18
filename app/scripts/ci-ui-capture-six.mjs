/** Read-only six-viewport visual inspection, production vs preview.
 * Does not write app data, cookies, login state, or deploy anything. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const site=String(process.env.UI_AUDIT_URL||'').trim();
const phase=String(process.env.UI_AUDIT_PHASE||'before').trim();
if(!/^https:\/\/[a-z0-9.-]+\.pages\.dev\/?$/i.test(site))throw Error('UI_AUDIT_URL must be a trusted Pages host');
if(!['before','after','production-after'].includes(phase))throw Error('invalid capture phase');
const devices=[
  {id:'pc1280',width:1280,height:800,mobile:false},
  {id:'pc1440',width:1440,height:900,mobile:false},
  {id:'pc1920',width:1920,height:1080,mobile:false},
  {id:'mobile375',width:375,height:812,mobile:true},
  {id:'mobile390',width:390,height:844,mobile:true},
  {id:'mobile430',width:430,height:932,mobile:true}
];
const requestedDevices=String(process.env.UI_AUDIT_DEVICES||'').split(',').map(v=>v.trim()).filter(Boolean);
const selectedDevices=requestedDevices.length?devices.filter(x=>requestedDevices.includes(x.id)):devices;
if(selectedDevices.length===0||requestedDevices.some(id=>!devices.some(d=>d.id===id)))throw Error('Invalid UI_AUDIT_DEVICES selection');
const outDir=path.join(process.cwd(),'ui-audit',phase);
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const observations=[];
const visit=async (device)=>{
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},
    deviceScaleFactor:1,isMobile:device.mobile,hasTouch:device.mobile,colorScheme:'light'});
  const page=await context.newPage();page.setDefaultTimeout(70000);
  try{
    const response=await page.goto(site,{waitUntil:'domcontentloaded',timeout:45000});
    if(!response||response.status()>=400)throw Error('page HTTP status '+response?.status());
    await page.locator('#map').waitFor({state:'visible',timeout:60000});
    // The map node exists underneath the full-screen startup splash. Wait
    // for actual map readiness, or use its real accessible continue button.
    const startup=page.locator('#map-startup-overlay');
    const continueButton=page.locator('#map-startup-continue');
    if(await startup.count()){
      await page.waitForFunction(()=>{
        const overlay=document.getElementById('map-startup-overlay');
        const button=document.getElementById('map-startup-continue');
        const visible=!!overlay&&getComputedStyle(overlay).display!=='none'&&!overlay.hidden;
        const ready=!!button&&getComputedStyle(button).display!=='none'&&!button.hidden
          &&button.getBoundingClientRect().width>0;
        return !visible||ready;
      },null,{timeout:100000}).catch(()=>{throw new Error('Production startup overlay did not become ready');});
      if(await startup.isVisible().catch(()=>false)&&await continueButton.isVisible().catch(()=>false)){
        const readyRect=await continueButton.boundingBox();
        if(!readyRect)throw new Error('startup continue has no physical hit target');
        await page.mouse.click(readyRect.x+readyRect.width/2,readyRect.y+readyRect.height/2);
      }
      await startup.waitFor({state:'hidden',timeout:45000});
    }
    // Use real browser pointer to skip the tour only when it is visible.
    const tour=page.locator('#dj860-onboarding');
    if(await tour.isVisible().catch(()=>false)){
      const skip=tour.locator('.dj860-skip');
      await skip.waitFor({state:'visible',timeout:30000});
      const box=await skip.boundingBox();
      if(!box)throw Error('onboarding skip has no hit rectangle');
      await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
      await tour.waitFor({state:'hidden',timeout:60000});
    }
    const snapshot=async label=>{
      const metrics=await page.evaluate(()=>{
        const root=document.documentElement,app=document.getElementById('app');
        const nav=[...document.querySelectorAll('#bottom-nav>.nav-tab')].map(e=>{
          const r=e.getBoundingClientRect();const cs=getComputedStyle(e);
          return {tab:e.dataset.tab,visible:r.width>0&&r.height>0&&cs.visibility!=='hidden',
            width:Math.round(r.width),height:Math.round(r.height),
            x:Math.round(r.left),y:Math.round(r.top)};
        });
        return {tab:app?.dataset.tab||'',viewportWidth:window.innerWidth,
          documentWidth:root.scrollWidth,horizontalOverflow:Math.max(0,root.scrollWidth-window.innerWidth),
          mapVisible:!!document.getElementById('map')?.getBoundingClientRect()?.width,
          nav};
      });
      const name=device.id+'-'+label+'.jpg';
      // Software Chromium can need substantial WebGL readback time at 1920px.
      // JPEG keeps visual evidence without slow lossless PNG compression.
      await page.screenshot({path:path.join(outDir,name),type:'jpeg',quality:85,animations:'disabled',timeout:150000});
      observations.push({device:device.id,phase,label,image:name,...metrics});
      await fs.writeFile(path.join(outDir,'metrics.json'),JSON.stringify(observations,null,2));
      if(!metrics.mapVisible)throw Error('Map container disappeared');
      if(metrics.horizontalOverflow>2)throw Error('Horizontal scroll: '+metrics.horizontalOverflow+'px');
    };
    await snapshot('map');
    const route=page.locator('#bottom-nav>.nav-tab[data-tab="route"]');
    if(!(await route.isVisible()))throw Error('Route tab is not visible');
    const rect=await route.boundingBox();if(!rect||rect.width<35||rect.height<35)throw Error('Route tap target too small');
    await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
    await page.locator('#app[data-tab="route"]').waitFor({state:'attached',timeout:90000});
    const routePanel=page.locator('#route-panel');
    await routePanel.waitFor({state:'visible',timeout:60000});
    await page.waitForFunction(()=>{
      const panel=document.querySelector('#route-panel');
      if(!panel||panel.hidden)return false;
      const style=getComputedStyle(panel),r=panel.getBoundingClientRect();
      return style.visibility!=='hidden'&&Number(style.opacity)>0&&
        r.width>100&&r.height>100&&r.top<window.innerHeight-100&&
        r.bottom>100&&r.right>40&&r.left<window.innerWidth-40;
    },null,{timeout:60000});
    // The real sheet entrance may still be in-flight even after [hidden]
    // flips. Capture the actual opened sheet, never an empty underlying map.
    await page.waitForTimeout(500);
    await snapshot('route');
    console.log(device.id+': map and route visual evidence captured; horizontal overflow 0.');
  }finally{await context.close();}
};
try{for(const d of selectedDevices)await visit(d);}finally{await browser.close();}
await fs.writeFile(path.join(outDir,'metrics.json'),JSON.stringify(observations,null,2));
console.log('Captured '+observations.length+' screenshot+layout records from '+site+' ('+phase+').');
