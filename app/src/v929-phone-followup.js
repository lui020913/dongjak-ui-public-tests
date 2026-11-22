/** 2026-11-22: presentation-only follow-up; keep the live transit and map owners. */
export function installPhoneFollowup(doc=document,win=window){
 const app=doc.getElementById('app'),panel=doc.getElementById('transport-sheet');
 const nav=doc.getElementById('bottom-nav');
 if(!app||app.dataset.dj929Installed)return ()=>{};
 app.dataset.dj929Installed='1';
 const cleanups=[];
 const listen=(node,event,cb,opts)=>{if(!node)return;node.addEventListener(event,cb,opts);cleanups.push(()=>node.removeEventListener(event,cb,opts));};
 const nextFrame=cb=>win.requestAnimationFrame?.(cb)||win.setTimeout(cb,16);
 // Seoul real-time rows must visually follow the station navigation pills.
 // Relocate the ORIGINAL nodes: all fetch/render/refresh listeners remain live.
 if(panel){
   const neighbors=doc.getElementById('transport-neighbors');
   const arrivals=doc.getElementById('transport-arrivals');
   const heading=panel.querySelector('.transport-arrivals-title');
   const selection=panel.querySelector('.transport-selection-box');
   let frame=0;
   const arrange=()=>{
     frame=0;
     if(!neighbors||!heading||!arrivals||!selection)return;
     if(panel.dataset.kind==='subway'){
       if(neighbors.nextElementSibling!==heading)panel.insertBefore(neighbors,heading);
       if(heading.nextElementSibling!==arrivals)panel.insertBefore(arrivals,heading.nextSibling);
       panel.dataset.dj929StationLayout='true';
     }else{
       if(heading.nextElementSibling!==arrivals)panel.insertBefore(arrivals,heading.nextSibling);
       if(arrivals.nextElementSibling!==neighbors)panel.insertBefore(neighbors,arrivals.nextSibling);
       delete panel.dataset.dj929StationLayout;
     }
   };
   const schedule=()=>{if(!frame)frame=nextFrame(arrange);};
   const mo=new MutationObserver(records=>{
     if(records.some(r=>r.type==='attributes'||r.target===neighbors||r.type==='childList'&&r.target===panel))schedule();
   });
   mo.observe(panel,{attributes:true,attributeFilter:['data-kind'],childList:true});
   mo.observe(neighbors,{childList:true});
   cleanups.push(()=>{mo.disconnect();if(frame)win.cancelAnimationFrame?.(frame);});
   arrange();
 }
 // During a primary-tab handoff the TIP may momentarily inherit an old
 // centered transform before map/scale docking has measured its final lane.
 // Keep it invisible until two composed frames after returning to Map.
 let finish=0,lastTab=app.dataset.tab;
 const stage=()=>{if(app.dataset.tab==='map'){app.dataset.dj929TipReturning='true';
   if(finish)win.clearTimeout(finish);
   nextFrame(()=>nextFrame(()=>{
     finish=win.setTimeout(()=>{finish=0;if(app.dataset.tab==='map')delete app.dataset.dj929TipReturning;},75);
   }));
 }};
 const observeTab=new MutationObserver(()=>{
   const tab=app.dataset.tab;if(tab===lastTab)return;
   lastTab=tab;if(tab==='map')stage();else {delete app.dataset.dj929TipReturning;if(finish){win.clearTimeout(finish);finish=0;}}
 });
 observeTab.observe(app,{attributes:true,attributeFilter:['data-tab']});
 cleanups.push(()=>{observeTab.disconnect();if(finish)win.clearTimeout(finish);delete app.dataset.dj929TipReturning;});
 listen(nav,'pointerdown',event=>{if(event.target?.closest?.('[data-tab="map"]')&&app.dataset.tab!=='map')app.dataset.dj929TipReturning='true';},true);
 return ()=>{for(const off of cleanups)off();delete app.dataset.dj929Installed;};
}
if(typeof document!=='undefined'){
 const boot=()=>installPhoneFollowup(document,window);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
}
