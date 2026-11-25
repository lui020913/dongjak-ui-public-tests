import {WINDOW_MOTION} from './mobile-window-motion.js';
import {LIVE_LINES,directionCode,directionTitle,stationKey,stationSequence,observedTrains} from './metro-live-detail-model.js';
let active=null;
export function closeMetroLiveDetail(){active?.close(false);}
export function updateMetroLiveArrivals(line,station,rows){if(active?.line===line&&stationKey(active.station)===stationKey(station))active.setArrivals(rows);}
export function openMetroLiveDetail({line,direction,station,local,arrivals=[],color,badge,transfers,endpoint='/api/transport/live-vehicles'}){
 closeMetroLiveDetail();const doc=document,win=doc.defaultView,focus=doc.activeElement;
 const make=(tag,cls,value)=>{const n=doc.createElement(tag);n.className=cls||'';if(value!==undefined)n.textContent=value;return n;};
 const button=(label,fn,cls)=>{const b=make('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;};
 const root=make('dialog','dj-metro-live');root.setAttribute('aria-label','실시간 열차 위치');root.dataset.theme=doc.getElementById('app')?.dataset.theme||'light';root.style.setProperty('--metro-live-line',color);
 const head=make('header','dj-metro-live-head'),title=make('strong','dj-metro-live-title');title.append(badge(line),make('span','',line));
 const back=button('‹',()=>close(),'dj-metro-live-back');back.setAttribute('aria-label','역 상세로 돌아가기');head.append(back,title);
 const meta=make('div','dj-metro-live-meta'),stamp=make('span','dj-metro-live-stamp','조회 중');meta.append(make('strong','','실시간 열차 위치 정보'),stamp);
 const tabs=make('div','dj-metro-live-tabs');const dirs=line==='2호선'?['내선','외선']:['상행','하행'];let dir=directionCode(direction)==='1'?dirs[1]:dirs[0];
 const list=make('div','dj-metro-live-list');list.tabIndex=0;
 const notice=make('p','dj-metro-live-notice');notice.setAttribute('role','status');
 const refresh=button('↻ 다시 조회',()=>load(),'dj-metro-live-refresh');
 const foot=make('footer','dj-metro-live-footer');foot.append(make('small','','역 상태 기반 위치 · GPS 아님'),refresh);
 root.append(head,meta,tabs,notice,list,foot);doc.body.append(root);
 let timer=null,controller=null,closed=false,closing=false,motion=null,closeTimer=null,rows=[],first=true,signature='',quota=false;
 const finish=()=>{if(closed)return;closed=true;win.clearTimeout(closeTimer);motion?.cancel();root.close();root.remove();if(active?.close===close)active=null;if(focus?.isConnected)focus.focus({preventScroll:true});};
 const close=(animate=true)=>{if(closed)return;if(closing){if(!animate)finish();return;}closing=true;win.clearTimeout(timer);controller?.abort();root.inert=true;
  const opacity=win.getComputedStyle(root).opacity;motion?.cancel();
  if(!animate||win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||!root.animate){finish();return;}
  motion=root.animate([{opacity},{opacity:0}],{duration:WINDOW_MOTION.close,easing:WINDOW_MOTION.easing,fill:'both'});motion.onfinish=finish;closeTimer=win.setTimeout(finish,WINDOW_MOTION.close+80);
 };
 active={close,line,station,setArrivals(next){arrivals=next;paint();}};root.addEventListener('cancel',e=>{e.preventDefault();close();});root.addEventListener('click',e=>{if(e.target===root)close();});
 function paint(){
  const seq=stationSequence(line,dir,station,local),trains=observedTrains(rows,line,dir),next=JSON.stringify([dir,seq,trains,arrivals]);
  if(next===signature&&!first)return;signature=next;
  const top=list.scrollTop;list.replaceChildren();
  const placed=new Set();
  for(const name of seq.stations){
   const key=stationKey(name),current=key===stationKey(station),r=make('div','dj-metro-live-row'+(current?' current':''));
   if(current)r.setAttribute('aria-current','location');
   const vehicles=trains.filter(t=>stationKey(t.station)===key);
   const left=make('div','dj-metro-live-trains'),rail=make('div','dj-metro-live-rail'),info=make('div','dj-metro-live-station'),heading=make('div','dj-metro-live-station-name');
   heading.append(make('strong','',key));for(const transfer of transfers(name).filter(l=>l!==line))heading.append(badge(transfer));info.append(heading);
   if(vehicles.length){for(const v of vehicles){placed.add(v.trainNo);const label=make('div','dj-metro-live-train-label');label.append(make('strong','',v.destination||'행선지 미제공'),make('small','',v.trainNo));left.append(label);}const icon=make('span','dj-metro-live-train-icon');icon.setAttribute('aria-label','열차');const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M6 16V6Q6 3 12 3T18 6V16Q18 19 12 19T6 16ZM6 11H18M9 16H9.1M15 16H15.1M9 19L6 22M15 19L18 22M8 21H16');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.8');path.setAttribute('stroke-linecap','round');svg.append(path);icon.append(svg);rail.append(icon);info.append(make('small','dj-metro-live-train-state',vehicles.map(v=>({'0':'진입','1':'도착','2':'출발','3':'전역 출발'})[v.status]||'상태 미제공').join(' · ')));}
   else rail.append(make('span','dj-metro-live-dot'));
   if(current){for(const a of arrivals.filter(a=>directionCode(a.directionType||a.direction)===directionCode(dir)&&!a.isPlanned).slice(0,2)){const text=make('div','dj-metro-live-eta');text.append(make('strong','',a.message||'도착정보 없음'),make('span','',a.destination||''));info.append(text);}}
   r.append(left,rail,info);list.append(r);
  }
  const unmatched=trains.filter(v=>!placed.has(v.trainNo));
  if(seq.partial||unmatched.length){const extra=make('div','dj-metro-live-extra');extra.append(make('strong','',seq.partial?'확인된 구간 노선도 · 지선/외곽 역 일부 제외':'노선도에 위치를 매칭하지 못한 열차'));for(const v of unmatched)extra.append(make('p','',v.station+' · '+(v.destination||'행선지 미제공')+' · '+v.trainNo));list.append(extra);}
  if(first){first=false;const selected=list.querySelector('[aria-current]');if(selected)list.scrollTop=Math.max(0,selected.offsetTop-list.offsetTop-list.clientHeight*.48);}
  else list.scrollTop=top;
 }
 function setDir(next){dir=next;for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.direction===dir));first=true;if(rows.length)notice.textContent=observedTrains(rows,line,dir).length?'':'현재 이 방향의 확인된 열차 위치가 없습니다.';paint();}
 for(const d of dirs){const b=button(directionTitle(line,d),()=>setDir(d),'dj-metro-live-tab');b.dataset.direction=d;tabs.append(b);}
 function schedule(){win.clearTimeout(timer);if(!closed&&!closing&&!quota)timer=win.setTimeout(load,25000);}
 async function load(){
  if(closed||closing||controller)return;win.clearTimeout(timer);
  if(!LIVE_LINES.includes(line)){notice.textContent='이 호선은 실시간 위치 API 지원 범위에 포함되지 않습니다.';stamp.textContent='위치 미제공';refresh.disabled=true;paint();return;}
  if(doc.hidden){schedule();return;}
  controller=new AbortController();refresh.disabled=true;
  try{const url=new URL(endpoint,win.location.href);url.searchParams.set('modes','metro');url.searchParams.set('line',line);
   const response=await fetch(url,{signal:controller.signal,cache:'no-store'}),body=await response.json();
   if(closed||closing)return;
   quota=Boolean(body.metroQuota)||response.status===429;
   if(!response.ok||!body.ok)throw Error(quota?'실시간 위치 API 조회 한도 초과':'실시간 위치 조회 실패');
   const next=Array.isArray(body.metro)?body.metro:[];
   const diag=body.metroDiagnostics?.[line];
   if(diag?.state==='error'&&!next.length)throw Error('해당 호선 위치정보 조회 실패');
   rows=next;const valid=observedTrains(rows,line,dir);
   notice.textContent=valid.length?'': '현재 이 방향의 확인된 열차 위치가 없습니다.';
   if(body.warnings?.includes('METRO_ARRIVAL_FALLBACK'))notice.textContent='도착정보에서 확인된 역 상태만 표시합니다.';
   stamp.textContent=body.updatedAt?new Date(body.updatedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit'}):'갱신 시각 미제공';paint();
  }catch(e){if(!closed&&!closing){rows=[];stamp.textContent='갱신 실패';notice.textContent=e.message==='실시간 위치 API 조회 한도 초과'?e.message:'실시간 위치 조회 실패 · 다시 조회할 수 있습니다.';paint();}}
  finally{controller=null;if(!closed&&!closing){refresh.disabled=quota;schedule();}}
 }
 root.showModal();if(root.animate&&!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)motion=root.animate([{opacity:0},{opacity:1}],{duration:WINDOW_MOTION.open,easing:WINDOW_MOTION.easing});setDir(dir);void load();return {close};
}
