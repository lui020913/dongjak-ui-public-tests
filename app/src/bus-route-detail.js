import {classifyBusRoute,BUS_CATEGORY_LABEL} from './v8215-transit-auth-bus-sheet.js';

import {routeVehicleGroups,vehicleLabel,stopHours} from './bus-route-detail-model.mjs';

export function createBusRouteDetail({panel,onClose,onMap,onStop,onRefresh,onRetry}){
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
  const mapButton=button('지도 보기',()=>onMap());
  const refresh=button('↻',()=>state?.status==='error'?onRetry():onRefresh());refresh.setAttribute('aria-label','새로고침');
  refresh.className='dj-bus-detail-refresh';foot.append(info,mapButton,refresh);root.append(header,status,scroll,foot);host.append(root);
  let selection=null,state=null,stops=[],vehicles=[],view='route',pendingScroll=false,lastSignature='',routeScroll=0;
  function syncBounds(){if(root.hidden)return;const nav=doc.getElementById('bottom-nav')?.getBoundingClientRect?.();const height=globalThis.innerHeight||800;const dock=nav&&nav.height>0?Math.max(0,height-nav.top):72;root.style.setProperty('--dj-bus-detail-bottom',`${dock+6}px`);}
  globalThis.addEventListener?.('resize',syncBounds,{passive:true});
  if(typeof ResizeObserver==='function'){const nav=doc.getElementById('bottom-nav');if(nav)new ResizeObserver(syncBounds).observe(nav);}
  function setView(next){if(view==='route')routeScroll=scroll.scrollTop;view=next;root.dataset.view=next;lastSignature='';scroll.scrollTop=0;render();if(next==='route')scroll.scrollTop=routeScroll;}
  function vehicleRow(v){const r=make('div','dj-bus-detail-vehicle');const icon=make('span','dj-bus-detail-bus');icon.setAttribute('aria-hidden','true');r.append(icon,make('span','dj-bus-detail-vehicle-label',vehicleLabel(v)));return r;}
  function render(){
    if(root.hidden)return;
    const oldTop=scroll.scrollTop;
    const focused=doc.activeElement?.dataset?.stopSeq;
    info.setAttribute('aria-pressed',String(view==='info'));
    refresh.disabled=state?.status==='loading'||!state;mapButton.disabled=state?.status!=='shown';info.disabled=state?.status!=='shown';
    status.textContent=state?.status==='error'?'공식 노선 조회 실패 · 새로고침으로 재시도':state?.status!=='shown'?'노선 불러오는 중':state.vehicleStatus==='live'?`실시간 차량 ${vehicles.length}대` :state.vehicleStatus==='empty'?'조회된 운행 차량 없음':state.vehicleStatus==='error'?'실시간 위치 조회 실패':'실시간 위치 조회 중';
    const signature=JSON.stringify([view,state?.status,stops,view==='route'?vehicles:[]]);
    if(signature===lastSignature)return;lastSignature=signature;
    const anchor=[...list.children].find(n=>n.dataset?.stopSeq&&n.offsetTop+n.offsetHeight>oldTop);
    const anchorSeq=anchor?.dataset.stopSeq,anchorDelta=anchor?oldTop-anchor.offsetTop:0;
    list.replaceChildren();
    if(state?.status!=='shown')return;
    if(!stops.length){list.append(make('p','dj-bus-detail-message','공식 경유 정류장 정보가 없습니다.'));return;}
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
  function open(next){
    selection=next;state=null;stops=[];vehicles=[];view='route';pendingScroll=true;lastSignature='';routeScroll=0;root.dataset.view='route';
    const category=classifyBusRoute(next.route,next.routeType);kind.textContent=BUS_CATEGORY_LABEL[category];root.dataset.busCategory=category;name.textContent=next.route;
    root.hidden=false;syncBounds();render();
  }
  function update(next,nextStops,nextVehicles){
    if(!selection||next?.id!==selection.routeId)return;
    state=next;stops=nextStops;vehicles=nextVehicles;render();
  }
  function hide(){root.hidden=true;selection=null;state=null;stops=[];vehicles=[];lastSignature='';}
  return {open,update,hide,isOpen:()=>!root.hidden,getSelection:()=>selection};
}
