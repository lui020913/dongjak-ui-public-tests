// Diagnostic evidence, not a release gate. Ignore intentionally scrolling controls.
const surfaces=new Set(['#route-map-card','#route-panel','#transport-sheet','#participation-panel','#news-panel','#mine-panel','#dj854-weather-sheet','#djNext-layer-panel .djNext-modal-body','.dj-place-detail-popup','#dj-ai-search-modal','#ped-tools-panel','#community-form','#version-history-modal','#dj840-theme-confirm','#dj860-onboarding']);
export function auditSurfaceBounds(frames){
 const active=new Map(),findings=new Map();
 function finish(selector){const a=active.get(selector);if(!a)return;active.delete(selector);
  if(a.count<3||a.end-a.t<250)return;
  const old=findings.get(selector);if(!old||a.px>old.px)findings.set(selector,a);
 }
 for(const f of frames){
  const vw=f.viewport?.[0];if(!Number.isFinite(vw)||!Number.isFinite(f.t))continue;
  const observed=new Set();
  for(const n of f.nodes||[]){
   if(!surfaces.has(n.selector)||![n.x,n.w,n.opacity].every(Number.isFinite)||n.w<20||n.opacity<.98||n.motion)continue;
   const left=Math.max(0,-n.x),right=Math.max(0,n.x+n.w-vw);
   if(Math.max(left,right)<=4)continue;
   observed.add(n.selector);const px=Math.round(Math.max(left,right)*10)/10;
   const old=active.get(n.selector);
   if(old&&(f.t<old.end||f.t-old.end>3000||Math.abs(n.x-old.x)>3||Math.abs(n.w-old.width)>3))finish(n.selector);
   const a=active.get(n.selector)||{kind:'surface-horizontal-clipping',selector:n.selector,t:f.t,end:f.t,count:0,px:0,x:n.x,width:n.w,viewportWidth:vw,left:Math.round(left*10)/10,right:Math.round(right*10)/10,severity:'review'};
   a.count++;a.px=Math.max(a.px,px);a.end=f.t;active.set(n.selector,a);
  }
  for(const selector of active.keys())if(!observed.has(selector))finish(selector);
 }
 for(const selector of [...active.keys()])finish(selector);
 return [...findings.values()];
}
export function chooseDesignFrames(times,stages,flags,max=12){
 if(!times.length)return [];
 const chosen=new Set(),near=t=>times.reduce((best,x,i)=>Math.abs(x.t-t)<Math.abs(times[best].t-t)?i:best,0);
 for(const f of flags.slice(0,3))if(Number.isFinite(f.t)){const i=near(f.t);for(const k of [Math.max(0,i-1),i,Math.min(times.length-1,i+1)])chosen.add(k);}
 for(const s of stages.filter(x=>x.status==='running')){const end=stages.find(x=>x.index===s.index&&x.status!=='running')?.t??s.t;const mid=(s.t+end)/2;chosen.add(near(mid));}
 for(const q of [.15,.4,.65,.85,1])chosen.add(Math.floor((times.length-1)*q));
 return [...chosen].slice(0,max).sort((a,b)=>a-b);
}
