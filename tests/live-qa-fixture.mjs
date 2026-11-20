import {test as base, expect} from '@playwright/test';
import {mkdirSync, writeFileSync, renameSync, existsSync, appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const put=(path,data)=>{const tmp=path+'.tmp';writeFileSync(tmp,JSON.stringify(data));renameSync(tmp,path);};
const root=process.env.DONGJAK_LIVE_QA_DIR;
const targets=['#bottom-nav','.topbar','#djNext-toolbar','#djNext-layer-panel .djNext-modal-body','#djNext-layer-panel header','#djNext-layer-panel .djNext-layer-scroll','#dj854-weather-sheet','#transport-sheet','#route-panel','#participation-panel','#news-panel','#mine-panel','.dj-place-detail-popup','#version-history-modal'];
export {expect};
export const test=base.extend({
  liveAudit:[async({page},use,info)=>{
    if(!root){await use();return;}
    // One audit worker per local console. Pause only between journeys, never inside an animation.
    while(existsSync(join(root,'pause'))){await sleep(250);}
    const id=randomUUID(), dir=join(root,id);
    mkdirSync(join(dir,'frames'),{recursive:true});
    const start=Date.now(), meta={id,title:info.title,project:info.project.name,start,status:'running',frames:0};
    put(join(dir,'meta.json'),meta);
    let count=0,last=0,cdp,closed=false;
    await page.exposeBinding('__djAuditBatch',(_source,batch)=>{
      if(closed||!Array.isArray(batch)||batch.length>90)return;
      appendFileSync(join(dir,'metrics.ndjson'),batch.map(x=>JSON.stringify(x)).join('\n')+'\n');
    });
    await page.addInitScript(({targets})=>{
      if(window.top!==window)return;
      let batch=[],previous=performance.now(),started=Date.now(),sample=0;
      function capture(t){
        const dt=t-previous;previous=t;
        const nodes=targets.flatMap(selector=>{
          const n=document.querySelector(selector);if(!n||!n.getClientRects().length)return [];
          const s=getComputedStyle(n),r=n.getBoundingClientRect();
          if(s.display==='none'||s.visibility==='hidden')return [];
          return [{selector,x:r.x,y:r.y,w:r.width,h:r.height,opacity:Number(s.opacity),transform:s.transform,scroll:n.scrollTop,radius:s.borderRadius}];
        });
        const groups=sample%6===0?['#bottom-nav .nav-tab','#djNext-scroll .djNext-tool','#djNext-layer-panel .djNext-layer-action'].map(selector=>{
          const items=[...document.querySelectorAll(selector)].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility==='visible').map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {id:n.id||n.getAttribute('data-tab')||null,x:r.x,y:r.y,w:r.width,h:r.height,radius:s.borderRadius,fontSize:s.fontSize,shadow:s.boxShadow,background:s.backgroundColor,overflowX:n.scrollWidth-n.clientWidth};});
          return {selector,items};
        }):null;
        batch.push({t:Math.round(started+t),dt:Math.round(dt*10)/10,viewport:[innerWidth,innerHeight],nodes,groups});
        if(++sample%30===0){const send=batch;batch=[];window.__djAuditBatch(send).catch(()=>{});}
        requestAnimationFrame(capture);
      }
      window.__djAuditFlush=()=>{const send=batch;batch=[];return window.__djAuditBatch(send);};
      requestAnimationFrame(capture);
    },{targets});
    const log=(kind,value)=>appendFileSync(join(dir,'events.ndjson'),JSON.stringify({t:Date.now(),kind,value:String(value).slice(0,500)})+'\n');
    page.on('pageerror',e=>log('pageerror',e.message));
    page.on('framenavigated',f=>{if(f===page.mainFrame())log('navigation',new URL(f.url()).origin);});
    try{
      if(info.project.use.browserName!=='webkit'){
        cdp=await page.context().newCDPSession(page);
        cdp.on('Page.screencastFrame',({data,sessionId})=>{
          void cdp.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});
          if(closed||Date.now()-last<90||count>=2200)return;
          last=Date.now();const file=String(++count).padStart(6,'0')+'.jpg';
          writeFileSync(join(dir,'frames',file),Buffer.from(data,'base64'));
          appendFileSync(join(dir,'frame-times.ndjson'),JSON.stringify({file,t:last})+'\n');
          if(count%3===1){meta.frames=count;put(join(dir,'meta.json'),meta);}
        });
        await cdp.send('Page.startScreencast',{format:'jpeg',quality:65,maxWidth:480,maxHeight:1000,everyNthFrame:1});
      }
      await use();
    }finally{
      await page.evaluate(()=>window.__djAuditFlush?.()).catch(()=>{});
      closed=true;
      if(cdp){await cdp.send('Page.stopScreencast').catch(()=>{});await cdp.detach().catch(()=>{});}
      meta.frames=count;meta.status=info.status;meta.expected=info.expectedStatus;meta.end=Date.now();
      meta.errors=info.errors.map(e=>String(e.message||'').slice(0,3000));
      put(join(dir,'meta.json'),meta);
    }
  },{auto:true}]
});
