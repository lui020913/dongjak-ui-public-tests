import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const scene = JSON.parse(await fs.readFile(process.argv[2] || 'film/scenes/noryangjin.json', 'utf8'));
const url = 'https://dongjak-walk-safety-preview.pages.dev/';
const output = 'film-output';
await fs.mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const viewport = scene.viewport || {width:430,height:932};
if(!Number.isInteger(viewport.width)||!Number.isInteger(viewport.height)||viewport.width<320||viewport.height<500||viewport.width>1920||viewport.height>2400) throw Error('Invalid viewport');
const context = await browser.newContext({viewport, isMobile:true, hasTouch:true, deviceScaleFactor:1, locale:'ko-KR', timezoneId:'Asia/Seoul', reducedMotion:'no-preference', colorScheme:'light', recordVideo:{dir:output,size:viewport}, userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'});
const page = await context.newPage();
const video = page.video();
const initial = performance.now();
const log=[];
let start=0, success=false, error;
const locator = a => {
  if(!a.selector) throw Error('selector required');
  let l=page.locator(a.selector);
  if(a.text) l=l.filter({hasText:a.text});
  if(a.text2) l=l.filter({hasText:a.text2});
  if(a.index!==undefined) l=l.nth(a.index);
  return l;
};
async function optionalClick(selector) {
  const l=page.locator(selector).first();
  if(await l.isVisible()){await l.click({timeout:10000});return true}
  return false;
}
async function prepare() {
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  const gate=page.locator('#dj-install-menu');
  await expect.poll(async()=>await gate.isVisible() || await page.locator('#map').isVisible(),{timeout:60000}).toBe(true);
  if(await gate.isVisible()) await gate.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
  await expect(page.locator('#map')).toBeVisible({timeout:60000});
  const startup=page.locator('#map-startup-overlay');
  const next=page.locator('#map-startup-continue');
  await expect.poll(async()=>!(await startup.isVisible())||await next.isVisible(),{timeout:90000}).toBe(true);
  if(await startup.isVisible()&&await next.isVisible())await next.click();
  await expect(startup).toBeHidden({timeout:60000});
  await expect(page.locator('#app')).toHaveAttribute('data-dj860-auto-resolved','true',{timeout:60000});
  await optionalClick('#dj860-onboarding [data-dj860-action="skip"]');
  await expect(page.locator('#dj860-onboarding')).toBeHidden({timeout:30000});
  await expect(page.locator('#map-quick-search-query')).toBeVisible({timeout:30000});
  await page.waitForTimeout(2000);
}
async function step(a) {
  const timeout=a.timeout||20000;
  switch(a.action){
    case 'wait': await page.waitForTimeout(a.ms);break;
    case 'visible': await expect(locator(a)).toBeVisible({timeout});break;
    case 'contains': await expect(locator(a)).toContainText(a.expected,{timeout});break;
    case 'click': await locator(a).click({timeout});break;
    case 'type': {
      const l=locator(a);
      await l.fill('',{timeout});
      for(const c of a.value){await page.keyboard.insertText(c);await page.waitForTimeout(a.delay||95);}
      break;
    }
    case 'fill': await locator(a).fill(a.value,{timeout});break;
    case 'press': await locator(a).press(a.key,{timeout});break;
    case 'tap': await page.touchscreen.tap(a.x,a.y);break;
    case 'drag': {
      await page.mouse.move(a.from[0],a.from[1]);await page.mouse.down();
      try{await page.mouse.move(a.to[0],a.to[1],{steps:a.steps||24});}finally{await page.mouse.up();}
      break;
    }
    case 'wheel': await page.mouse.move(a.x,a.y);await page.mouse.wheel(a.dx||0,a.dy||0);break;
    case 'gps': await context.grantPermissions(['geolocation'],{origin:new URL(url).origin});await context.setGeolocation({latitude:a.lat,longitude:a.lng,accuracy:a.accuracy||10});break;
    case 'screenshot': if(!/^[a-zA-Z0-9_-]+$/.test(a.name))throw Error('invalid screenshot name');await page.screenshot({path:path.join(output,a.name+'.png')});break;
    default: throw Error('Unsupported action: '+a.action);
  }
}
try{
  await prepare();
  start=(performance.now()-initial)/1000;
  for(const [i,a] of scene.steps.entries()){
    const t=performance.now();
    console.log('STEP',i+1,JSON.stringify(a));
    try{await step(a);log.push({step:i+1,action:a.action,status:'passed',ms:Math.round(performance.now()-t)});}
    catch(e){log.push({step:i+1,action:a.action,status:'failed',error:String(e)});throw e;}
  }
  await page.screenshot({path:output+'/final.png'});
  success=true;
}catch(e){
  error=e;console.error(e);
  await page.screenshot({path:output+'/failure.png'}).catch(()=>{});
  await fs.writeFile(output+'/visible-text.txt',await page.locator('body').innerText().catch(()=>'')); 
}finally{
  const finish=(performance.now()-initial)/1000;
  await context.close();
  await browser.close();
  const source=await video.path();
  await fs.writeFile(output+'/steps.json',JSON.stringify({url,scene:scene.name,success,start,finish,steps:log},null,2));
  if(success){
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(start),'-i',source,'-t',String(Math.max(0.1,finish-start)),'-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',output+'/scene.mp4'],{stdio:'inherit'});
    execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,r_frame_rate','-of','json',output+'/scene.mp4'],{stdio:'inherit'});
    await fs.unlink(source);
  }else{
    await fs.rename(source,output+'/failed-debug.webm');
  }
}
if(error) throw error;
