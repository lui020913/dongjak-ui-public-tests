/** Rendering budget only: never changes source geometry, GIS analysis or safety visibility. */
export function phoneProfile({ua='',memory,cores,phone=false,saveData=false}={}) {
  if(!phone)return 'normal';
  if(saveData)return 'economy';
  const android=/Android\s+(\d+)/i.exec(ua);
  if(android && (Number(android[1])<=10 || /SM-N96[0-9]/i.test(ua) || (Number(memory)>0&&Number(memory)<=4) || (Number(cores)>0&&Number(cores)<=4)))return 'economy';
  return 'normal';
}
export function normalMapPixelRatio({phone=false,ua='',memory,cores,deviceRatio=1}={}){
  const modernApple=/iPhone.*OS (?:1[89]|[2-9]\d)_/i.test(ua);
  const highEnd=modernApple||Number(memory)>=6||Number(cores)>=8;
  return Math.min(phone?(highEnd?3:2):1.5,Math.max(1,Number(deviceRatio)||1));
}
export function nextBudget({streak=0,fast=0,level='normal'}={},ms){
  if(!Number.isFinite(ms)||ms<4||ms>1000)return {streak:0,fast:0,level};
  streak=ms>32?streak+1:Math.max(0,streak-1);
  fast=ms<=19?fast+1:0;
  if(streak>=8&&level==='normal')return {streak:0,fast:0,level:'economy'};
  if(fast>=120&&level==='economy')return {streak:0,fast:0,level:'normal'};
  return {streak,fast,level};
}
export function installPhoneRenderBudget({map,app,initial='normal',normalRatio=1.5,phone=true,now=()=>performance.now(),doc=typeof document==='undefined'?null:document}={}){
  let level=initial, pending=initial, movement=false, last=0, sample={level:initial}, active=false;
  let count=0,slow=0,total=0,hidden=Boolean(doc?.hidden);
  const apply=()=>{
    app.dataset.djPhoneBudget=level;
    if(typeof map.setPixelRatio==='function'){
      // Native economy devices retain 1x; capable phones never settle below 2x after a slow gesture.
      const ratio=hidden?1:level==='economy'?(initial==='economy'?1:Math.min(2,normalRatio)):normalRatio;
      if(map.getPixelRatio?.()!==ratio)map.setPixelRatio(ratio);
    }
  };
  const start=()=>{if(!phone||hidden)return;movement=true;last=0;app.classList.toggle('dj-economy-moving',level==='economy');};
  const render=()=>{if(!movement||hidden)return;const stamp=now();if(last){const ms=stamp-last;if(ms>=4&&ms<=1000){count++;total+=ms;if(ms>32)slow++;sample=nextBudget(sample,ms);pending=sample.level;}}last=stamp;};
  const end=()=>{if(!movement)return;movement=false;last=0;app.classList.remove('dj-economy-moving');app.dataset.djPhoneFrameMeanMs=count?(total/count).toFixed(1):'';app.dataset.djPhoneSlowFrames=String(slow);if(initial==='economy')pending='economy';if(level!==pending){level=pending;apply();}};
  const visibility=()=>{
    hidden=Boolean(doc?.hidden);
    if(hidden){movement=false;last=0;app.classList.remove('dj-economy-moving');map.stop?.();}
    // Keep the map object, camera, sources and layers intact when the tab sleeps.
    apply();
  };
  if(phone){map.on('movestart',start);map.on('render',render);map.on('moveend',end);doc?.addEventListener?.('visibilitychange',visibility);active=true;app.dataset.djPhoneBudget=level;if(hidden)apply();}
  return {isEconomy:()=>level==='economy',stats:()=>({profile:level,samples:count,meanFrameMs:count?total/count:null,slowFrames:slow}),destroy(){if(!active)return;active=false;map.off('movestart',start);map.off('render',render);map.off('moveend',end);doc?.removeEventListener?.('visibilitychange',visibility);app.classList.remove('dj-economy-moving');delete app.dataset.djPhoneBudget;}};
}
export function offscreenEvictionIds(entries,visible,keep=2){
  const protectedIds=new Set(visible);
  const offscreen=entries.filter(id=>!protectedIds.has(id));
  return offscreen.slice(0,Math.max(0,offscreen.length-keep));
}
export function coalesceViewportWork(run,{delay=150,isMoving=()=>false,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  let timer=null,flag=false;
  function flush(){timer=null;if(isMoving()){timer=setTimer(flush,delay);return;}const requested=flag;flag=false;run(requested);}
  return {request(scan=false){flag=flag||scan;if(timer===null)timer=setTimer(flush,delay);},cancel(){if(timer!==null)clearTimer(timer);timer=null;flag=false;}};
}
