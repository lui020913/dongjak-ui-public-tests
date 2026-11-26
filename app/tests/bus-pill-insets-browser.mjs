import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('../index.html');
const policy=html.match(/\/\* DJ_BUS_PILL_LAYOUT_START[\s\S]*?\*\/([\s\S]*?)\/\* DJ_BUS_PILL_LAYOUT_END \*\//)?.[1];
assert.ok(policy);
const css=['style.css','v8215-news-transit-sticky-redesign.css','v8215-transit-auth-bus-sheet.css','v825-typography-facility-transport.css','v857-requested-ux.css','v875-mobile-stability.css','v887-interaction-polish.css'].map(p=>read('../src/'+p)).join('\n')+'\n'+read('../../frontend/production/mobile-next.css');
const row=(name,dir,time,count='')=>`<div class="transport-arrival-row"><div class="transport-arrival-main"><strong class="dj-transit-bus-route" data-bus-class="village">${name}</strong><small>${dir}</small></div><span class="transport-arrival-time">${time}${count?'<small class="dj875-stop-count">'+count+'</small>':''}</span></div>`;
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  for(const width of [320,375,390,430]){
   const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true});
   try{
    await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${policy}\n${css}</style></head><body><div id="app" style="position:static"><section id="transport-sheet" data-kind="bus" class="transport-sheet dj-news-transit-fixed" style="position:static!important;width:calc(100% - 24px)!important;max-width:none!important;min-width:0!important;transform:none!important;max-height:none!important;height:auto!important;margin:0 auto!important"><div class="handle"></div><div class="transport-panel-head"><div><h2 id="transport-title">장성교회</h2></div><button id="transport-close" aria-label="닫기">×</button><div class="dj-news-transport-actions"><button>출발</button><button>도착</button><button>☆</button><button>공유</button></div></div><div class="dj875-transit-scroll" style="max-height:none!important"><div class="transport-arrivals-title"><div id="transport-mode-tabs" class="transport-mode-tabs"><button aria-selected="true">실시간</button><button>시간표</button></div><div class="transport-updated-actions"><span id="transport-update-time">14:56 조회</span><button id="transport-refresh">다시 조회</button></div></div><div id="transport-arrivals">${row('동작02','사자암 방면','5분 후','2 정거장 전')}${row('동작11','사자암 방면','곧 도착')}${row('N876-1','서울특별시청앞환승센터 방면','운행 종료')}${row('동작123-4','긴 방면 이름 환승센터 방면','13분 후','12 정거장 전')}</div></div></section></div></body></html>`);
    for(const delta of [0,3]){
     await page.evaluate(v=>document.getElementById('app').style.setProperty('--dj803-text-delta',v+'px'),delta);
     const result=await page.evaluate(()=>{
      const rect=e=>e.getBoundingClientRect(),sheet=document.getElementById('transport-sheet'),s=rect(sheet);
      const cards=[...document.querySelectorAll('#transport-arrivals>.transport-arrival-row')];
      const inside=(outer,r,pad=0)=>r.left>=outer.left+pad-.75&&r.right<=outer.right-pad+.75&&r.top>=outer.top+pad-.75&&r.bottom<=outer.bottom-pad+.75;
      const failures=[];
      for(const card of cards){
       const c=rect(card);
       if(!inside(s,c,0))failures.push('card outside sheet');
       const cs=getComputedStyle(card);
       if(parseFloat(cs.paddingLeft)<12||parseFloat(cs.paddingRight)<12||parseFloat(cs.borderTopLeftRadius)<30)failures.push('capsule padding/radius');
       const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);let text;
       while((text=walker.nextNode())){
        const range=document.createRange();range.selectNodeContents(text);
        for(const r of range.getClientRects())if(!inside(c,r,5))failures.push('text outside safe card bounds: '+text.textContent);
       }
       for(const x of card.querySelectorAll('.transport-arrival-main,.transport-arrival-main>strong,.transport-arrival-main>small,.transport-arrival-time,.dj875-stop-count')){
        if(x.scrollWidth>x.clientWidth+2)failures.push('horizontal clipping: '+x.textContent);
       }
      }
      const grid=rect(document.getElementById('transport-arrivals')),actions=rect(document.querySelector('.dj-news-transport-actions')),toolbar=rect(document.querySelector('.transport-arrivals-title'));
      for(const [name,x] of [['grid',grid],['actions',actions],['toolbar',toolbar]])if(Math.abs(x.left-grid.left)>2||Math.abs(x.right-grid.right)>2)failures.push(name+' unequal side inset');
      return {failures,inset:grid.left-s.left,columns:getComputedStyle(document.getElementById('transport-arrivals')).gridTemplateColumns};
     });
     assert.deepEqual(result.failures,[],engine.name()+' '+width+'px +'+delta+' '+JSON.stringify(result));
     assert.ok(result.inset>=8&&result.inset<=14,JSON.stringify(result));
     console.log(engine.name(),width,delta,result.columns);
    }
   }finally{await page.close()}
  }
 }finally{await browser.close()}
}
