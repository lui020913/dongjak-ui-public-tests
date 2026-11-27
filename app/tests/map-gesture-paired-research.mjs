import {chromium} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const urls=[process.env.BASELINE_URL,process.env.CANDIDATE_URL];
assert.ok(urls.every(Boolean));
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const report={baseline:process.env.BASELINE_SHA,candidate:process.env.CANDIDATE_SHA,notes:'Same software-rendered Chromium runner; not physical iPhone FPS. Matched pan AND zoom with equal initial DPR; icons stay enabled.',samples:[]};
const sites=[{name:'Sangdo',center:[126.94791,37.502834]},{name:'Noryangjin',center:[126.941005,37.513534]}];
async function sample(url,variant,round){
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,serviceWorkers:'block',reducedMotion:'no-preference',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1'});
 // Benchmark only camera behavior, with identical returning-user setup on both revisions.
 await ctx.addInitScript(()=>{localStorage.setItem('dongjak_onboarding_seen_v860','1');sessionStorage.setItem('dj-map-guide-initial-shown-v7121','1');});
 const page=await ctx.newPage();
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  const menu=page.locator('#dj-install-menu');await menu.waitFor({state:'attached',timeout:30000});
  if(await menu.isVisible()){await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();await menu.waitFor({state:'hidden'});}
  const startup=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
  await page.waitForFunction(()=>{const o=document.querySelector('#map-startup-overlay'),n=document.querySelector('#map-startup-continue');return !o||!o.getClientRects().length||n?.getClientRects().length>0;},{},{timeout:90000});
  if(await startup.isVisible()&&await next.isVisible())await next.click();
  await startup.waitFor({state:'hidden',timeout:45000});
  const onboarding=page.locator('#dj860-onboarding');
  if(await onboarding.isVisible())await onboarding.locator('[data-dj860-action="skip"]').click();
  await onboarding.waitFor({state:'hidden',timeout:45000});
  await page.waitForFunction(()=>window.__qaMap?.getStyle()?.sources?.openmaptiles,{},{timeout:90000});
  for(const site of sites){
   await page.evaluate(({center})=>{const m=window.__qaMap;m.jumpTo({center,zoom:17.8,pitch:0,bearing:0});},site);
   await page.waitForFunction(()=>{const m=window.__qaMap;return m.isStyleLoaded()&&!m.isMoving()&&m.getStyle().layers.some(l=>l.type==='symbol'&&/metro|bus|poi/i.test(l.id));},{},{timeout:90000});
   // A loaded style is not proof that symbol tiles have rendered. Apply the
   // matched DPR before waiting for real labels so a DPR resize cannot clear
   // the visible features immediately before the first sample.
   await page.evaluate(()=>window.__qaMap.setPixelRatio?.(2.5));
   try{
    await page.waitForFunction(()=>{
     const m=window.__qaMap,app=document.getElementById('app');
     if(app?.dataset?.tab!=='map'||app?.dataset?.djTransitExterior==='true'||m.isMoving()||!m.isStyleLoaded())return false;
     const ids=m.getStyle().layers.filter(l=>l.type==='symbol'&&/poi|metro|bus|civic|facility|featured|name|label|transport/i.test(l.id)&&m.getLayoutProperty(l.id,'visibility')!=='none').map(l=>l.id);
     return ids.length>0&&m.queryRenderedFeatures({layers:ids}).length>0;
    },{},{timeout:90000,polling:500});
   }catch(error){
    const state=await page.evaluate(()=>{const m=window.__qaMap,app=document.getElementById('app');return {tab:app?.dataset?.tab,transit:app?.dataset?.djTransitExterior,center:m.getCenter(),zoom:m.getZoom(),style:m.isStyleLoaded(),tiles:m.areTilesLoaded?.(),layers:m.getStyle().layers.filter(l=>l.type==='symbol').map(l=>[l.id,m.getLayoutProperty(l.id,'visibility')||'visible'])};});
    console.log('MAP_GESTURE_READINESS_FAILURE',JSON.stringify({variant,round,site:site.name,...state}));throw error;
   }
   const data=await page.evaluate(async({center,checkSharedScope})=>{
    const m=window.__qaMap,frames=[],writes={},restores=[],sweeps=[];
    // Lock the matched DPR and wait for labels and buildings in the same
    // browser task that begins measurement. A separate readiness RPC can
    // observe a previous tile frame before a pending GIS update clears it.
    m.setPixelRatio?.(2.5);
    const originalDpr=m.setPixelRatio;if(originalDpr){m.setPixelRatio=function(){};restores.push(()=>{m.setPixelRatio=originalDpr;});}
    const label=/poi|metro|bus|civic|facility|featured|name|label|transport/i;
    const snapshot=()=>{
     const layers=m.getStyle().layers,shown=l=>m.getLayoutProperty(l.id,'visibility')!=='none';
     const visibleIds=layers.filter(l=>l.type==='symbol'&&label.test(l.id)&&shown(l)).map(l=>l.id);
     const native=layers.filter(l=>l['source-layer']==='building'),gis=layers.filter(l=>l.id.startsWith('dongjak-buildings-footprint-'));
     const buildingIds=[...native,...gis].filter(l=>l.type==='fill'&&shown(l)).map(l=>l.id);
     return {visibleIds,icons:visibleIds.length?m.queryRenderedFeatures({layers:visibleIds}).length:0,building:{native:native.map(l=>l.id),gis:gis.map(l=>l.id),customDistance:native.some(l=>JSON.stringify(m.getFilter(l.id)||null).includes('"distance"')),rendered:buildingIds.length?m.queryRenderedFeatures({layers:buildingIds}).length:0},center:m.getCenter().toArray(),zoom:m.getZoom(),ready:m.isStyleLoaded()&&!m.isMoving()};
    };
    let state,stable=0;const deadline=performance.now()+90000;
    while(performance.now()<deadline){
     state=snapshot();
     const ready=state.ready&&state.icons>0&&(!checkSharedScope||state.building.rendered>0&&state.building.customDistance)&&Math.hypot(state.center[0]-center[0],state.center[1]-center[1])<.0001&&Math.abs(state.zoom-17.8)<.02;
     stable=ready?stable+1:0;if(stable>=2)break;
     await new Promise(r=>setTimeout(r,300));
    }
    if(stable<2){for(const restore of restores.reverse())restore();throw Error('MAP_SAMPLE_NOT_READY '+JSON.stringify(state));}
    const {icons,visibleIds,building}=state;
    let last=0,active=false;
    const record=(kind,id)=>{if(active&&m.isMoving()&&label.test(String(id)))writes[kind+':'+id]=(writes[kind+':'+id]||0)+1;};
    for(const kind of ['setLayoutProperty','setPaintProperty','setFilter','moveLayer']){
     const original=m[kind];if(typeof original!=='function')continue;
     m[kind]=function(id,...args){record(kind,id);return original.call(this,id,...args);};restores.push(()=>{m[kind]=original;});
    }
    for(const id of Object.keys(m.getStyle().sources).filter(x=>label.test(x))){
     const source=m.getSource(id),original=source?.setData;
     if(typeof original!=='function')continue;
     source.setData=function(...args){record('setData',id);return original.apply(this,args);};restores.push(()=>{source.setData=original;});
    }
    const frame=()=>{if(!active)return;const t=performance.now();if(last)frames.push(t-last);last=t;};
    m.on('render',frame);
    try{
     for(const [offset,zoom] of [[.0012,17.8],[-.0012,16.2],[.0007,18.2],[-.0007,15.2],[.0012,17.8]]){
      // Use a longer matched camera sweep on the software GPU rather than
      // relaxing sample requirements or discarding slow frames.
      const target=[center[0]+offset,center[1]+offset*.35];
      const before=m.getCenter(),beforeZoom=m.getZoom(),started=performance.now(),count=frames.length;
      last=started;active=true;
      const done=new Promise(resolve=>m.once('moveend',resolve));
      m.easeTo({center:target,zoom,duration:4500,essential:true,easing:t=>t});
      await done;
      const ended=performance.now(),after=m.getCenter();
      active=false;
      sweeps.push({elapsedMs:ended-started,frames:frames.length-count,from:[before.lng,before.lat],to:[after.lng,after.lat],target,zoom,beforeZoom,afterZoom:m.getZoom(),tailMs:ended-last});
      await new Promise(r=>setTimeout(r,650));
     }
    }finally{active=false;m.off('render',frame);for(const restore of restores.reverse())restore();}
    return {frames,writes,sweeps,icons,building,visibleLayers:visibleIds.length,ratio:m.getPixelRatio?.()??null};
   },{...site,checkSharedScope:variant==='candidate'&&process.env.CHECK_SHARED_SCOPE==='true'});
   if(variant==='candidate'&&process.env.CHECK_SHARED_SCOPE==='true'){
    console.log('DISTRICT_BUILDING_SCOPE',site.name,JSON.stringify(data.building));
    assert.equal(data.building.customDistance,true,'native district building geometry filter');
    assert.ok(data.building.rendered>0,'actual district buildings must remain rendered');
   }
   report.samples.push({variant,round,site:site.name,...data});
   console.log('MAP_GESTURE_SAMPLE',JSON.stringify({variant,round,site:site.name,icons:data.icons,frames:data.frames.length,writes:data.writes,sweeps:data.sweeps,ratio:data.ratio}));
   assert.ok(data.icons>0,'actual visible POI/transport labels required');
   assert.ok(Math.abs(data.ratio-2.5)<.01,'matched DPR required');
   assert.ok(data.sweeps.every(x=>Math.hypot(x.to[0]-x.from[0],x.to[1]-x.from[1])>.0004&&Math.hypot(x.target[0]-x.to[0],x.target[1]-x.to[1])<.0001&&x.elapsedMs>=4000&&Math.abs(x.afterZoom-x.zoom)<.02),'matched camera sweep did not execute');
   assert.ok(data.frames.length>=10&&data.sweeps.every(x=>x.frames>=2),'insufficient map frames');
  }
  if(round===1&&process.env.CHECK_SHARED_SCOPE==='true'){
   // Probe the same real external tiles in both revisions, without letting
   // the production camera bounds prevent the test from reaching them.
   const audit=await page.evaluate(async({candidate})=>{
    const m=window.__qaMap,app=document.getElementById('app'),pause=ms=>new Promise(r=>setTimeout(r,ms));
    const results=[];
    const sample=async(name,center,pitch,expected)=>{
     m.setMaxBounds(null);m.jumpTo({center,zoom:17.8,pitch,bearing:0});
     let stable=0,state;const deadline=performance.now()+90000;
     while(performance.now()<deadline){
      const layers=m.getStyle().layers;
      const ids=layers.filter(l=>['fill','fill-extrusion','line'].includes(l.type)&&(l['source-layer']==='building'||l.id.startsWith('dongjak-buildings-'))).map(l=>l.id);
      const rendered=m.queryRenderedFeatures({layers:ids});
      const source=layers.find(l=>l['source-layer']==='building'&&l.source);
      let raw=0;try{raw=m.querySourceFeatures(source.source,{sourceLayer:'building'}).length;}catch{}
      state={name,pitch,raw,rendered:rendered.length,types:[...new Set(rendered.map(f=>f.layer.type))],center:m.getCenter().toArray(),ready:m.isStyleLoaded()&&!m.isMoving()&&m.areTilesLoaded()};
      const pass=state.ready&&raw>0&&Math.hypot(state.center[0]-center[0],state.center[1]-center[1])<.0001&&(expected==='none'?state.rendered===0:expected==='3d'?state.types.includes('fill-extrusion'):state.rendered>0);
      stable=pass?stable+1:0;if(stable>=3)break;
      await pause(500);
     }
     if(stable<3)throw Error('BUILDING_SCOPE_AUDIT '+JSON.stringify(state));
     results.push(state);
    };
    await sample('external 2D',[126.999,37.501],0,candidate?'none':'positive');
    await sample('external 3D',[126.999,37.501],48,candidate?'none':'positive');
    if(candidate){
     await sample('internal 2D',[126.94791,37.502834],0,'positive');
     await sample('internal 3D',[126.94791,37.502834],48,'3d');
     // Exercise the actual transit state event, not a distinct map instance.
     app.dataset.tab='route';app.dataset.djTransitMode='transit';
     window.dispatchEvent(new CustomEvent('dongjak:transit-mode-change',{detail:'transit'}));
     await sample('transit external 2D',[126.999,37.501],0,'none');
     await sample('transit external 3D',[126.999,37.501],48,'none');
     await sample('transit internal 2D',[126.94791,37.502834],0,'positive');
     await sample('transit internal 3D',[126.94791,37.502834],48,'3d');
    }
    return results;
   },{candidate:variant==='candidate'});
   console.log('BUILDING_SCOPE_AUDIT',variant,JSON.stringify(audit));report.buildingAudit??={};report.buildingAudit[variant]=audit;
  }
 }finally{await ctx.close();}
}
try{
 for(let i=0;i<3;i++)for(const n of (i%2?[1,0]:[0,1]))await sample(urls[n],n?'candidate':'baseline',i+1);
 const stats=rows=>{const a=rows.flatMap(x=>x.frames).sort((x,y)=>x-y);return {samples:a.length,p50:a[Math.floor((a.length-1)*.5)],p95:a[Math.floor((a.length-1)*.95)],slowPct:100*a.filter(x=>x>32).length/a.length,gestureWrites:rows.reduce((n,x)=>n+Object.values(x.writes).reduce((s,v)=>s+v,0),0)};};
 report.summary=Object.fromEntries(['baseline','candidate'].map(v=>[v,stats(report.samples.filter(x=>x.variant===v))]));
 console.log('MAP_GESTURE_COMPARISON',JSON.stringify(report.summary));
 // Do not conceal a regression or claim a physical-device guarantee.
 assert.equal(report.summary.candidate.gestureWrites,0,'candidate must not mutate monitored POI or label sources/styles during camera motion');
 const a=report.summary.baseline,z=report.summary.candidate;
 assert.ok(z.p95<=a.p95*1.20+8&&z.slowPct<=a.slowPct+5,'candidate materially regressed compared with pre-transit source');
}finally{mkdirSync('audit-map-gesture-output',{recursive:true});writeFileSync('audit-map-gesture-output/results.json',JSON.stringify(report,null,2));await browser.close();}
