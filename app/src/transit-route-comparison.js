import {findTransitOptions} from './transit-route-planner.mjs';
import {busRouteColor} from './bus-route-overlay.js';
import {subwayLineColor} from './transport-map.js';
import {revealSurface,exitSurface,cancelSurfaceMotion} from './surface-motion-fallback.js';
import css from './transit-route-comparison.css?inline';
import {recommendReviewedTransit} from './transit-candidate-review.mjs';
const icons={
 walk:'<circle cx="13" cy="4" r="2"/><path d="m7 21 3-7 3 2 3 5M11 8l-2 5-4 2m6-7 4 4 4 1"/>',
 bus:'<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 12h14M8 19v2m8-2v2M8 15h1m6 0h1"/>',
 rail:'<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 11h14M9 18l-3 3m9-3 3 3M8 14h1m6 0h1"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',back:'<path d="m14 5-7 7 7 7M7 12h13"/>',chevron:'<path d="m9 5 7 7-7 7"/>'
};
const icon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
const railLabel=line=>line==='신림'?'신림선':line+'호선';
const legLabel=p=>p.kind==='bus'?p.route:[...new Set(p.lines)].map(railLabel).join(' · ');
const nameOf=p=>p?.name||p?.label||'선택한 장소';
export function mountTransitComparison({doc,win,shadow,host,view,app}){
 const q=s=>shadow.querySelector(s);
 const style=doc.createElement('style');style.textContent=css;shadow.append(style);
 const panel=doc.createElement('section');panel.className='transit-results';panel.hidden=true;panel.setAttribute('aria-label','대중교통 경로 비교');
 panel.innerHTML='<div class="tr-grip" aria-hidden="true"></div><div class="tr-head"><h2>대중교통 경로</h2><button type="button" aria-label="경로 결과 닫기">'+icon('close')+'</button></div><p class="tr-endpoints"></p><div class="tr-review-tools"><button type="button" class="tr-pri-preference" aria-pressed="true">보행 위험도 고려</button><button type="button" class="tr-review">도보 비교</button></div><div class="tr-filter" role="group" aria-label="교통수단 필터"></div><p class="tr-note" role="status" aria-live="polite"></p><div class="tr-list"></div>';
 view.append(panel);
 let mode='walk',controller=null,previewController=null,generation=0,options=null,filter='all',disposed=false,pointKey='',cached=null,busy=false,preferPri=true,reviewed=new Map(),recommended=null,reviewNote='';
 const status=panel.querySelector('.tr-note'),list=panel.querySelector('.tr-list'),filters=panel.querySelector('.tr-filter'),endpoints=panel.querySelector('.tr-endpoints');
 const preference=panel.querySelector('.tr-pri-preference'),reviewButton=panel.querySelector('.tr-review');
 const groupsOf=()=>{const groups={bus:[...options.bus,...(options.busTransfer||[])],rail:options.rail,mixed:options.mixed||[]};groups.all=[...groups.bus,...groups.rail,...groups.mixed];return groups;};
 const resetReview=()=>{reviewed=new Map();recommended=null;reviewNote='';};
 preference.addEventListener('click',()=>{if(busy)return;preferPri=!preferPri;resetReview();if(options)render();preference.setAttribute('aria-pressed',String(preferPri));preference.textContent=preferPri?'보행 위험도 고려':'일반 보행 경로';});
 const points=()=>{let result=[];win.dispatchEvent(new CustomEvent('dongjak:transit-route-points',{detail:{accept:value=>{result=value;}}}));return result;};
 const key=ps=>ps.map(p=>p.lng+','+p.lat).join('/');
 const setBusy=value=>{busy=value;preference.disabled=value;reviewButton.disabled=value||!options;panel.setAttribute('aria-busy',String(value));for(const b of [...filters.children,...list.querySelectorAll('button')])b.disabled=value;};
 const close=({animate=false,keepCache=false}={})=>{
  const seq=++generation;controller?.abort();controller=null;previewController?.abort();previewController=null;setBusy(false);
  if(!keepCache){cached=null;resetReview();}
  const finish=()=>{if(seq!==generation)return;panel.hidden=true;delete view.dataset.transitResults;list.replaceChildren();options=null;reviewButton.disabled=true;};
  cancelSurfaceMotion(panel);
  if(animate&&!panel.hidden){panel.style.pointerEvents='none';exitSurface(panel,()=>{panel.style.removeProperty('pointer-events');finish();});}else{panel.style.removeProperty('pointer-events');finish();}
 };
 const syncMode=()=>{
  view.dataset.transitMode=mode;
  for(const btn of shadow.querySelectorAll('[data-transit-mode]'))btn.setAttribute('aria-pressed',String(btn.dataset.transitMode===mode));
  q('#v3-walk-mode').hidden=true;
  const cta=q('#v3-cta-label');if(cta)cta.textContent=mode==='transit'?'대중교통 경로 찾기':'경로 찾기';
 };
 const choose=e=>{mode=e.currentTarget.dataset.transitMode;close();syncMode();};
 const modeButtons=[...shadow.querySelectorAll('[data-transit-mode]')];modeButtons.forEach(b=>{b.innerHTML=icon(b.dataset.transitMode==='walk'?'walk':'bus')+(b.dataset.transitMode==='walk'?'도보':'대중교통');b.addEventListener('click',choose);});
 panel.querySelector('.tr-head button').addEventListener('click',()=>{close({animate:true});});
 for(const [id,label] of [['all','전체'],['bus','버스'],['rail','지하철'],['mixed','버스+지하철']]){
  const b=doc.createElement('button');b.type='button';b.dataset.filter=id;b.innerHTML=(id==='all'||id==='mixed'?'':icon(id))+label;b.addEventListener('click',()=>{if(busy)return;filter=id;resetReview();render(true);});filters.append(b);
 }
 function note(text,retry=false){status.textContent=text;list.replaceChildren();if(retry){const b=doc.createElement('button');b.type='button';b.className='tr-retry';b.textContent='다시 조회';b.addEventListener('click',search);list.append(b);}}
 function show(ps){cancelSurfaceMotion(panel);panel.style.removeProperty('pointer-events');endpoints.textContent=ps.map(nameOf).join(' → ');panel.hidden=false;view.dataset.transitResults='true';revealSurface(panel);}
 function render(animate=false){
  if(!options)return;
  list.replaceChildren();
  const groups=groupsOf();
  reviewButton.disabled=busy||!(groups[filter]||groups.all).length;
  for(const b of filters.children){const id=b.dataset.filter;b.setAttribute('aria-pressed',String(id===filter));const label={all:'전체',bus:'버스',rail:'지하철',mixed:'버스+지하철'}[id];b.textContent=label+' '+groups[id].length;}
  const plans=groups[filter]||groups.all;
  status.textContent=(options.busStatus==='complete'?'조회 범위 내 이동안입니다.':'일부 버스 정보 조회 불가. ')+' 시간·요금은 확인된 정보만 표시합니다.'+(reviewNote?' '+reviewNote:'');
  if(!plans.length){const p=doc.createElement('p');p.className='tr-note';p.textContent='조회 범위에서 확인된 이동안이 없습니다.';list.append(p);}
  for(const plan of plans){
   const card=doc.createElement('button');card.type='button';card.className='tr-card';const lead=plan.legs?.[0]||plan;card.style.setProperty('--route-color',lead.kind==='bus'?busRouteColor(lead.routeType):subwayLineColor(railLabel(lead.lines[0])));
   const head=doc.createElement('div');head.className='tr-row';
   const mark=doc.createElement('span');mark.className='tr-bus-icon';mark.innerHTML=icon(lead.kind);
   const title=doc.createElement('strong');title.textContent=plan.legs?plan.legs.map(legLabel).join(' + '):plan.kind==='bus'?plan.route+' · 직행버스':legLabel(plan);
   const chevron=doc.createElement('span');chevron.className='tr-chevron';chevron.innerHTML=icon('chevron');head.append(mark,title,chevron);
   const detail=doc.createElement('span');detail.className='tr-route-names';detail.textContent=plan.origin.name+' 승차 → '+plan.destination.name+' 하차';
   const meta=doc.createElement('small');meta.textContent=plan.legs?'환승 '+(plan.legs.length-1)+'회 · 전체 시간 미확인':plan.kind==='bus'?plan.stopCount+'개 정류장 이동 · 소요시간 미확인':plan.railStops+'개 역 이동 · 환승 '+plan.changes+'회 · 참고 '+Math.ceil(plan.indicativeMinutes)+'분 (대기 제외, 추정)';
   const track=doc.createElement('div');track.className='tr-track';if(plan.legs){track.classList.add('tr-multi-track');track.innerHTML='<span>도보</span>'+plan.legs.map((leg,i)=>(i?'<span>환승</span>':'')+'<span data-vehicle="true">'+(leg.kind==='bus'?'버스':'지하철')+'</span>').join('')+'<span>도보</span>';}else track.innerHTML='<span>도보</span><span>'+(plan.kind==='bus'?'버스':'지하철')+'</span><span>도보</span>';track.setAttribute('aria-label','이동 순서, 시간 비율 아님');
   card.append(head,detail,track,meta);
   if(reviewed.has(plan)){const result=reviewed.get(plan);const summary=doc.createElement('small');summary.className='tr-review-result';summary.textContent=result?'도보 '+result.walkM+'m · 약 '+result.walkMinutes+'분 · '+(result.comparable?'관측 PRI '+result.risk.toFixed(1)+'점':'PRI 비교 자료 부족')+' · 관측 '+Math.round(result.coverage*100)+'%':'도보 연결 확인 불가';card.append(summary);if(recommended===plan){const badge=doc.createElement('span');badge.className='tr-review-label';badge.textContent='비교한 후보 중 상대적 저위험';card.append(badge);}}
   card.addEventListener('click',async()=>{
    if(busy)return;if(key(points())!==pointKey){close();return;}
    const seq=generation;const request=new AbortController();previewController=request;setBusy(true);cached={key:pointKey,options,filter,reviewed,recommended,reviewNote};
    status.textContent='실제 보행 연결 및 위험도 자료를 확인하는 중입니다.';
    try{await new Promise((resolve,reject)=>win.dispatchEvent(new CustomEvent('dongjak:transit-route-preview',{detail:{plan,signal:request.signal,resolve,reject,preferPri}})));if(seq===generation)close({keepCache:true});}
    catch(e){if(seq===generation){cached=null;status.textContent=e.message||'경로를 표시하지 못했습니다.';setBusy(false);}}
   });list.append(card);
  }
  if(animate)revealSurface(list);
 }
 async function reviewCandidates(){
  if(busy||!options)return;
  const groups=groupsOf(),visible=groups[filter]||groups.all;
  // At most three representative candidates; never imply an exhaustive ranking.
  const plans=filter==='all'?[groups.bus[0],groups.rail[0],groups.mixed[0],...visible].filter(Boolean):visible;
  const sample=[...new Set(plans)].slice(0,3);
  if(!sample.length)return;
  resetReview();const seq=generation,request=new AbortController();previewController=request;
  const timer=win.setTimeout(()=>request.abort(),45000);setBusy(true);
  try{
   for(let i=0;i<sample.length;i++){
    if(seq!==generation||request.signal.aborted)break;
    status.textContent='실제 도보 경로 비교 '+(i+1)+' / '+sample.length;
    let summary=null;
    try{summary=await new Promise((resolve,reject)=>win.dispatchEvent(new CustomEvent('dongjak:transit-candidate-review',{detail:{plan:sample[i],signal:request.signal,preferPri,resolve,reject}})));}catch{}
    if(seq!==generation||request.signal.aborted)break;
    reviewed.set(sample[i],summary);
   }
   if(seq!==generation)return;
   const entries=[...reviewed].map(([plan,summary])=>({plan,summary}));
   recommended=!request.signal.aborted&&entries.length===sample.length?recommendReviewedTransit(entries):null;
   reviewNote='선별 후보 '+entries.length+'개 도보 비교'+(visible.length>entries.length?' · 전체 후보 아님':'')+(recommended?' · 관측 저위험 후보 표시':' · 위험도 우열 미확정');
  }finally{win.clearTimeout(timer);if(seq===generation){setBusy(false);render(true);}}
 }
 reviewButton.addEventListener('click',reviewCandidates);
 async function search(){
  close();const ps=points();show(ps);filter='all';
  if(ps.length!==2){for(const b of filters.children)b.disabled=true;note('대중교통은 경유지 없는 출발지와 도착지 두 곳을 지원합니다. 경유지를 삭제한 후 다시 조회하세요.');return;}
  pointKey=key(ps);const seq=generation;const requestController=new AbortController();controller=requestController;
  const timer=win.setTimeout(()=>requestController.abort(),35000);
  for(const b of filters.children){b.disabled=true;b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));}
  setBusy(true);note('공식 정류장·노선 정보를 조회하는 중입니다.');
  try{const result=await findTransitOptions(ps[0],ps[1],{signal:requestController.signal,apiBase:String(import.meta.env?.VITE_TRANSPORT_API_BASE||'/api/transport').replace(/\/$/,'')});if(seq!==generation||disposed)return;options=result;setBusy(false);render(true);}
  catch(e){if(seq===generation&&!disposed){setBusy(false);note('교통정보를 불러오지 못했습니다. 다시 시도해 주세요.',true);}}
  finally{win.clearTimeout(timer);}
 }
 const back=event=>{if(panel.hidden)return;event.preventDefault();event.stopImmediatePropagation();close({animate:true});};
 const escape=event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopImmediatePropagation();close({animate:true});}};
 q('[data-v3="back"]').addEventListener('click',back,true);win.addEventListener('keydown',escape,true);
 const endpointChanged=()=>close();
 const returnComparison=()=>{win.requestAnimationFrame(()=>{if(disposed||app.dataset.tab!=='route'||host.hidden)return;const ps=points();if(!cached||key(ps)!==cached.key||ps.length!==2)return;mode='transit';syncMode();options=cached.options;filter=cached.filter;reviewed=cached.reviewed||new Map();recommended=cached.recommended||null;reviewNote=cached.reviewNote||'';pointKey=cached.key;show(ps);render();});};
 const observer=new MutationObserver(()=>{host.dataset.transitTheme=app.dataset.theme||'light';if(app.dataset.tab!=='route'||win.innerWidth>=700){if(!panel.hidden||busy)close({keepCache:app.dataset.tab==='map'&&Boolean(app.dataset.djTransitPreview)});if(app.dataset.tab!=='map'&&app.dataset.tab!=='route')cached=null;}});
 observer.observe(app,{attributes:true,attributeFilter:['data-tab','data-theme']});observer.observe(host,{attributes:true,attributeFilter:['hidden']});
 for(const name of ['dongjak:route-endpoint-registered','dongjak:route-editor-reset','dongjak:route-swap'])win.addEventListener(name,endpointChanged);
 win.addEventListener('dongjak:transit-return-comparison',returnComparison);
 host.dataset.transitTheme=app.dataset.theme||'light';syncMode();
 return {active:()=>mode==='transit',search,close,dispose:()=>{disposed=true;close();observer.disconnect();modeButtons.forEach(b=>b.removeEventListener('click',choose));for(const name of ['dongjak:route-endpoint-registered','dongjak:route-editor-reset','dongjak:route-swap'])win.removeEventListener(name,endpointChanged);win.removeEventListener('dongjak:transit-return-comparison',returnComparison);q('[data-v3="back"]').removeEventListener('click',back,true);win.removeEventListener('keydown',escape,true);panel.remove();style.remove();}};
}
