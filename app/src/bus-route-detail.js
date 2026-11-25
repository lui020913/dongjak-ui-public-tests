import {classifyBusRoute,BUS_CATEGORY_LABEL} from './v8215-transit-auth-bus-sheet.js';

import {routeVehicleGroups,vehicleDisplay,stopHours} from './bus-route-detail-model.mjs';
import {WINDOW_MOTION} from './mobile-window-motion.js';

export function createBusRouteDetail({panel,onClose,onMap,onStop,onRefresh,onRetry,onHidden=()=>{},apiBase='/api/transport'}){
  const doc=panel.ownerDocument??globalThis.document;
  const host=doc.getElementById('app')||panel.parentElement||panel;
  const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const button=(text,action,cls='')=>{const b=make('button',cls,text);b.type='button';b.addEventListener('click',action);return b;};
  const root=make('section','dj-bus-detail');root.id='dj-bus-route-detail';root.hidden=true;root.setAttribute('aria-label','버스 노선 상세');
  const header=make('header','dj-bus-detail-head'),identity=make('div','dj-bus-detail-identity');
  const kind=make('span','dj-bus-detail-kind'),name=make('strong','dj-bus-detail-name');
  identity.append(kind,name);const close=button('×',onClose,'dj-bus-detail-close');close.setAttribute('aria-label','노선 상세 닫기');
  header.append(identity,close);
  const status=make('div','dj-bus-detail-status');status.setAttribute('role','status');
  const scroll=make('div','dj-bus-detail-scroll');scroll.tabIndex=0;
  const list=make('div','dj-bus-detail-list');scroll.append(list);
  const foot=make('footer','dj-bus-detail-actions');
  const info=button('노선정보',()=>setView(view==='info'?'route':'info'));
  const history=button('도착 이력',()=>setView(view==='history'?'route':'history'));
  const mapButton=button('지도 보기',()=>onMap());
  const refresh=button('↻',()=>state?.status==='error'?onRetry():onRefresh());refresh.setAttribute('aria-label','새로고침');
  refresh.className='dj-bus-detail-refresh';foot.append(info,history,mapButton,refresh);root.append(header,status,scroll,foot);host.append(root);
  let selection=null,state=null,stops=[],vehicles=[],view='route',pendingScroll=false,lastSignature='',routeScroll=0;
  let closeTimer=null;
  let historyRequest=null;
  const yesterday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()-86400000));
  let historyDate='',historySeq='';
  const win=doc.defaultView??globalThis;
  function cancelClosing(){
    if(closeTimer!==null)win.clearTimeout(closeTimer);
    closeTimer=null;delete root.dataset.closing;root.inert=false;root.removeAttribute('aria-hidden');
  }
  function finishClosing(){
    if(root.dataset.closing!=='true')return;
    root.hidden=true;cancelClosing();onHidden();
  }
  root.addEventListener('animationend',event=>{
    if(event.target===root&&event.animationName==='dj-bus-detail-fade-out')finishClosing();
  });
  function syncBounds(){if(root.hidden)return;const nav=doc.getElementById('bottom-nav')?.getBoundingClientRect?.();const height=globalThis.innerHeight||800;const dock=nav&&nav.height>0?Math.max(0,height-nav.top):72;root.style.setProperty('--dj-bus-detail-bottom',`${dock+6}px`);}
  globalThis.addEventListener?.('resize',syncBounds,{passive:true});
  if(typeof ResizeObserver==='function'){const nav=doc.getElementById('bottom-nav');if(nav)new ResizeObserver(syncBounds).observe(nav);}
  function setView(next){historyRequest?.abort();historyRequest=null;if(view==='route')routeScroll=scroll.scrollTop;view=next;root.dataset.view=next;lastSignature='';scroll.scrollTop=0;render();if(next==='route')scroll.scrollTop=routeScroll;}
  function vehicleRow(v){const r=make('div','dj-bus-detail-vehicle');const icon=make('span','dj-bus-detail-bus');icon.setAttribute('aria-hidden','true');const d=vehicleDisplay(v),label=make('span','dj-bus-detail-vehicle-label');label.append(make('strong','dj-bus-plate',d.number));if(d.congestion){const c=make('span','dj-bus-congestion',d.congestion);c.dataset.tone=d.tone;label.append(c);}if(d.lowFloor)label.append(make('span','dj-bus-low-floor','저상'));r.append(icon,label);return r;}
  function render(){
    if(root.hidden||root.dataset.closing==='true')return;
    const oldTop=scroll.scrollTop;
    const focused=doc.activeElement?.dataset?.stopSeq;
    info.setAttribute('aria-pressed',String(view==='info'));history.setAttribute('aria-pressed',String(view==='history'));history.disabled=state?.status!=='shown';
    refresh.disabled=state?.status==='loading'||!state;mapButton.disabled=state?.status!=='shown';info.disabled=state?.status!=='shown';
    status.textContent=state?.status==='error'?'공식 노선 조회 실패 · 새로고침으로 재시도':state?.status!=='shown'?'노선 불러오는 중':state.vehicleStatus==='live'?`실시간 차량 ${vehicles.length}대` :state.vehicleStatus==='empty'?'조회된 운행 차량 없음':state.vehicleStatus==='error'?(state.vehicleError==='BUS_POSITION_AUTH'?'실시간 위치 API 이용 권한 확인 필요':state.vehicleError==='BUS_POSITION_RATE_LIMIT'?'실시간 조회 한도 초과':state.vehicleError==='BUS_POSITION_FORMAT'?'실시간 위치 응답 확인 불가':'실시간 위치 조회 실패 · 자동 재시도'):'실시간 위치 조회 중';
    const signature=JSON.stringify([view,state?.status,stops,view==='route'?vehicles:[]]);
    if(signature===lastSignature)return;lastSignature=signature;
    const anchor=[...list.children].find(n=>n.dataset?.stopSeq&&n.offsetTop+n.offsetHeight>oldTop);
    const anchorSeq=anchor?.dataset.stopSeq,anchorDelta=anchor?oldTop-anchor.offsetTop:0;
    list.replaceChildren();
    if(state?.status!=='shown')return;
    if(!stops.length){list.append(make('p','dj-bus-detail-message','공식 경유 정류장 정보가 없습니다.'));return;}
    if(view==='history'){renderHistory();return;}
    if(view==='info'){
      for(const [k,v] of [['첫 경유 정류장',stops[0].name],['마지막 경유 정류장',stops.at(-1).name],['경유 정류장',`${stops.length}개`]]){
        const r=make('div','dj-bus-detail-info');r.append(make('span','',k),make('strong','',v));list.append(r);
      }
      return;
    }
    const {groups,unplaced}=routeVehicleGroups(stops,vehicles);
    let direction='';
    root.dataset.hasVehicles=String(vehicles.length>0);
    for(const s of stops){
      if(s.direction&&s.direction!==direction){direction=s.direction;list.append(make('div','dj-bus-detail-direction',direction.endsWith('방면')?direction:direction+' 방면'));}
      if(view==='route')for(const v of groups.get(s.seq)||[])list.append(vehicleRow(v));
      const r=button('',()=>onStop(s),'dj-bus-detail-stop');r.dataset.stopSeq=String(s.seq);
      const selected=Boolean(selection.arsId&&s.arsId===selection.arsId);
      if(selected)r.setAttribute('aria-current','location');
      const node=make('span','dj-bus-detail-node');node.setAttribute('aria-hidden','true');
      const content=make('span','dj-bus-detail-stop-content');content.append(make('strong','',s.name),make('small','',stopHours(s)));
      r.append(node,content);list.append(r);
    }
    if(view==='route'&&unplaced.length){const unknown=make('section','dj-bus-detail-unplaced');unknown.append(make('p','dj-bus-detail-message','정류장 사이 위치를 확인할 수 없는 차량'));for(const v of unplaced)unknown.append(vehicleRow(v));list.append(unknown);}
    if(pendingScroll){pendingScroll=false;const current=list.querySelector('[aria-current="location"]');scroll.scrollTop=current?Math.max(0,current.offsetTop-scroll.clientHeight*.28):0;}
    else {const same=anchorSeq&&list.querySelector(`[data-stop-seq="${Number(anchorSeq)}"]`);scroll.scrollTop=same?same.offsetTop+anchorDelta:oldTop;}
    if(focused)list.querySelector(`[data-stop-seq="${Number(focused)}"]`)?.focus({preventScroll:true});
  }
  function renderHistory(){
    historyRequest?.abort();historyRequest=null;
    const heading=make('strong','','정류장별 실제 도착 이력');
    const controls=make('div','dj-bus-history-controls');
    const stop=make('select');stop.setAttribute('aria-label','정류장');
    for(const s of stops){if(!/^\d{9,10}$/.test(String(s.stationId||'')))continue;const opt=make('option','',`${s.seq}. ${s.name}${s.direction?' · '+s.direction:''}`);opt.value=String(s.seq);stop.append(opt);}
    const chosen=stops.find(s=>s.arsId===selection.arsId);stop.value=historySeq||String(chosen?.seq||'');if(!stop.value)stop.selectedIndex=0;
    const date=make('input');date.type='date';date.max=yesterday();date.value=historyDate||date.max;date.setAttribute('aria-label','조회 날짜');
    const result=make('div','dj-bus-history-result');result.setAttribute('aria-live','polite');
    const load=async()=>{historyRequest?.abort();historySeq=stop.value;historyDate=date.value;const s=stops.find(x=>String(x.seq)===stop.value);result.replaceChildren();if(!s||!date.value||date.value>date.max){result.textContent='정류장과 과거 날짜를 선택해 주세요.';return;}const ctrl=new AbortController();historyRequest=ctrl;result.textContent='공식 도착 이력 조회 중…';const params=new URLSearchParams({routeId:selection.routeId,stationId:s.stationId,seq:String(s.seq),date:date.value.replace(/-/g,'')});
      try{const res=await fetch(apiBase+'/bus-history?'+params,{signal:ctrl.signal});const data=await res.json();if(ctrl.signal.aborted||historyRequest!==ctrl)return;result.replaceChildren();if(!res.ok){result.textContent=data.notice||'공식 이력을 확인할 수 없습니다.';return;}const rows=Array.isArray(data.arrivals)?data.arrivals:[];if(!rows.length)result.append(make('p','','제공된 도착 기록이 없습니다. 다른 날짜를 선택해 주세요.'));const groups=new Map();for(const row of rows){const k=row.date+' '+row.time.slice(0,2)+'시';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row.time.slice(3,5));}for(const [hour,minutes] of groups){const line=make('div','dj-bus-history-hour');line.append(make('strong','',hour.slice(4,6)+'/'+hour.slice(6,8)+' '+hour.slice(9)),make('span','',minutes.join(' · ')));result.append(line);}result.append(make('p','dj-bus-detail-message',data.notice||''),make('p','dj-bus-detail-message',data.source||''));}catch(e){if(!ctrl.signal.aborted&&historyRequest===ctrl)result.textContent='공식 이력 서버 연결 실패 · 다시 조회해 주세요.';}
    };
    const submit=button('조회',load,'dj-bus-history-submit');controls.append(stop,date,submit);list.append(heading,controls,make('p','dj-bus-detail-message','월 1회 갱신 · 실시간 도착예정 정보와 다릅니다.'),result);
    void load();
  }
  function open(next){
    cancelClosing();
    historyRequest?.abort();historyRequest=null;historyDate='';historySeq='';selection=next;state=null;stops=[];vehicles=[];view='route';pendingScroll=true;lastSignature='';routeScroll=0;root.dataset.view='route';
    const category=classifyBusRoute(next.route,next.routeType);kind.textContent=BUS_CATEGORY_LABEL[category];root.dataset.busCategory=category;name.textContent=next.route;
    root.hidden=false;syncBounds();render();
  }
  function update(next,nextStops,nextVehicles){
    if(!selection||next?.id!==selection.routeId)return;
    state=next;stops=nextStops;vehicles=nextVehicles;render();
  }
  function hide(){
    if(root.hidden||root.dataset.closing==='true')return;
    historyRequest?.abort();historyRequest=null;selection=null;state=null;stops=[];vehicles=[];lastSignature='';
    root.dataset.closing='true';root.inert=true;root.setAttribute('aria-hidden','true');
    if(win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||!win.matchMedia?.('(max-width:699px)')?.matches){finishClosing();return;}
    // Keep the sheet mounted while opacity falls; the map controls return only after it is hidden.
    root.style.setProperty('--dj-bus-close-duration',WINDOW_MOTION.close+'ms');
    closeTimer=win.setTimeout(finishClosing,WINDOW_MOTION.close+80);
  }
  return {open,update,hide,isOpen:()=>!root.hidden,getSelection:()=>selection};
}
