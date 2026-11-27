import {findTransitOptions} from './transit-route-planner.mjs';
import {busRouteColor} from './bus-route-overlay.js';
import {subwayLineColor} from './transport-map.js';
import {revealSurface,exitSurface,cancelSurfaceMotion} from './surface-motion-fallback.js';
import css from './transit-route-comparison.css?inline';
import {bindTransitSheetHeader} from './transit-sheet-gesture.js';
import {reviewAllTransitCandidates,formatTransitReview} from './transit-candidate-review.mjs';
import {WALK_ICON_PATH} from './route-walk-icon.mjs';
const icons={
 walk:WALK_ICON_PATH,
 bus:'<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 12h14M8 19v2m8-2v2M8 15h1m6 0h1"/>',
 rail:'<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 11h14M9 18l-3 3m9-3 3 3M8 14h1m6 0h1"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',back:'<path d="m14 5-7 7 7 7M7 12h13"/>',chevron:'<path d="m9 5 7 7-7 7"/>'
};
const icon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
const railLabel=line=>line==='신림'?'신림선':line+'호선';
const routeMetric=(plan,result,done)=>result?'도보 '+result.walkMinutes+'분':done?'도보 시간 미확인':'도보 조회 중';
const legLabel=p=>p.kind==='bus'?p.route:[...new Set(p.lines)].map(railLabel).join(' · ');
const nameOf=p=>p?.name||p?.label||'선택한 장소';
export function mountTransitComparison({doc,win,shadow,host,view,app}){
 const q=s=>shadow.querySelector(s);
 const style=doc.createElement('style');style.textContent=css;shadow.append(style);
 const panel=doc.createElement('section');panel.className='transit-results';panel.hidden=true;panel.setAttribute('aria-label','대중교통 경로 비교');
 panel.innerHTML='<header class="tr-header"><div class="tr-grip" aria-hidden="true"></div><div class="tr-head"><h2>추천 대중교통 경로</h2><button type="button" aria-label="경로 결과 닫기">'+icon('close')+'</button></div><p class="tr-endpoints"></p></header><div class="tr-scroll"><div class="tr-review-tools"><button type="button" class="tr-pri-preference" aria-pressed="true">보행 위험도 고려</button></div><div class="tr-filter" role="group" aria-label="교통수단 필터"></div><p class="tr-note" role="status" aria-live="polite"></p><div class="tr-list"></div></div>';
 view.append(panel);
 const safeTop=()=>Math.ceil(q('.header').getBoundingClientRect().bottom+8);
 const syncBounds=()=>{host.style.setProperty('--tr-sheet-top',safeTop()+'px');host.style.setProperty('--tr-font',win.getComputedStyle(app).fontFamily);};
 const gesture=bindTransitSheetHeader({doc,win,panel,header:panel.querySelector('.tr-header'),safeTop,onDismiss:()=>close({animate:true})});
 let focusTimer=0;
 const focus=()=>{win.clearTimeout(focusTimer);focusTimer=win.setTimeout(()=>{if(panel.hidden||app.dataset.tab!=='route'||panel.classList.contains('dj871-sheet-expanded'))return;win.dispatchEvent(new CustomEvent('dongjak:transit-comparison-focus',{detail:{sheetTop:panel.getBoundingClientRect().top,toolbarBottom:q('.header').getBoundingClientRect().bottom,plan:options?(groupsOf()[filter]||groupsOf().all)[0]:null,summary:options?reviewed.get((groupsOf()[filter]||groupsOf().all)[0]):null}}));},260);};
 const resize=()=>{if(!panel.hidden){syncBounds();focus();}};
 const panelResize=typeof ResizeObserver==='function'?new ResizeObserver(focus):null;panelResize?.observe(panel);
 panel.addEventListener('transitionend',focus);win.addEventListener('resize',resize);win.visualViewport?.addEventListener('resize',resize);
 let mode='walk',controller=null,previewController=null,generation=0,options=null,filter='all',disposed=false,pointKey='',cached=null,busy=false,preferPri=true,reviewed=new Map(),reviewController=null,reviewLabels=new Map();
 const status=panel.querySelector('.tr-note'),list=panel.querySelector('.tr-list'),filters=panel.querySelector('.tr-filter'),endpoints=panel.querySelector('.tr-endpoints');
 const preference=panel.querySelector('.tr-pri-preference');
 const groupsOf=()=>{const groups={bus:[...options.bus,...(options.busTransfer||[])],rail:options.rail,mixed:options.mixed||[]};groups.all=[...groups.bus,...groups.rail,...groups.mixed];return groups;};
 const stopReview=()=>{reviewController?.abort();reviewController=null;};
 const resetReview=()=>{stopReview();reviewed=new Map();reviewLabels.clear();};
 preference.addEventListener('click',()=>{if(busy)return;preferPri=!preferPri;resetReview();if(options){render();void reviewCandidates();}preference.setAttribute('aria-pressed',String(preferPri));preference.textContent=preferPri?'보행 위험도 고려':'일반 보행 경로';});
 const points=()=>{let result=[];win.dispatchEvent(new CustomEvent('dongjak:transit-route-points',{detail:{accept:value=>{result=value;}}}));return result;};
 const key=ps=>ps.map(p=>p.lng+','+p.lat).join('/');
 const setBusy=value=>{busy=value;preference.disabled=value;panel.setAttribute('aria-busy',String(value));for(const b of [...filters.children,...list.querySelectorAll('button')])b.disabled=value;};
 const close=({animate=false,keepCache=false}={})=>{
  const seq=++generation;win.clearTimeout(focusTimer);controller?.abort();controller=null;previewController?.abort();previewController=null;stopReview();setBusy(false);
  if(!keepCache){cached=null;resetReview();}
  gesture.reset();
  const finish=()=>{if(seq!==generation)return;panel.hidden=true;delete view.dataset.transitResults;win.dispatchEvent(new CustomEvent('dongjak:transit-comparison-dismiss',{detail:{keepPreview:keepCache&&app.dataset.tab==='map'}}));list.replaceChildren();options=null;reviewLabels.clear();};
  cancelSurfaceMotion(panel);
  if(animate&&!panel.hidden){panel.style.pointerEvents='none';exitSurface(panel,()=>{panel.style.removeProperty('pointer-events');finish();});}else{panel.style.removeProperty('pointer-events');finish();}
 };
 const syncMode=()=>{
  view.dataset.transitMode=mode;
  app.dataset.djTransitMode=mode;
  win.dispatchEvent(new CustomEvent('dongjak:transit-mode-change',{detail:mode}));
  for(const btn of shadow.querySelectorAll('[data-transit-mode]'))btn.setAttribute('aria-pressed',String(btn.dataset.transitMode===mode));
  q('#v3-walk-mode').hidden=true;
  const cta=q('#v3-cta-label');if(cta)cta.textContent=mode==='transit'?'대중교통 경로 찾기':'경로 찾기';
 };
 const choose=e=>{mode=e.currentTarget.dataset.transitMode;close();syncMode();};
 const modeButtons=[...shadow.querySelectorAll('[data-transit-mode]')];modeButtons.forEach(b=>{b.innerHTML=icon(b.dataset.transitMode==='walk'?'walk':'bus')+(b.dataset.transitMode==='walk'?'도보':'대중교통');b.addEventListener('click',choose);});
 panel.querySelector('.tr-head button').addEventListener('click',()=>{close({animate:true});});
 for(const [id,label] of [['all','전체'],['bus','버스'],['rail','지하철'],['mixed','버스+지하철']]){
  const b=doc.createElement('button');b.type='button';b.dataset.filter=id;b.innerHTML=(id==='all'||id==='mixed'?'':icon(id))+label;b.addEventListener('click',()=>{if(busy)return;filter=id;render(true);});filters.append(b);
 }
 function note(text,retry=false){status.hidden=false;status.textContent=text;list.replaceChildren();if(retry){const b=doc.createElement('button');b.type='button';b.className='tr-retry';b.textContent='다시 조회';b.addEventListener('click',search);list.append(b);}}
 function show(ps){gesture.reset();syncBounds();panel.querySelector('.tr-scroll').scrollTop=0;cancelSurfaceMotion(panel);panel.style.removeProperty('pointer-events');endpoints.textContent=ps.map(nameOf).join(' → ');panel.hidden=false;view.dataset.transitResults='true';revealSurface(panel);if(ps.length===2)focus();}
 function render(animate=false){
  if(!options)return;
  list.replaceChildren();reviewLabels.clear();
  const groups=groupsOf();
  for(const b of filters.children){const id=b.dataset.filter;b.setAttribute('aria-pressed',String(id===filter));const label={all:'전체',bus:'버스',rail:'지하철',mixed:'버스+지하철'}[id];b.textContent=label+' '+groups[id].length;}
  const plans=groups[filter]||groups.all;
  status.textContent='';status.hidden=true;
  if(!plans.length){const p=doc.createElement('p');p.className='tr-note';p.textContent='조회 범위에서 확인된 이동안이 없습니다.';list.append(p);}
  for(const plan of plans){
   const card=doc.createElement('button');card.type='button';card.className='tr-card';const lead=plan.legs?.[0]||plan;card.style.setProperty('--route-color',lead.kind==='bus'?busRouteColor(lead.routeType):subwayLineColor(railLabel(lead.lines[0])));
   const metrics=doc.createElement('div');metrics.className='tr-metrics';const metric=doc.createElement('strong');metric.textContent=routeMetric(plan,reviewed.get(plan),reviewed.has(plan));metrics.append(metric);
   const head=doc.createElement('div');head.className='tr-row';
   const mark=doc.createElement('span');mark.className='tr-bus-icon';mark.innerHTML=icon(lead.kind);
   const title=doc.createElement('strong');title.textContent=plan.legs?plan.legs.map(legLabel).join(' + '):plan.kind==='bus'?plan.route+' · 직행버스':legLabel(plan);
   const chevron=doc.createElement('span');chevron.className='tr-chevron';chevron.innerHTML=icon('chevron');head.append(mark,title,chevron);head.classList.add('tr-route-accessible-heading');
   const detail=doc.createElement('span');detail.className='tr-route-names';detail.textContent=plan.origin.name+' 승차 → '+plan.destination.name+' 하차';
   const meta=doc.createElement('small');meta.textContent=(plan.legs?'환승 '+(plan.legs.length-1)+'회':plan.kind==='bus'?'직행 · '+plan.stopCount+'개 정류장':'환승 '+plan.changes+'회');
   const track=doc.createElement('div');track.className='tr-route-badges';track.setAttribute('aria-label','탑승 노선 순서');
   const legs=plan.legs||[plan];let count=0;
   for(const leg of legs){for(const line of leg.kind==='bus'?[leg.route]:[...new Set(leg.lines||[])]){if(count++){const arrow=doc.createElement('span');arrow.className='tr-badge-arrow';arrow.textContent='›';track.append(arrow);}const badge=doc.createElement('span');badge.className='tr-line-badge';badge.textContent=leg.kind==='bus'?line:railLabel(line);badge.style.setProperty('--line-color',leg.kind==='bus'?busRouteColor(leg.routeType):subwayLineColor(railLabel(line)));track.append(badge);}}
   card.append(metrics,head,track,detail,meta);
   const summary=doc.createElement('small');summary.className='tr-review-result';summary.textContent=formatTransitReview(reviewed.get(plan),reviewed.has(plan));summary.hidden=!reviewed.has(plan);card.append(summary);reviewLabels.set(plan,{summary,metric});
   card.addEventListener('click',async()=>{
    if(busy)return;if(key(points())!==pointKey){close();return;}
    const seq=generation;const request=new AbortController();previewController=request;stopReview();setBusy(true);cached={key:pointKey,options,filter,reviewed,preferPri};
    status.hidden=false;status.textContent='선택한 경로를 불러오는 중입니다.';
    try{await new Promise((resolve,reject)=>win.dispatchEvent(new CustomEvent('dongjak:transit-route-preview',{detail:{plan,signal:request.signal,resolve,reject,preferPri}})));if(seq===generation)close({keepCache:true});}
    catch(e){if(seq===generation){cached=null;status.hidden=false;status.textContent=e.message||'경로를 표시하지 못했습니다.';setBusy(false);void reviewCandidates();}}
   });list.append(card);
  }
  if(animate)revealSurface(list);focus();
 }
 async function reviewCandidates(){
  if(!options||disposed||panel.hidden||busy||reviewController)return;
  const plans=groupsOf().all.filter(plan=>!reviewed.has(plan));if(!plans.length)return;
  const request=new AbortController(),seq=generation,policy=preferPri,walkCache=new Map();reviewController=request;
  try{
   await reviewAllTransitCandidates(plans,{signal:request.signal,concurrency:2,review:plan=>new Promise((resolve,reject)=>win.dispatchEvent(new CustomEvent('dongjak:transit-candidate-review',{detail:{plan,signal:request.signal,preferPri:policy,walkCache,resolve,reject}}))),onResult:(plan,summary)=>{
    if(seq!==generation||request.signal.aborted||reviewController!==request)return;
    reviewed.set(plan,summary);const label=reviewLabels.get(plan);if(label){label.summary.textContent=formatTransitReview(summary,true);label.summary.hidden=false;label.metric.textContent=routeMetric(plan,summary,true);}if(plan===(groupsOf()[filter]||groupsOf().all)[0])focus();
   }});
  }finally{if(reviewController===request)reviewController=null;}
 }
 async function search(){
  close();const ps=points();show(ps);filter='all';
  if(ps.length!==2){for(const b of filters.children)b.disabled=true;note('대중교통은 경유지 없는 출발지와 도착지 두 곳을 지원합니다. 경유지를 삭제한 후 다시 조회하세요.');return;}
  let policy='boundary-unavailable';win.dispatchEvent(new CustomEvent('dongjak:transit-scope-check',{detail:{accept:value=>{policy=value;}}}));
  if(policy!=='allowed'){for(const b of filters.children)b.disabled=true;note(policy==='both-outside'?'출발지 또는 목적지 중 한 곳은 동작구 안이어야 합니다.':policy==='outside-service-area'?'현재 지원하는 서울 검색 범위 밖입니다.':'동작구 경계정보를 확인하지 못했습니다.');return;}
  pointKey=key(ps);const seq=generation;const requestController=new AbortController();controller=requestController;
  const timer=win.setTimeout(()=>requestController.abort(),35000);
  for(const b of filters.children){b.disabled=true;b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));}
  setBusy(true);note('공식 정류장·노선 정보를 조회하는 중입니다.');
  try{const result=await findTransitOptions(ps[0],ps[1],{signal:requestController.signal,apiBase:String(import.meta.env?.VITE_TRANSPORT_API_BASE||'/api/transport').replace(/\/$/,'')});if(seq!==generation||disposed)return;options=result;setBusy(false);render(true);void reviewCandidates();}
  catch(e){if(seq===generation&&!disposed){setBusy(false);note('교통정보를 불러오지 못했습니다. 다시 시도해 주세요.',true);}}
  finally{win.clearTimeout(timer);}
 }
 const back=event=>{if(panel.hidden)return;event.preventDefault();event.stopImmediatePropagation();close({animate:true});};
 const escape=event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopImmediatePropagation();close({animate:true});}};
 q('[data-v3="back"]').addEventListener('click',back,true);win.addEventListener('keydown',escape,true);
 const endpointChanged=()=>close();
 const editorReset=()=>{mode='walk';close();syncMode();};
 const returnComparison=()=>{win.requestAnimationFrame(()=>{if(disposed||app.dataset.tab!=='route'||host.hidden)return;const ps=points();if(!cached||key(ps)!==cached.key||ps.length!==2)return;mode='transit';syncMode();options=cached.options;filter=cached.filter;reviewed=cached.reviewed||new Map();preferPri=cached.preferPri??true;preference.setAttribute('aria-pressed',String(preferPri));preference.textContent=preferPri?'보행 위험도 고려':'일반 보행 경로';pointKey=cached.key;show(ps);render();void reviewCandidates();});};
 const observer=new MutationObserver(()=>{host.dataset.transitTheme=app.dataset.theme||'light';if(app.dataset.tab!=='route'||win.innerWidth>=700){if(!panel.hidden||busy)close({keepCache:app.dataset.tab==='map'&&Boolean(app.dataset.djTransitPreview)});if(app.dataset.tab!=='map'&&app.dataset.tab!=='route')cached=null;}});
 observer.observe(app,{attributes:true,attributeFilter:['data-tab','data-theme']});observer.observe(host,{attributes:true,attributeFilter:['hidden']});
 for(const name of ['dongjak:route-endpoint-registered','dongjak:route-swap'])win.addEventListener(name,endpointChanged);
 win.addEventListener('dongjak:route-editor-reset',editorReset);
 win.addEventListener('dongjak:transit-return-comparison',returnComparison);
 host.dataset.transitTheme=app.dataset.theme||'light';syncMode();
 return {active:()=>mode==='transit',search,close,dispose:()=>{disposed=true;close();observer.disconnect();modeButtons.forEach(b=>b.removeEventListener('click',choose));for(const name of ['dongjak:route-endpoint-registered','dongjak:route-swap'])win.removeEventListener(name,endpointChanged);win.removeEventListener('dongjak:route-editor-reset',editorReset);win.removeEventListener('dongjak:transit-return-comparison',returnComparison);q('[data-v3="back"]').removeEventListener('click',back,true);win.removeEventListener('keydown',escape,true);win.removeEventListener('resize',resize);win.visualViewport?.removeEventListener('resize',resize);panelResize?.disconnect();panel.removeEventListener('transitionend',focus);win.clearTimeout(focusTimer);gesture.dispose();panel.remove();style.remove();}};
}
