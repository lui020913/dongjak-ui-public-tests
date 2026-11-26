import {findTransitOptions} from './transit-route-planner.mjs';
export function mountTransitComparison({doc,win,shadow,host,view,app}){
 const q=s=>shadow.querySelector(s);
 const style=doc.createElement('style');style.textContent=`
 .transit-mode-toggle{display:flex;gap:4px;background:#edf3ef;border-radius:22px;padding:3px;margin:7px 0 3px}
 .transit-mode-toggle button{flex:1;border:0;border-radius:19px;background:transparent;color:#47625a;font-weight:740;font-size:13px;padding:8px}
 .transit-mode-toggle button[aria-pressed=true]{background:#147257;color:#fff}
 .transit-results{position:fixed;left:12px;right:12px;bottom:calc(var(--v3-cta-bottom,111px) + 5px);max-height:min(44dvh,370px);overflow:auto;overscroll-behavior:contain;border:1px solid #d2dcdb;border-radius:23px;background:#fff;padding:12px;pointer-events:auto;box-shadow:0 4px 14px #23463b12;z-index:2}
 .transit-results h2{font-size:16px;margin:0;flex:1}.tr-head{display:flex;align-items:center;gap:8px}.tr-head button{border:0;background:#edf3ef;color:#38584e;border-radius:50%;width:30px;height:30px}
 .tr-filter{display:flex;gap:5px;margin:9px 0}.tr-filter button{flex:1;border:0;border-radius:18px;background:#edf3ef;color:#38584e;padding:6px;font-size:12px;font-weight:700}.tr-filter button[aria-pressed=true]{background:#147257;color:white}
 .tr-card{border:1px solid #d2dcdb;border-radius:15px;margin:7px 0;padding:10px}.tr-card strong{font-size:15px}.tr-card small{display:block;color:#62786f;font-size:11px;margin:5px 0;line-height:1.45}
 .tr-track{display:flex;height:7px;gap:3px;border-radius:8px;overflow:hidden;margin:9px 0}.tr-track i{flex:1;background:#d2dcdb}.tr-track i:nth-child(2){flex:3;background:var(--tr-color,#147257)}
 .tr-card button{border:0;border-radius:18px;background:#e7f0ec;color:#147257;font-weight:740;padding:7px 12px;font-size:12px;width:100%}.tr-note{font-size:11px;color:#62786f;line-height:1.45;margin:6px 0}
 .canvas[data-transit-mode=transit] .pri-trigger,.canvas[data-transit-mode=transit] .waypoint-add-row{display:none!important}
 .canvas[data-transit-results=true] .action,.canvas[data-transit-results=true] .tools,.canvas[data-transit-results=true] .route-panel{visibility:hidden;pointer-events:none}
 `;shadow.append(style);
 const panel=doc.createElement('section');panel.className='transit-results';panel.hidden=true;panel.setAttribute('aria-label','대중교통 경로 비교');
 panel.innerHTML='<div class="tr-head"><h2>대중교통 경로</h2><button type="button" aria-label="경로 결과 닫기">×</button></div><div class="tr-filter" role="group" aria-label="교통수단 필터"></div><p class="tr-note" role="status" aria-live="polite"></p><div class="tr-list"></div>';
 view.append(panel);
 let mode='walk',controller=null,generation=0,options=null,filter='all',disposed=false,pointKey='';
 const status=panel.querySelector('.tr-note'),list=panel.querySelector('.tr-list'),filters=panel.querySelector('.tr-filter');
 const points=()=>{let result=[];win.dispatchEvent(new CustomEvent('dongjak:transit-route-points',{detail:{accept:value=>{result=value;}}}));return result;};
 const key=ps=>ps.map(p=>p.lng+','+p.lat).join('/');
 const close=()=>{generation++;controller?.abort();controller=null;panel.hidden=true;delete view.dataset.transitResults;list.replaceChildren();options=null;};
 const syncMode=()=>{
  view.dataset.transitMode=mode;
  for(const btn of shadow.querySelectorAll('[data-transit-mode]'))btn.setAttribute('aria-pressed',String(btn.dataset.transitMode===mode));
  q('#v3-walk-mode').hidden=mode==='transit';
  const cta=q('#v3-cta-label');if(cta)cta.textContent=mode==='transit'?'대중교통 경로 찾기':'경로 찾기';
 };
 const choose=e=>{mode=e.currentTarget.dataset.transitMode;close();syncMode();};
 const modeButtons=[...shadow.querySelectorAll('[data-transit-mode]')];modeButtons.forEach(b=>b.addEventListener('click',choose));
 panel.querySelector('.tr-head button').addEventListener('click',close);
 for(const [id,label] of [['all','전체'],['bus','버스'],['rail','지하철']]){
  const b=doc.createElement('button');b.type='button';b.dataset.filter=id;b.textContent=label;b.addEventListener('click',()=>{filter=id;render();});filters.append(b);
 }
 function render(){
  list.replaceChildren();
  for(const b of filters.children)b.setAttribute('aria-pressed',String(b.dataset.filter===filter));
  if(!options)return;
  const plans=[...(filter!=='rail'?options.bus:[]),...(filter!=='bus'?options.rail:[])];
  status.textContent=(options.busStatus==='complete'?'제한된 정류장·노선 후보를 조회했습니다.':'일부 버스 데이터 조회 불가. ')+' 환승·운행시간·요금은 미확인입니다.';
  if(!plans.length){const p=doc.createElement('p');p.className='tr-note';p.textContent='조회 범위에서 확인된 이동안이 없습니다.';list.append(p);}
  for(const plan of plans){
   const card=doc.createElement('article');card.className='tr-card';
   const title=doc.createElement('strong');title.textContent=plan.kind==='bus'?plan.route+' · 직행버스':[...new Set(plan.lines)].join(' · ')+' · 지하철';
   const detail=doc.createElement('small');detail.textContent=plan.origin.name+' 승차 → '+plan.destination.name+' 하차';
   const meta=doc.createElement('small');meta.textContent=plan.kind==='bus'?plan.stopCount+'개 정류장 이동 · 시간 미확인':plan.railStops+'개 역 이동 · 환승 '+plan.changes+'회 · 참고 '+Math.ceil(plan.indicativeMinutes)+'분 (대기 제외, 추정)';
   const track=doc.createElement('div');track.className='tr-track';track.setAttribute('aria-hidden','true');track.style.setProperty('--tr-color',plan.kind==='bus'?'#73a52c':'#b88b43');track.innerHTML='<i></i><i></i><i></i>';track.title='도보 · 대중교통 · 도보 (구간 순서)';
   const button=doc.createElement('button');button.type='button';button.textContent='지도에서 경로 보기';
   button.addEventListener('click',async()=>{
    if(key(points())!==pointKey){close();return;}
    const seq=generation;for(const b of list.querySelectorAll('button'))b.disabled=true;
    status.textContent='실제 보행 연결 구간을 확인하는 중입니다.';
    try{await new Promise((resolve,reject)=>win.dispatchEvent(new CustomEvent('dongjak:transit-route-preview',{detail:{plan,resolve,reject}})));if(seq===generation)close();}
    catch(e){if(seq===generation){status.textContent=e.message||'경로를 표시하지 못했습니다.';for(const b of list.querySelectorAll('button'))b.disabled=false;}}
   });
   card.append(title,detail,track,meta,button);list.append(card);
  }
 }
 async function search(){
  close();const ps=points();panel.hidden=false;view.dataset.transitResults='true';filter='all';
  if(ps.length!==2){status.textContent='대중교통은 경유지 없는 출발지와 도착지 두 곳을 지원합니다.';return;}
  pointKey=key(ps);const seq=generation;const requestController=new AbortController();controller=requestController;
  const timer=win.setTimeout(()=>requestController.abort(),30000);
  status.textContent='공식 정류장·노선 정보를 조회하는 중입니다.';
  try{const result=await findTransitOptions(ps[0],ps[1],{signal:requestController.signal,apiBase:String(import.meta.env?.VITE_TRANSPORT_API_BASE||'/api/transport').replace(/\/$/,'')});if(seq!==generation||disposed)return;options=result;render();}
  catch(e){if(seq===generation&&!disposed)status.textContent='교통정보를 불러오지 못했습니다. 다시 시도해 주세요.';}
  finally{win.clearTimeout(timer);}
 }
 const endpointChanged=()=>close();
 const observer=new MutationObserver(()=>{if(app.dataset.tab!=='route'||host.hidden)close();});
 observer.observe(app,{attributes:true,attributeFilter:['data-tab']});observer.observe(host,{attributes:true,attributeFilter:['hidden']});
 for(const name of ['dongjak:route-endpoint-registered','dongjak:route-editor-reset','dongjak:route-swap'])win.addEventListener(name,endpointChanged);
 syncMode();
 return {active:()=>mode==='transit',search,dispose:()=>{disposed=true;close();observer.disconnect();modeButtons.forEach(b=>b.removeEventListener('click',choose));for(const name of ['dongjak:route-endpoint-registered','dongjak:route-editor-reset','dongjak:route-swap'])win.removeEventListener(name,endpointChanged);panel.remove();style.remove();}};
}
