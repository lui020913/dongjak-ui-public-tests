import {WALK_ICON_PATH} from './route-walk-icon.mjs';
import {busRouteColor} from './bus-route-overlay.js';
import {subwayLineColor} from './transport-map.js';
import {revealSurface,exitSurface,cancelSurfaceMotion} from './surface-motion-fallback.js';
import './transit-route-detail.css';
import {advanceTransitGps} from './transit-guide-proximity.mjs';
import {transitRailArrival} from './transit-rail-arrival.mjs';
import {splitRailDetail} from './transit-rail-detail.mjs';
const labels={walk:'도보',bus:'버스',rail:'지하철'};
const paths={
 walk:WALK_ICON_PATH,
 bus:'<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 12h14M8 19v2m8-2v2M8 15h1m6 0h1"/>',
 rail:'<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 11h14M9 18l-3 3m9-3 3 3M8 14h1m6 0h1"/>',
 end:'<circle cx="12" cy="12" r="5"/>',refresh:'<path d="M20 11a8 8 0 1 0-2 6m2-6V4m0 7h-7"/>',shield:'<path d="m12 3 8 4v5c0 5-4 8-8 10-4-2-8-5-8-10V7z"/><path d="m9 12 2 2 4-4"/>'
};
const icon=kind=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[kind]+'</svg>';
const railLabel=x=>x==='신림'?'신림선':x+'호선';
const railShapeNote=quality=>quality==='verified'?'공개 철도 선형':quality==='mixed'?'공개 철도 선형·일부 개략 구간':'역 순서 개략 경로';
export function transitPriText(value){
 if(!value)return '보행안전 데이터 미확보';
 const coverage=Number.isFinite(value.coverage)?Math.round(value.coverage*100):null;
 if(!Number.isFinite(value.risk)||value.coverage<.65||coverage===null)return (coverage>0?'보행안전 데이터 부족':'보행안전 데이터 미확보')+(coverage===null||coverage===0?'':' · 확보 '+coverage+'%');
 return 'PRI '+value.risk.toFixed(1)+'점 · 평가 '+coverage+'%';
}
export function mountTransitDetail({doc,win,app,mapCard,actions}){
 const root=doc.createElement('section');root.id='dj-transit-detail';root.hidden=true;root.setAttribute('aria-label','대중교통 경로 상세');actions?.before(root);
 let current=null,arrivalRequest=null,step=null,gps=null,nearCount=0,lastPosition=null,arrived=false;
 // Explicit inline hiding wins over legacy mobile !important action docks.
 // Restore only the attributes this presenter owns on departure.
 const nativeActionState=new Map();
 function hideNativeActions(){
  const start=doc.getElementById('route-guide-start');
  for(const node of new Set([actions,start].filter(Boolean))){
   if(!nativeActionState.has(node))nativeActionState.set(node,{display:node.style.getPropertyValue('display'),priority:node.style.getPropertyPriority('display'),hidden:node.hidden,inert:node.inert});
   node.hidden=true;node.inert=true;node.style.setProperty('display','none','important');
  }
 }
 function restoreNativeActions(){
  for(const [node,state] of nativeActionState){
   if(state.display)node.style.setProperty('display',state.display,state.priority);else node.style.removeProperty('display');
   node.hidden=state.hidden;node.inert=state.inert;
  }
  nativeActionState.clear();
 }
 const el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
 const same=(a,b)=>a&&b&&JSON.stringify(a.legs||[])===JSON.stringify(b.legs||[])&&a.kind===b.kind&&a.routeId===b.routeId&&a.from===b.from&&a.to===b.to&&a.board===b.board&&a.alight===b.alight&&JSON.stringify(a.lines)===JSON.stringify(b.lines)&&JSON.stringify(a.stops)===JSON.stringify(b.stops);

 function setGpsStatus(text,retry=false){
  const status=root.querySelector('.dj-tr-gps-status'),button=root.querySelector('.dj-tr-gps-retry');
  if(status)status.textContent=text;
  if(button)button.hidden=!retry;
 }
 function stopGps(){
  gps?.abort();gps=null;nearCount=0;lastPosition=null;
 }
 function showPosition(position){
  if(!gps||step===null||arrived)return;
  const count=root.querySelectorAll('.dj-tr-leg').length;
  const result=advanceTransitGps({position,targets:current?.targets,step,rows:count,count:nearCount,lastTimestamp:lastPosition});
  if(result.ignored)return;
  lastPosition=result.timestamp;nearCount=result.count;
  if(result.arrived){arrived=true;step=count-1;stopGps();updateStep();return;}
  if(result.step!==step){step=result.step;updateStep();return;}
  setGpsStatus(result.state==='uncertain'?'GPS 신호 대기 중':'다음 지점까지 약 '+result.meters+'m');
 }
 function startGps(){
  if(gps||step===null||arrived||doc.hidden)return;
  const controller=new AbortController();gps=controller;nearCount=0;lastPosition=null;
  setGpsStatus('GPS 연결 중');
  win.dispatchEvent(new CustomEvent('dongjak:transit-gps-start',{detail:{signal:controller.signal,onPosition:position=>{if(gps===controller)showPosition(position);},onError:()=>{if(gps===controller){stopGps();setGpsStatus('GPS 연결 실패',true);}}}}));
 }
 function beginGuide(){step=0;arrived=false;updateStep();startGps();}
 function endGuide(){stopGps();step=null;arrived=false;updateStep();}
 function gpsControls(){
  const box=el('div','dj-tr-gps');const status=el('small','dj-tr-gps-status','GPS 연결 중');status.setAttribute('role','status');
  const retry=button('다시 연결','dj-tr-gps-retry',startGps);retry.hidden=true;box.append(status,retry);return box;
 }
 const pauseGps=()=>{if(doc.hidden){stopGps();if(step!==null&&!arrived)setGpsStatus('GPS 연결 대기 중');}else if(step!==null&&!arrived)startGps();};
 const pagehide=()=>stopGps();
 doc.addEventListener('visibilitychange',pauseGps);win.addEventListener('pagehide',pagehide);

 function updatePri(){
  if(current.legs){for(const n of root.querySelectorAll('[data-pri-index]')){const i=Number(n.dataset.priIndex);n.textContent=current.walks[i].stationTransfer?'역내 환승 거리 미산정':current.walks[i].meters===0?'동일 위치 연결':current.walks[i].exterior?'동작구 외부 포함 · 보행안전 데이터 미확보':current.priLegs===null?'평가 자료 확인 중':transitPriText(current.priLegs?.[i])+(current.walks[i].priChoice==='observed-comparison'?' · 관측 저위험 후보 선택':'');}return;}
  for(const key of ['first','last']){const n=root.querySelector('[data-pri-leg="'+key+'"]');if(n)n.textContent=current[key]?.exterior?'동작구 외부 포함 · 보행안전 데이터 미확보':current.pri===null?'평가 자료 확인 중':transitPriText(current.pri?.[key])+(current[key]?.priChoice==='observed-comparison'?' · 관측 저위험 후보 선택':'');}
 }
 function updateStep(){
  const rows=[...root.querySelectorAll('.dj-tr-leg')];
  rows.forEach((row,i)=>{row.classList.toggle('is-current',step===i);if(step===i)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');});
  const guide=root.querySelector('.dj-tr-step-guide'),start=root.querySelector('.dj-tr-start'),progress=root.querySelector('.dj-tr-progress');
  guide.hidden=step===null;start.hidden=step!==null;
  const guideBody=root.querySelector('.dj-tr-guide-body');if(guideBody)guideBody.hidden=step===null||arrived;
  if(step===null){stopGps();return;}
  progress.textContent=arrived?'목적지 도착':(step+1)+' / '+rows.length;
  if(!arrived)setGpsStatus('GPS 위치 확인 중');
  rows[step]?.scrollIntoView?.({block:'nearest',behavior:'instant'});
 }
 function appendRailArrival(board,station,lineId){
  if(!station||!lineId)return;
  const line=railLabel(lineId);
  const arrival=el('div','dj-tr-rail-arrival');
  const bar=el('div','dj-tr-arrival');
  const message=el('small','',line+' 승차역 도착정보');
  const rows=el('div','dj-tr-rail-rows');
  const refresh=button('','dj-tr-refresh',async()=>{
   if(arrivalRequest)return;
   const controller=new AbortController();arrivalRequest=controller;
   const timer=win.setTimeout(()=>controller.abort(),10000);
   refresh.disabled=true;rows.replaceChildren();message.textContent='도착정보 조회 중…';
   try{
    const base=String(import.meta.env?.VITE_TRANSPORT_API_BASE||'/api/transport').replace(/\/$/,'');
    const res=await fetch(base+'/subway?'+new URLSearchParams({station,line}),{signal:controller.signal,cache:'no-store'});
    if(!res.ok)throw Error('조회 실패');const data=await res.json();
    if(arrivalRequest!==controller)return;
    const result=transitRailArrival(data,line);
    message.textContent=result.note;
    for(const item of result.rows){const row=el('div','dj-tr-rail-row');row.append(el('small','',item.direction),el('strong','',item.message));rows.append(row);}
   }catch{if(arrivalRequest===controller)message.textContent='검증된 도착정보를 확인하지 못했습니다.';}
   finally{win.clearTimeout(timer);if(arrivalRequest===controller){arrivalRequest=null;refresh.disabled=false;}}
  });refresh.innerHTML=icon('refresh');refresh.setAttribute('aria-label',line+' 승차역 도착정보 새로고침');
  bar.append(message,refresh);arrival.append(bar,rows);board.append(arrival);
 }
 function walkInfo(detail){
  const box=el('div','dj-tr-fare');
  const walks=detail.walks||[detail.first,detail.last];
  const meters=walks.reduce((sum,w)=>sum+(w?.meters||0),0),minutes=walks.reduce((sum,w)=>sum+(w?.minutes||0),0);
  if(detail.time){const t=detail.time;box.append(el('strong','','예상 '+t.totalMinutes+'분'),el('small','','탑승 '+t.rideMinutes+'분 · 대기 약 '+t.waitMinutes+'분'+(t.transferMinutes?' · 역내 환승 약 '+t.transferMinutes+'분':'')),el('small','','도보 '+meters+'m · 약 '+t.walkMinutes+'분'),el('small','','실시간 교통·배차 미반영 추정치'));}else box.append(el('strong','','도보 '+meters+'m · 약 '+minutes+'분'));
  return box;
 }
 function busHours(board,leg){
  if(!leg.firstTime&&!leg.lastTime)return;
  const parts=[leg.firstTime?'첫차 '+leg.firstTime:'',leg.lastTime?'막차 '+leg.lastTime:''].filter(Boolean);
  board.append(el('small','dj-tr-service-hours','승차 정류장 제공 운행시간 · '+parts.join(' / ')+' (변동 가능)'));
 }
 function layoutDetail(header,track,fare,timeline,footer,guideBody){
  const fixed=el('header','dj-tr-fixed-head');fixed.append(header,track);
  const body=el('div','dj-tr-scroll');body.append(fare,timeline,guideBody);
  root.append(fixed,body,footer);
 }
 function render(detail){
  detail=splitRailDetail(detail);
  if(!detail){restoreNativeActions();stopGps();arrivalRequest?.abort();arrivalRequest=null;current=null;step=null;cancelSurfaceMotion(root);const finish=()=>{if(current)return;root.hidden=true;root.replaceChildren();root.style.removeProperty('pointer-events');};if(!root.hidden){root.style.setProperty('pointer-events','none');exitSurface(root,finish);}else finish();return;}
  if(same(current,detail)){current=detail;updatePri();return;}
  cancelSurfaceMotion(root);root.style.removeProperty('pointer-events');hideNativeActions();
  stopGps();arrived=false;arrivalRequest?.abort();arrivalRequest=null;current=detail;step=null;root.replaceChildren();root.hidden=false;
  if(detail.legs){renderMulti(detail);return;}
  const kind=detail.kind,color=kind==='bus'?busRouteColor(detail.routeType):subwayLineColor(railLabel(detail.lines[0]));root.style.setProperty('--tr-line-color',color);
  const name=kind==='bus'?detail.route:[...new Set(detail.lines)].map(railLabel).join(' · ');
  const header=el('div','dj-tr-heading');
  const title=el('strong','',name+' · '+labels[kind]);
  const sub=el('small','',kind==='rail'?railShapeNote(detail.railQuality):'공식 버스 노선');
  header.append(title,sub);
  const track=el('div','dj-tr-order');track.setAttribute('aria-label','이동 순서, 시간 비율 아님');track.append(el('span','','도보'),el('span','dj-tr-vehicle',name),el('span','','도보'));
  const timeline=el('div','dj-tr-timeline');
  function row(type,title,sub){
   const li=el('div','dj-tr-leg');const marker=el('span','dj-tr-marker');marker.innerHTML=icon(type);marker.dataset.kind=type;
   const body=el('div','dj-tr-leg-body');body.append(el('strong','',title),el('small','',sub));li.append(marker,body);timeline.append(li);return body;
  }
  const first=row('walk',detail.from,'도보 '+detail.first.meters+'m · 약 '+detail.first.minutes+'분');
  const firstPri=el('span','dj-tr-pri');firstPri.dataset.priLeg='first';first.append(firstPri);
  const board=row(kind,detail.board+' 승차',name+(detail.changes?' · 환승 '+detail.changes+'회':''));
  const stops=el('details','dj-tr-stops');const summary=el('summary','',(detail.stops?.length>1?detail.stops.length-1:0)+(kind==='bus'?'개 정류장 이동':'개 역 이동'));
  const list=el('ol');for(const stop of detail.stops||[])list.append(el('li','',stop));stops.append(summary,list);board.append(stops);
  if(kind==='bus')busHours(board,detail);
  if(kind==='bus'&&detail.arsId&&detail.routeId){
   const arrival=el('div','dj-tr-arrival');const message=el('small','','도착정보를 조회할 수 있습니다.');
   const refresh=button('','dj-tr-refresh',()=>void loadArrival());refresh.innerHTML=icon('refresh');refresh.setAttribute('aria-label','해당 버스 도착정보 새로고침');arrival.append(message,refresh);board.append(arrival);
   async function loadArrival(){
    arrivalRequest?.abort();const controller=new AbortController();arrivalRequest=controller;const timer=win.setTimeout(()=>controller.abort(),10000);
    refresh.disabled=true;message.textContent='도착정보 조회 중…';
    try{
     const base=String(import.meta.env?.VITE_TRANSPORT_API_BASE||'/api/transport').replace(/\/$/,'');
     const res=await fetch(base+'/bus?'+new URLSearchParams({arsId:detail.arsId}),{signal:controller.signal,cache:'no-store'});
     if(!res.ok)throw Error('조회 실패');const data=await res.json();
     if(arrivalRequest!==controller)return;
     const item=String(data.arsId)===String(detail.arsId)&&data.items?.find(x=>String(x.routeId)===String(detail.routeId));
     message.textContent=item?(item.message||'도착정보 없음')+(data.checkedAt?' · '+data.checkedAt+' 조회':''):'해당 노선 도착정보 없음';
    }catch{if(arrivalRequest===controller)message.textContent='도착정보를 확인하지 못했습니다.';}
    finally{win.clearTimeout(timer);if(arrivalRequest===controller){arrivalRequest=null;refresh.disabled=false;}}
   }
  }
  if(kind==='rail')appendRailArrival(board,detail.stops?.[0],detail.lines?.[0]);
  const last=row('walk',detail.alight+' 하차','도보 '+detail.last.meters+'m · 약 '+detail.last.minutes+'분');
  const lastPri=el('span','dj-tr-pri');lastPri.dataset.priLeg='last';last.append(lastPri);
  row('end',detail.to,'목적지');
  const footer=el('div','dj-tr-footer');
  const start=button('안내 시작','dj-tr-start',beginGuide);
  const guide=el('div','dj-tr-step-guide');guide.hidden=true;const progress=el('small','dj-tr-progress');
  guide.append(progress,button('안내 종료','dj-tr-end',endGuide));
  const guideBody=el('div','dj-tr-guide-body');guideBody.hidden=true;guideBody.append(gpsControls());
  footer.append(start,guide);
  layoutDetail(header,track,walkInfo(detail),timeline,footer,guideBody);updatePri();revealSurface(root);
 }

 function renderMulti(detail){
  const label=leg=>leg.kind==='bus'?leg.route:[...new Set(leg.lines)].map(railLabel).join(' · ');
  const color=leg=>leg.kind==='bus'?busRouteColor(leg.routeType):subwayLineColor(railLabel(leg.lines[0]));
  const header=el('div','dj-tr-heading');header.append(el('strong','',detail.legs.map(label).join(' + ')),el('b','','환승 '+(detail.legs.length-1)+'회'),el('small','',detail.railQuality?railShapeNote(detail.railQuality):'공식 버스 노선'));
  const track=el('div','dj-tr-order dj-tr-multi-order');track.setAttribute('aria-label','이동 순서, 시간 비율 아님');
  track.append(el('span','','도보'));
  detail.legs.forEach((leg,i)=>{if(i)track.append(el('span','','환승'));const v=el('span','dj-tr-vehicle',label(leg));v.style.setProperty('--vehicle-color',color(leg));track.append(v);});
  track.append(el('span','','도보'));
  const timeline=el('div','dj-tr-timeline');
  function row(type,title,sub,routeColor){
   const li=el('div','dj-tr-leg');const marker=el('span','dj-tr-marker');marker.innerHTML=icon(type);marker.dataset.kind=type;if(routeColor)marker.style.setProperty('--tr-line-color',routeColor);
   const body=el('div','dj-tr-leg-body');body.append(el('strong','',title),el('small','',sub));li.append(marker,body);timeline.append(li);return body;
  }
  const walkRow=(i,title)=>{
   const w=detail.walks[i];const body=row('walk',title,w.stationTransfer?'다음 노선으로 환승':w.meters===0?'동일 위치에서 연결':'도보 '+w.meters+'m · 약 '+w.minutes+'분');
   const pri=el('span','dj-tr-pri');pri.dataset.priIndex=String(i);body.append(pri);
  };
  walkRow(0,detail.from);
  for(let i=0;i<detail.legs.length;i++){
   const leg=detail.legs[i];
   const board=row(leg.kind,leg.origin+' 승차',label(leg)+' → '+leg.destination+' 하차',color(leg));
   const stops=el('details','dj-tr-stops');const summary=el('summary','',Math.max(0,leg.stops.length-1)+(leg.kind==='bus'?'개 정류장 이동':'개 역 이동'));
   const list=el('ol');for(const stop of leg.stops)list.append(el('li','',stop));stops.append(summary,list);board.append(stops);
   if(leg.kind==='bus')busHours(board,leg);
   if(leg.kind==='bus'&&leg.arsId&&leg.routeId){
    const arrival=el('div','dj-tr-arrival');const message=el('small','','도착정보 조회');
    const refresh=button('','dj-tr-refresh',async()=>{
     if(arrivalRequest)return;
     const controller=new AbortController();arrivalRequest=controller;
     const timer=win.setTimeout(()=>controller.abort(),10000);refresh.disabled=true;message.textContent='도착정보 조회 중…';
     try{
      const base=String(import.meta.env?.VITE_TRANSPORT_API_BASE||'/api/transport').replace(/\/$/,'');
      const res=await fetch(base+'/bus?'+new URLSearchParams({arsId:leg.arsId}),{signal:controller.signal,cache:'no-store'});
      if(!res.ok)throw Error('조회 실패');const data=await res.json();
      if(arrivalRequest!==controller)return;
      const item=String(data.arsId)===String(leg.arsId)&&data.items?.find(x=>String(x.routeId)===String(leg.routeId));
      message.textContent=item?(item.message||'도착정보 없음')+(data.checkedAt?' · '+data.checkedAt+' 조회':''):'해당 노선 도착정보 없음';
     }catch{if(arrivalRequest===controller)message.textContent='도착정보를 확인하지 못했습니다.';}
     finally{win.clearTimeout(timer);if(arrivalRequest===controller){arrivalRequest=null;refresh.disabled=false;}}
    });refresh.innerHTML=icon('refresh');refresh.setAttribute('aria-label',label(leg)+' 도착정보 새로고침');arrival.append(message,refresh);board.append(arrival);
   }
   if(leg.kind==='rail')appendRailArrival(board,leg.stops?.[0],leg.lines?.[0]);
   walkRow(i+1,leg.destination+' 하차'+(i<detail.legs.length-1?' · 환승':''));
  }
  row('end',detail.to,'목적지');
  const footer=el('div','dj-tr-footer');
  const start=button('안내 시작','dj-tr-start',beginGuide);
  const guide=el('div','dj-tr-step-guide');guide.hidden=true;
  const progress=el('small','dj-tr-progress');
  guide.append(progress,button('안내 종료','dj-tr-end',endGuide));
  const guideBody=el('div','dj-tr-guide-body');guideBody.hidden=true;guideBody.append(gpsControls());
  footer.append(start,guide);layoutDetail(header,track,walkInfo(detail),timeline,footer,guideBody);updatePri();revealSurface(root);
 }

 const listener=e=>render(e.detail);win.addEventListener('dongjak:transit-detail',listener);
 return ()=>{restoreNativeActions();stopGps();doc.removeEventListener('visibilitychange',pauseGps);win.removeEventListener('pagehide',pagehide);win.removeEventListener('dongjak:transit-detail',listener);arrivalRequest?.abort();cancelSurfaceMotion(root);root.remove();};
}
