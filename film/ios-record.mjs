import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
const scene=JSON.parse(await readFile(process.argv[2]||'film/scenes/active.json','utf8'));
const output='film-ios-output', udid=process.env.SIM_UDID;
const url='https://dongjak-walk-safety-preview.pages.dev/';
if(!udid)throw Error('SIM_UDID required');
await mkdir(output,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const base='http://127.0.0.1:4723';
let session, rec, recDone, failure, started=false;
const logs=[];
async function request(method,endpoint,body){
  const r=await fetch(base+endpoint,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(240000)});
  const j=await r.json();
  if(!r.ok||j.value?.error)throw Error(j.value?.message||JSON.stringify(j));
  return j.value;
}
const cmd=(method,p,b)=>request(method,'/session/'+session+p,b);
const execute=(script,args=[])=>cmd('POST','/execute/sync',{script,args});
const elId=e=>e['element-6066-11e4-a52e-4f735466cecf']||e.ELEMENT;
async function until(fn,ms=30000,label='condition'){
  const end=Date.now()+ms;
  let last;
  while(Date.now()<end){try{const v=await fn();if(v)return v;}catch(e){last=e;}await sleep(200);}
  throw Error('Timeout '+label+(last?' '+last:''));
}
async function find(a,visible=true){
  return until(async()=>{
    const arr=await cmd('POST','/elements',{using:'css selector',value:a.selector});
    const filtered=[];
    for(const e of arr){
      const id=elId(e);
      if(visible&&!await cmd('GET','/element/'+id+'/displayed'))continue;
      if(a.text||a.text2){
        const t=await cmd('GET','/element/'+id+'/text');
        if(a.text&&!t.includes(a.text)||a.text2&&!t.includes(a.text2))continue;
      }
      filtered.push(id);
    }
    return filtered[a.index||0];
  },a.timeout||30000,a.selector);
}
const click=async a=>cmd('POST','/element/'+await find(a)+'/click',{});
const check=(selector,expected)=>execute('const parts=arguments[0].split(" ");let n=document;for(const p of parts){n=n.querySelector(p)||null;if(!n)return false;if(n.shadowRoot)n=n.shadowRoot;}return (n.textContent||"").includes(arguments[1]);',[selector,expected]);
async function prepare(){
  await cmd('POST','/url',{url});
  await until(()=>execute('return document.readyState==="complete"||document.readyState==="interactive"'),60000,'document ready');
  const visible=sel=>execute('const n=document.querySelector(arguments[0]);return !!(n&&!n.hidden&&n.getClientRects().length&&getComputedStyle(n).visibility!=="hidden");',[sel]);
  await until(async()=>await visible('#dj-install-menu')||await visible('#map'),90000,'install menu or map');
  if(await visible('#dj-install-menu')){
    const buttons=await cmd('POST','/elements',{using:'css selector',value:'#dj-install-menu button'});
    for(const e of buttons){const id=elId(e);if((await cmd('GET','/element/'+id+'/text')).includes('웹에서 바로 이용하기')){await cmd('POST','/element/'+id+'/click',{});break;}}
  }
  await until(()=>visible('#map'),90000,'map');
  await until(async()=>!await visible('#map-startup-overlay')||await visible('#map-startup-continue'),90000,'map startup');
  if(await visible('#map-startup-overlay')&&await visible('#map-startup-continue'))await click({selector:'#map-startup-continue'});
  await until(async()=>!await visible('#map-startup-overlay'),60000,'startup hidden');
  await until(()=>execute('return document.querySelector("#app")?.dataset.dj860AutoResolved==="true"'),60000,'onboarding resolved');
  if(await visible('#dj860-onboarding'))await click({selector:'#dj860-onboarding [data-dj860-action="skip"]'});
  await until(async()=>!await visible('#dj860-onboarding'),30000,'onboarding hidden');
  await find({selector:'#map-quick-search-query'});
  // Let real map assets finish loading; never mock or modify app data.
  await until(()=>execute('return document.querySelector("#map canvas")?.width>0&&document.querySelector("#map canvas")?.height>0'),30000,'map canvas');
  await sleep(4500);
}
async function step(a){
  switch(a.action){
    case 'wait':return sleep(a.ms);
    case 'visible':{
      if(a.selector.startsWith('text='))return until(()=>execute('return document.body.innerText.includes(arguments[0])',[a.selector.slice(5)]),a.timeout||30000,a.selector);
      return find(a);
    }
    case 'contains':return until(()=>check(a.selector,a.expected),a.timeout||30000,a.selector);
    case 'click':return click(a);
    case 'type':case 'fill':{
      const id=await find(a);
      await cmd('POST','/element/'+id+'/clear',{});
      if(a.action==='fill')return cmd('POST','/element/'+id+'/value',{text:a.value,value:[...a.value]});
      // Real WebDriver input, not a synthetic overlay or rewritten app DOM.
      // Safari sends keys through the browser; append each chunk.
      for(const ch of a.value){await cmd('POST','/element/'+id+'/value',{text:ch,value:[ch]});await sleep(a.delay||95);}
      return;
    }
    case 'press':{
      const id=await find(a);
      const keys={Enter:'\uE007',Escape:'\uE00C',Backspace:'\uE003',Tab:'\uE004'};
      const key=keys[a.key]||a.key;
      return cmd('POST','/element/'+id+'/value',{text:key,value:[key]});
    }
    case 'tap':case 'drag':{
      const from=a.action==='tap'?[a.x,a.y]:a.from,to=a.action==='tap'?from:a.to;
      await cmd('POST','/actions',{actions:[{type:'pointer',id:'finger',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,x:from[0],y:from[1],origin:'viewport'},{type:'pointerDown',button:0},{type:'pointerMove',duration:a.action==='tap'?50:(a.duration||500),x:to[0],y:to[1],origin:'viewport'},{type:'pointerUp',button:0}]}]});
      return cmd('DELETE','/actions');
    }
    case 'screenshot':if(!/^[a-zA-Z0-9_-]+$/.test(a.name))throw Error('invalid name');return execFileSync('xcrun',['simctl','io',udid,'screenshot','--mask=black',output+'/'+a.name+'.png']);
    default:throw Error('iOS recorder action not supported: '+a.action);
  }
}
try{
  const capabilities={platformName:'iOS',browserName:'Safari','appium:automationName':'XCUITest','appium:udid':udid,'appium:deviceName':'iPhone 15 Pro','appium:language':'ko','appium:locale':'ko_KR','appium:newCommandTimeout':300,'appium:nativeWebTap':true,'appium:connectHardwareKeyboard':false,'appium:webkitResponseTimeout':30000,'appium:webviewConnectTimeout':60000,'appium:wdaLaunchTimeout':180000,'appium:wdaConnectionTimeout':180000};
  const result=await request('POST','/session',{capabilities:{alwaysMatch:capabilities,firstMatch:[{}]}});
  session=result.sessionId;
  if(!session)throw Error('No Safari session ID');
  await prepare();
  // Clear any simulator status bar override: real system-rendered indicators only.
  execFileSync('xcrun',['simctl','status_bar',udid,'clear']);
  // Record from Apple's own simulator framebuffer. No Android/Chromium capture, no composited notch or clock.
  rec=spawn('xcrun',['simctl','io',udid,'recordVideo','--codec=h264','--mask=black','--force',output+'/scene.mp4'],{stdio:['ignore','inherit','inherit']});
  recDone=once(rec,'exit');
  await sleep(1000);if(rec.exitCode!==null)throw Error('Simulator recorder exited early');started=true;
  for(const [i,a] of scene.steps.entries()){
    // The earlier toast may disappear on slower native WebDriver calls; validate actual destination state instead.
    if(a.action==='visible'&&a.selector==='text=노량진을(를) 목적지로 지정했습니다.')continue;
    console.log('STEP',i+1,JSON.stringify(a));
    const t=Date.now();
    try{await step(a);logs.push({step:i+1,status:'passed',ms:Date.now()-t});}catch(e){logs.push({step:i+1,status:'failed',error:String(e)});throw e;}
  }
  await sleep(500);
}catch(e){
  failure=e;console.error(e);
  try{execFileSync('xcrun',['simctl','io',udid,'screenshot','--mask=black',output+'/failure.png']);}catch{}
}finally{
  if(rec&&rec.exitCode===null){rec.kill('SIGINT');await recDone.catch(()=>{});}
  if(session)await cmd('DELETE','').catch(()=>{});
  await writeFile(output+'/steps.json',JSON.stringify({url,device:'iPhone 15 Pro Simulator',mode:'Mobile Safari',systemStatusBar:'native, no overrides',started,success:!failure,steps:logs},null,2));
  if(started){
    const p=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,avg_frame_rate,nb_frames:format=duration','-of','json',output+'/scene.mp4'],{encoding:'utf8'});
    await writeFile(output+'/video-metadata.json',p);
    console.log(p);
    const stream=JSON.parse(p).streams[0];
    if(stream.width!==1179||stream.height!==2556)throw Error('Unexpected native video resolution '+stream.width+'x'+stream.height);
  }
}
if(failure)throw failure;
