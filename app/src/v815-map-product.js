/** Non-invasive controls for search history, personal places and the route planner. */
import {openPlaceDetails} from './place-details.js';
import {recentSearchQueries,recentPlaces,savedPlaces,getPlaceFolders,createPlaceFolder,renamePlaceFolder,deletePlaceFolder,setSavedPlaceFolder,removeSavedPlace,clearRecentPlaces,recordRecentPlace,shareMapUrl,placeShareUrl,multiStopShareUrl,parseSharedPlace,parseSharedRoute} from './v815-place-store.js';
import {installFavoritesCloud} from './v824-favorites-cloud.js';
import {railTransferOptions} from './v815-route-planner.js';
const el=(tag,className,text='')=>{const e=document.createElement(tag);if(className)e.className=className;if(text)e.textContent=text;return e;};
const button=(label,onClick,className='dj815-button')=>{const b=el('button',className,label);b.type='button';b.addEventListener('click',onClick);return b;};
export function installMapProduct({map,maplibregl,navigate,getRoutePoints,onWaypointSearch,onWaypointPick,onWaypointsChange,onTransitPreview}={}){
  if(typeof document==='undefined')return null;
  const quick=document.getElementById('map-quick-search'),mine=document.getElementById('mine-panel');
  const route=document.getElementById('route-panel'),routeCard=route?.querySelector('.route-card');
  if(!quick||!routeCard)return null;
  const searchInput=document.getElementById('map-quick-search-query');
  let items=[],transitSeq=0,draggedWaypointIndex=null;
  // Map searches and facility clicks use the same fact-first details popup.
  const onPicked=(ev)=>{
    const place=ev.detail?.place;
    if(!place)return;
    recordRecentPlace(place);
    openPlaceDetails({map,maplibregl,place:{...place,type:place.category||'장소'}});
    renderStored();
  };
  window.addEventListener('dongjak:map-place-selected',onPicked);
  const myBox=el('section','dj815-my-places');myBox.id='dj815-my-places';
  // Sign-in must appear at the TOP of My Records, not beneath long saved-place lists.
  const accountSlot=el('div','dj824-account-slot');myBox.append(accountSlot);
  installFavoritesCloud({root:accountSlot});
  myBox.append(el('h3','', '저장한 장소 · 대중교통'));
  const myIntro=el('p','dj815-helper','로그인 전에는 이 기기에 저장됩니다. 이메일 로그인 후에는 서버와 동기화할 수 있습니다.');
  myBox.append(myIntro);
  const groupBar=el('div','dj824-group-toolbar');
  const groupInput=el('input','dj824-group-input');groupInput.type='text';groupInput.maxLength=32;
  groupInput.placeholder='새 그룹 이름';groupInput.setAttribute('aria-label','새 즐겨찾기 그룹 이름');
  const groupAdd=button('+ 그룹 만들기',()=>{
    const added=createPlaceFolder(groupInput.value);
    groupStatus.textContent=added?`‘${added}’ 그룹을 만들었습니다.`:'이미 있는 이름이거나 사용할 수 없는 이름입니다.';
    if(added)groupInput.value='';
  },'dj824-group-add');
  groupInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();groupAdd.click();}});
  groupBar.append(groupInput,groupAdd);
  const groupStatus=el('p','dj815-helper');groupStatus.setAttribute('role','status');
  myBox.append(groupBar,groupStatus);
  const storedList=el('div','dj815-stored-list');myBox.append(storedList);
  // The rebuilt sheet owns a fixed chrome and a separately scrolling body.
  // Inserting after the chrome made this card an immovable flex sibling that
  // escaped the panel's horizontal inset and could cover the footer.
  const mineBody=mine?.querySelector(':scope > .dj836-sheet-body')||mine;
  mineBody?.appendChild(myBox);
  const recentBox=el('section','dj815-recent');
  const recentHead=el('div','dj815-inline-row');recentHead.append(el('strong','', '최근 선택한 장소'));
  recentHead.append(button('기록 삭제',()=>{clearRecentPlaces();renderStored();},'dj815-link-button'));
  recentBox.append(recentHead);
  const recentList=el('div','dj815-recent-list');recentBox.append(recentList);
  const dropdown=document.getElementById('map-quick-search-dropdown');
  const originalList=document.getElementById('map-quick-search-results');
  if(dropdown&&originalList)originalList.after(recentBox);
  function openStored(place){
    navigate?.('map');
    if(['bus','subway'].includes(place.kind)){
      // The transport module owns its live data, timetable and route panels.
      window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place}}));
    }else{
      map.flyTo?.({center:[place.lng,place.lat],zoom:16,duration:420});
      openPlaceDetails({map,maplibregl,place});
    }
    searchInput?.blur();
    if(dropdown)dropdown.hidden=true;
    delete document.getElementById('app')?.dataset.searchOpen;
  }
  function renderStored(){
    storedList.replaceChildren();recentList.replaceChildren();
    const saved=savedPlaces(),folders=getPlaceFolders();
    if(!saved.length)storedList.append(el('p','dj815-helper','저장된 장소가 없습니다. 시설이나 버스정류장·지하철역의 ☆ 버튼을 눌러 추가하세요.'));
    for(const folder of folders){
      const grouped=saved.filter(item=>item.folder===folder);
      // Keep custom groups visible even before a place is added.
      if(!grouped.length&&['즐겨찾기','집','학교','직장','기타'].includes(folder))continue;
      const head=el('div','dj824-folder-heading');
      head.append(el('h4','dj815-folder-title',`${folder} · ${grouped.length}`));
      if(!['즐겨찾기','집','학교','직장','기타'].includes(folder)){
        head.append(button('이름 변경',()=>{
          const next=window.prompt('그룹 이름 변경',folder);
          if(next===null)return;
          groupStatus.textContent=renamePlaceFolder(folder,next)?'그룹 이름을 변경했습니다.':'변경할 수 없는 그룹 이름입니다.';
        },'dj815-link-button'));
        head.append(button('그룹 삭제',()=>{
          if(!window.confirm(`‘${folder}’ 그룹을 삭제할까요? 저장된 장소는 기본 즐겨찾기로 이동합니다.`))return;
          groupStatus.textContent=deletePlaceFolder(folder)?'그룹을 삭제하고 장소를 기본 즐겨찾기로 이동했습니다.':'그룹을 삭제하지 못했습니다.';
        },'dj815-link-button'));
      }
      storedList.append(head);
      for(const place of grouped){
        const row=el('div','dj815-saved-row dj824-saved-row');
        const kind=place.kind==='bus'?'버스':place.kind==='subway'?'지하철':'장소';
        const name=button(`${kind} · ${place.name}`,()=>openStored(place));name.title=place.address||place.name;
        const actions=el('div','dj824-row-actions');
        const select=el('select','dj824-folder-select');select.setAttribute('aria-label',`${place.name} 저장 그룹`);
        for(const group of folders){const option=el('option','',group);option.value=group;select.append(option);}
        select.value=folder;select.addEventListener('change',()=>setSavedPlaceFolder(place,select.value));
        actions.append(select);
        actions.append(button('공유',()=>shareMapUrl(placeShareUrl(place)),'dj815-link-button'));
        actions.append(button('삭제',()=>removeSavedPlace(place),'dj815-link-button'));
        row.append(name,actions);storedList.append(row);
      }
    }
    const recent=recentPlaces();recentBox.hidden=!recent.length&&!recentSearchQueries().length;
    if(!recent.length)recentList.append(el('span','dj815-helper','최근 선택한 장소 없음'));
    for(const place of recent)recentList.append(button(place.name,()=>openStored(place),'dj815-chip'));
  }
  window.addEventListener('dongjak:saved-places-change',renderStored);
  window.addEventListener('dongjak:recent-places-change',renderStored);
  renderStored();
  // Share deep links only point at explicit user-selected places, never GPS history.
  const shared=parseSharedPlace(window.location.href);
  if(shared){
    const fly=()=>{map.flyTo?.({center:[shared.lng,shared.lat],zoom:16,duration:600});openPlaceDetails({map,maplibregl,place:shared});};
    if(map.loaded?.())setTimeout(fly,100);else map.once?.('load',fly);
  }
  const waySection=el('section','dj815-route-section dj832-waypoint-panel');waySection.id='dj815-waypoints';
  const toggleWay=button('＋ 경유지 추가',()=>{
    const open=wayDetails.hidden;
    wayDetails.hidden=!open;
    toggleWay.setAttribute('aria-expanded',String(open));
    toggleWay.textContent=open?'− 경유지 접기':'＋ 경유지 추가';
  },'dj832-waypoint-toggle');
  toggleWay.setAttribute('aria-controls','dj832-waypoint-details');toggleWay.setAttribute('aria-expanded','false');
  waySection.append(toggleWay);
  const wayDetails=el('div','dj832-waypoint-details');wayDetails.id='dj832-waypoint-details';wayDetails.hidden=true;
  const head=el('div','dj815-inline-row');head.append(el('strong','', '경유지 · 최대 5곳'));
  const addActions=el('div','dj815-actions');
  addActions.append(button('＋ 경유지 검색',()=>onWaypointSearch?.()),button('＋ 지도에서 선택',()=>onWaypointPick?.()));
  head.append(addActions);wayDetails.append(head);
  const wayList=el('div','dj815-waypoint-list');wayDetails.append(wayList);
  const wayHint=el('p','dj815-helper','경유지는 순서대로 방문합니다. ↑↓ 버튼으로 순서를 변경할 수 있습니다.');wayDetails.append(wayHint);
  waySection.append(wayDetails);
  // Show waypoint and rail choices before the pedestrian route calculation.
  const calcBtn=document.getElementById('route-calc');calcBtn?.before(waySection);
  const transit=el('details','dj815-route-section');transit.id='dj815-rail-planner';
  transit.append(el('summary','', '도보 + 지하철 이동안 · 펼쳐보기'));
  transit.append(el('p','dj815-helper','확인된 역사 위치와 노선 순서를 기반으로 탐색합니다. 지하철 운행 시간·배차·실시간 환승 시간은 포함되지 않습니다. 버스 환승 경로는 데이터가 확보될 때까지 계산하지 않습니다.'));
  const findRail=button('지하철 연계 이동안 찾기',renderTransit);
  transit.append(findRail);
  const transitStatus=el('p','dj815-helper');transitStatus.setAttribute('role','status');transitStatus.setAttribute('aria-live','polite');transit.append(transitStatus);
  const transitList=el('div','dj815-transit-list');transit.append(transitList);
  calcBtn?.before(transit);
  const shareSection=el('div','dj815-route-share');
  shareSection.append(button('현재 장소·경유지 공유',()=>{
    const points=getRoutePoints?.()||[];
    const url=multiStopShareUrl(points);
    if(url)void shareMapUrl(url,'동작지도 경로 공유');else transitStatus.textContent='출발지와 목적지를 지정한 뒤 공유해 주세요.';
  }));
  calcBtn?.before(shareSection);
  function applyWaypoints(list){
    if(list.length>5)return;
    items=list.map(p=>({name:String(p.name||p.label||'경유지').slice(0,90),lng:Number(p.lng),lat:Number(p.lat)}));
    renderWaypoints();if(items.length){wayDetails.hidden=false;toggleWay.setAttribute('aria-expanded','true');toggleWay.textContent='− 경유지 접기';}onWaypointsChange?.(items);
  }
  function renderWaypoints(){
    wayList.replaceChildren();
    if(!items.length)wayList.append(el('div','dj815-helper','추가한 경유지가 없습니다.'));
    items.forEach((p,i)=>{
      const row=el('div','dj815-waypoint-row');row.draggable=true;
      row.addEventListener('dragstart',event=>{draggedWaypointIndex=i;if(event.dataTransfer)event.dataTransfer.effectAllowed='move';});
      row.addEventListener('dragover',event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';});
      row.addEventListener('drop',event=>{
        event.preventDefault();const from=draggedWaypointIndex;draggedWaypointIndex=null;
        if(!Number.isInteger(from)||from===i||from<0||from>=items.length)return;
        const next=items.slice(),[moved]=next.splice(from,1);next.splice(i,0,moved);applyWaypoints(next);
      });
      row.addEventListener('dragend',()=>{draggedWaypointIndex=null;});
      row.append(el('span','dj815-waypoint-number',String(i+1)));
      row.append(el('strong','dj815-waypoint-title',p.name));
      const acts=el('div','dj815-actions');
      const up=button('↑',()=>{if(i>0){[items[i-1],items[i]]=[items[i],items[i-1]];applyWaypoints(items);}},'dj815-icon-button');up.title='앞으로 이동';up.disabled=!i;
      const down=button('↓',()=>{if(i<items.length-1){[items[i+1],items[i]]=[items[i],items[i+1]];applyWaypoints(items);}},'dj815-icon-button');down.title='뒤로 이동';down.disabled=i===items.length-1;
      const del=button('삭제',()=>applyWaypoints(items.filter((_,j)=>j!==i)),'dj815-link-button');
      acts.append(up,down,del);row.append(acts);wayList.append(row);
    });
    addActions.querySelectorAll('button').forEach(b=>b.disabled=items.length>=5);
  }
  function setWaypoints(next){items=next.slice(0,5);renderWaypoints();if(items.length){wayDetails.hidden=false;toggleWay.setAttribute('aria-expanded','true');toggleWay.textContent='− 경유지 접기';}}
  async function renderTransit(){
    const points=getRoutePoints?.()||[];
    if(points.length<2){transitStatus.textContent='출발지와 목적지를 먼저 지정하세요.';return;}
    if(points.length>2){transitStatus.textContent='지하철 연계 이동안은 경유지 없는 두 지점 간에만 지원합니다.';return;}
    transitSeq++;const seq=transitSeq;
    transitList.replaceChildren();transitStatus.textContent='출발지와 목적지 주변 역을 검토하는 중입니다…';
    const options=railTransferOptions(points[0],points.at(-1),{limit:3});
    if(seq!==transitSeq)return;
    if(!options.length){transitStatus.textContent='두 지점 모두 1.4km 이내 연결 가능한 역을 찾지 못했습니다. 도보 경로를 이용하세요.';return;}
    transitStatus.textContent=`${options.length}개 역 연결 후보 · 시간은 실제 소요시간이 아닌 참고 계산입니다.`;
    for(const opt of options){
      const card=el('article','dj815-transit-card');
      card.append(el('strong','', `${opt.origin.name}역 → ${opt.destination.name}역`));
      card.append(el('span','', `${opt.railStops}개 역 · 환승 ${opt.changes}회 · 참고 약 ${Math.ceil(opt.indicativeMinutes)}분`));
      card.append(el('small','', `역 접근 직선거리 합계 약 ${Math.round(opt.walkingStraightM)}m · 역 입구·실제 보행 동선·운행시간 미반영`));
      const path=el('div','dj815-stop-list');
      opt.stops.forEach((s,i)=>path.append(el('span','', `${s}${i<opt.lines.length?` (${opt.lines[i]}호선)`:''}`)));
      card.append(path);
      card.append(button('지도에서 이동안 확인',()=>{transitStatus.textContent='보행 연결 구간을 계산하고 있습니다…';
        void Promise.resolve(onTransitPreview?.(opt)).then(()=>{transitStatus.textContent='지도에 보행 구간과 지하철역 순서의 개략 연결을 표시했습니다. 실제 열차 경로와 다를 수 있습니다.';})
          .catch(error=>{transitStatus.textContent=`보행 연결 검증 실패: ${error.message||'경로를 찾지 못했습니다.'}`;});}));
      transitList.append(card);
    }
  }
  const sharedRoute=parseSharedRoute(window.location.href);
  if(sharedRoute){
    const [start,...others]=sharedRoute;const end=others.pop();
    const fill=()=>{
      window.dispatchEvent(new CustomEvent('dongjak:route-select',{detail:{which:'start',place:start}}));
      window.dispatchEvent(new CustomEvent('dongjak:route-select',{detail:{which:'end',place:end}}));
      if(others.length)applyWaypoints(others);navigate?.('route');
    };
    setTimeout(fill,400);
  }
  return {setWaypoints,renderStored};
}
