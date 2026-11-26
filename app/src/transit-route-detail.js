import {busRouteColor} from './bus-route-overlay.js';
import {revealSurface,cancelSurfaceMotion} from './surface-motion-fallback.js';
import './transit-route-detail.css';
const labels={walk:'도보',bus:'버스',rail:'지하철'};
const paths={
 walk:'<circle cx="13" cy="4" r="2"/><path d="m7 21 3-7 3 2 3 5M11 8l-2 5-4 2m6-7 4 4 4 1"/>',
 bus:'<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 12h14M8 19v2m8-2v2M8 15h1m6 0h1"/>',
 rail:'<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 11h14M9 18l-3 3m9-3 3 3M8 14h1m6 0h1"/>',
 end:'<circle cx="12" cy="12" r="5"/>',refresh:'<path d="M20 11a8 8 0 1 0-2 6m2-6V4m0 7h-7"/>',shield:'<path d="m12 3 8 4v5c0 5-4 8-8 10-4-2-8-5-8-10V7z"/><path d="m9 12 2 2 4-4"/>'
};
const icon=kind=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[kind]+'</svg>';
const railLabel=x=>x==='신림'?'신림선':x+'호선';
export function transitPriText(value){
 if(!value)return '평가 자료 부족';
 const coverage=Number.isFinite(value.coverage)?Math.round(value.coverage*100):null;
 if(!Number.isFinite(value.risk)||value.coverage<.65||coverage===null)return '평가 자료 부족'+(coverage===null?'':' · 평가 '+coverage+'%');
 return 'PRI '+value.risk.toFixed(1)+'점 · 평가 '+coverage+'%';
}
export function mountTransitDetail({doc,win,app,mapCard,actions}){
 const root=doc.createElement('section');root.id='dj-transit-detail';root.hidden=true;root.setAttribute('aria-label','대중교통 경로 상세');actions?.before(root);
 let current=null,arrivalRequest=null,step=null;
 const el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
 const same=(a,b)=>a&&b&&a.kind===b.kind&&a.routeId===b.routeId&&a.from===b.from&&a.to===b.to&&a.board===b.board&&a.alight===b.alight&&JSON.stringify(a.lines)===JSON.stringify(b.lines)&&JSON.stringify(a.stops)===JSON.stringify(b.stops);
 function updatePri(){
  for(const key of ['first','last']){const n=root.querySelector('[data-pri-leg="'+key+'"]');if(n)n.textContent=current.pri===null?'평가 자료 확인 중':transitPriText(current.pri?.[key]);}
 }
 function updateStep(){
  const rows=[...root.querySelectorAll('.dj-tr-leg')];
  rows.forEach((row,i)=>{row.classList.toggle('is-current',step===i);if(step===i)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');});
  const guide=root.querySelector('.dj-tr-step-guide'),start=root.querySelector('.dj-tr-start'),progress=root.querySelector('.dj-tr-progress');
  guide.hidden=step===null;start.hidden=step!==null;
  if(step!==null){progress.textContent=(step+1)+' / '+rows.length+' · 직접 단계 선택';guide.querySelector('[data-step-prev]').disabled=step===0;guide.querySelector('[data-step-next]').textContent=step===rows.length-1?'안내 종료':'다음 단계';rows[step]?.scrollIntoView?.({block:'nearest',behavior:'instant'});}
 }
 function render(detail){
  if(!detail){arrivalRequest?.abort();arrivalRequest=null;current=null;step=null;root.hidden=true;root.replaceChildren();cancelSurfaceMotion(root);return;}
  if(same(current,detail)){current=detail;updatePri();return;}
  arrivalRequest?.abort();arrivalRequest=null;current=detail;step=null;root.replaceChildren();root.hidden=false;
  const kind=detail.kind,color=kind==='bus'?busRouteColor(detail.routeType):'#b69b4d';root.style.setProperty('--tr-line-color',color);
  const name=kind==='bus'?detail.route:[...new Set(detail.lines)].map(railLabel).join(' · ');
  const header=el('div','dj-tr-heading');
  const title=el('strong','',name+' · '+labels[kind]);
  const metric=el('b','',Number.isFinite(detail.minutes)?'참고 약 '+Math.ceil(detail.minutes)+'분':'전체 시간 미확인');
  const sub=el('small','',kind==='rail'?'역 순서 개략 경로 · 배차·대기·요금 미반영':'공식 버스 노선 · 운행시간·요금 미확인');
  header.append(title,metric,sub);
  const track=el('div','dj-tr-order');track.setAttribute('aria-label','이동 순서, 시간 비율 아님');for(const name of ['도보',labels[kind],'도보'])track.append(el('span','',name));
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
    finally{win.clearTimeout(timer);if(arrivalRequest===controller)refresh.disabled=false;}
   }
  }
  const last=row('walk',detail.alight+' 하차','도보 '+detail.last.meters+'m · 약 '+detail.last.minutes+'분');
  const lastPri=el('span','dj-tr-pri');lastPri.dataset.priLeg='last';last.append(lastPri);
  row('end',detail.to,'목적지');
  const note=el('p','dj-tr-note');note.innerHTML=icon('shield')+'<span>PRI는 도보 구간의 조사 자료만 반영하며 안전을 보장하지 않습니다.</span>';
  const footer=el('div','dj-tr-footer');
  const start=button('단계별 이동안 보기','dj-tr-start',()=>{step=0;updateStep();});
  const guide=el('div','dj-tr-step-guide');guide.hidden=true;const progress=el('small','dj-tr-progress');
  const controls=el('div','dj-tr-step-controls');
  const prev=button('이전','',()=>{step=Math.max(0,step-1);updateStep();});prev.dataset.stepPrev='';
  const next=button('다음 단계','',()=>{step=step>=3?null:step+1;updateStep();});next.dataset.stepNext='';
  controls.append(prev,next);guide.append(progress,controls,el('small','','자동 GPS·하차 알림이 아닌 수동 이동 순서입니다.'));
  footer.append(start,guide);
  root.append(header,track,timeline,note,footer);updatePri();revealSurface(root);
 }
 const listener=e=>render(e.detail);win.addEventListener('dongjak:transit-detail',listener);
 return ()=>{win.removeEventListener('dongjak:transit-detail',listener);arrivalRequest?.abort();cancelSurfaceMotion(root);root.remove();};
}
