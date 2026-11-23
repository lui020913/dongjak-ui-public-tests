/**
 * Pedestrian information utilities. Data is descriptive, not a route safety certification.
 * This module does not store GPS coordinates or send user locations to a server.
 */
import {queryOverpass} from './safety-layers.js';
import {fixedMetroStations} from './fixed-rail-lines.js';
import {DONGJAK_UNIVERSITIES} from './education-layer.js';
import {bindHeaderDragInput} from './mobile-header-input.js';
import {setMobileSheetExpanded,measuredPhoneDockClearance} from './v889-mobile-sheet-motion.js';

const EMPTY={type:'FeatureCollection',features:[]};
const RADIUS_M=850;
const LIMIT=3;
const getCoords=p=>p?.geometry?.type==='Point'?p.geometry.coordinates:null;
const finiteCoord=v=>Array.isArray(v)&&v.length>=2&&v.slice(0,2).every(Number.isFinite);
const safeString=x=>String(x??'').trim().slice(0,100);

export function distanceMeters(a,b){
  if(!finiteCoord(a)||!finiteCoord(b))return Infinity;
  const toRad=Math.PI/180;
  const [lng1,lat1]=a.map(Number),[lng2,lat2]=b.map(Number);
  const dLat=(lat2-lat1)*toRad,dLon=(lng2-lng1)*toRad;
  const h=Math.sin(dLat/2)**2+Math.cos(lat1*toRad)*Math.cos(lat2*toRad)*Math.sin(dLon/2)**2;
  return 12742000*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}

export function classifyAccessFeature(tags={}){
  const road=String(tags.highway||'').toLowerCase();
  const kerb=String(tags.kerb||'').toLowerCase();
  const wheelchair=String(tags.wheelchair||'').toLowerCase();
  if(road==='elevator')return {kind:'lift',title:'승강기',detail:'지도에 등록된 승강설비',risk:'info'};
  if(String(tags.conveying||'').toLowerCase()==='yes')return {kind:'escalator',title:'에스컬레이터',detail:'지도에 등록된 에스컬레이터',risk:'info'};
  if(road==='steps')return {kind:'steps',title:'계단',detail:'계단 구간 · 교통약자 통행 주의',risk:'caution'};
  if(kerb==='raised'||kerb==='high')return {kind:'kerb',title:'턱 높음',detail:'높은 연석으로 등록된 위치',risk:'caution'};
  if(['lowered','flush','rolled'].includes(kerb))return {kind:'kerb',title:'연석 낮음',detail:'낮거나 평탄한 연석으로 등록된 위치',risk:'possible'};
  if(road==='crossing'&&wheelchair==='yes')return {kind:'crossing',title:'접근성 표기 횡단',detail:'휠체어 이용 가능으로 등록된 횡단 지점',risk:'possible'};
  if(road==='crossing'||kerb)return {kind:'crossing',title:'횡단/연석 정보',detail:'접근성 상태 미확인 · 현장 확인 필요',risk:'unknown'};
  return null;
}

export function normalizedAccessFeatures(elements=[],within=()=>true){
  const features=[],used=new Set();
  for(const element of elements){
    const c=element.center||element;
    const lng=Number(c.lon),lat=Number(c.lat);
    if(!Number.isFinite(lng)||!Number.isFinite(lat)||within(lng,lat)!==true)continue;
    const detail=classifyAccessFeature(element.tags||{});
    if(!detail)continue;
    const id=String(element.type||'node')+':'+String(element.id||`${lng}:${lat}`);
    if(used.has(id))continue;
    used.add(id);
    features.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{
      id,kind:detail.kind,risk:detail.risk,title:detail.title,detail:detail.detail,
      name:safeString(element.tags?.['name:ko']||element.tags?.name||detail.title)
    }});
  }
  return {type:'FeatureCollection',features};
}

export function nearbyResults(center,candidates=[],radius=RADIUS_M,limit=LIMIT){
  if(!finiteCoord(center))return [];
  const seen=new Set();
  return candidates.flatMap(c=>{
    const coords=Array.isArray(c.coordinates)?c.coordinates:[c.lng,c.lat];
    const distance=distanceMeters(center,coords);
    if(!Number.isFinite(distance)||distance>radius||distance<0)return [];
    const category=safeString(c.category||'기타'),name=safeString(c.name);
    if(!name)return [];
    const key=`${category}:${name}:${coords.map(x=>Number(x).toFixed(4)).join(',')}`;
    if(seen.has(key))return [];
    seen.add(key);
    return [{category,name,coordinates:coords,distance:Math.round(distance),source:safeString(c.source),detail:safeString(c.detail)}];
  }).sort((a,b)=>a.distance-b.distance).reduce((out,item)=>{
    if(out.filter(c=>c.category===item.category).length<limit)out.push(item);
    return out;
  },[]);
}

function candidatesFromSource(map,id,category,defaultName){
  try{
    const data=map.querySourceFeatures(id)||[];
    return data.flatMap(feature=>{
      const coords=getCoords(feature);
      if(!finiteCoord(coords))return [];
      const p=feature.properties||{};
      const rawName=safeString(p.name||p.label||p.stationName||p.title||defaultName);
      const station=id==='metro-accessibility-local'?safeString(p.station||p.stationName||''):'';
      const name=station&&!rawName.includes(station)?`${station.replace(/역$/,'')}역 ${rawName}`:rawName;
      if(!name||name==='이름 미등록')return [];
      const group=id==='dongjak-public-places' ? (p.kind==='school'?'학교':p.kind==='park'?'공원':'공공시설') : category;
      return [{category:group,name,coordinates:coords,detail:safeString(p.number?`${p.number}번 출구`:p.address||p.description||''),source:'현재 지도에 로드된 자료'}];
    });
  }catch{return [];}
}

function nearbyCandidates(map){
  const defaults=[
    ...fixedMetroStations().map(p=>({category:'지하철',name:`${String(p.name||'').replace(/역$/,'')}역`,coordinates:[p.lng,p.lat],source:'역 위치 참조자료'})),
    ...DONGJAK_UNIVERSITIES.map(p=>({category:'학교',name:p.name,coordinates:[p.lng,p.lat],source:'교육시설 등록 위치'}))
  ];
  return [...defaults,
    ...candidatesFromSource(map,'transport-bus','버스정류장','정류장명 미등록'),
    ...candidatesFromSource(map,'metro-accessibility-local','교통약자 시설','교통약자 시설'),
    ...candidatesFromSource(map,'dongjak-crosswalks','횡단보도','횡단보도'),
    ...candidatesFromSource(map,'dongjak-safety-places','안전시설','안전시설'),
    ...candidatesFromSource(map,'dongjak-public-places','공공시설','공공시설')];
}

/** Counts only facilities actually returned by loaded GIS sources; unknown is not zero. */
export function summarizePedestrianAccess(osmFeatures=[],metroFeatures=[]){
  const seen=new Set();
  const locations=[];
  const counts={elevators:0,exits:0,barriers:0};
  for(const [source,list] of [['public',osmFeatures],['station',metroFeatures]]){
    for(const feature of list||[]){
      const coords=feature?.geometry?.coordinates;
      if(!finiteCoord(coords))continue;
      const properties=feature.properties||{};
      const kind=String(properties.kind||properties.type||'').toLowerCase();
      const group=['elevator','lift','escalator'].includes(kind)?'elevators'
        :kind==='exit'?'exits'
        :['steps','stairs','kerb','crossing'].includes(kind)?'barriers':null;
      if(!group)continue;
      const key=`${group}:${Number(coords[0]).toFixed(5)}:${Number(coords[1]).toFixed(5)}`;
      if(seen.has(key))continue;
      seen.add(key);
      counts[group]++;
      const fallback=group==='elevators'?'승강설비':group==='exits'?'역 출입구':'보행시설';
      locations.push({
        name:safeString(properties.name||properties.title||properties.station||fallback),
        type:kind,coordinates:[Number(coords[0]),Number(coords[1])],source
      });
    }
  }
  return {...counts,total:locations.length,locations};
}

function el(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
}

function popupForAccess(feature){
  const wrap=el('div','ped-access-popup');
  wrap.append(el('strong','',feature.properties.name),el('p','',feature.properties.detail),
    el('small','','OpenStreetMap 등록 정보 · 실제 시설 상태는 현장에서 확인하세요.'));
  return wrap;
}

/** Keep the map-options toggle below the actual desktop nav, not a hardcoded y position.
 * The nav can grow with font size/zoom, so recalculate after resize/font loads.
 * Map options and pedestrian result panels are mutually exclusive overlays.
 */
export function installPedestrianControlPlacement({app,nav,panel}){
  if(!app||!nav||!panel)return ()=>{};
  let frame=0,disposed=false,lastTop='';
  const update=()=>{
    frame=0;
    if(disposed)return;
    const desktop=window.innerWidth>=1080;
    const rect=nav.getBoundingClientRect();
    const top=desktop && rect.height>0?`${Math.ceil(rect.bottom+12)}px`:'';
    // Measure the *rendered* phone dock, rather than adding a fixed 95px.
    // iOS safe-area and bottom-nav heights differ between standalone modes.
    if(!desktop&&rect.height>0&&rect.width>0&&!nav.hidden){
      const clearance=measuredPhoneDockClearance(rect,window,{minimum:0,gap:8});
      const wanted=clearance+'px';
      if(panel.style.getPropertyValue('--dj-nearby-dock-clearance')!==wanted)
        panel.style.setProperty('--dj-nearby-dock-clearance',wanted);
    }else panel.style.removeProperty('--dj-nearby-dock-clearance');
    if(desktop && rect.width>0){
      app.style.setProperty('--dj-rail-btn-w',`${Math.round(rect.width)}px`);
      app.style.setProperty('--dj-rail-left',`${Math.round(rect.left)}px`);
    } else {
      app.style.removeProperty('--dj-rail-btn-w');app.style.removeProperty('--dj-rail-left');
    }
    if(top!==lastTop){
      if(top)app.style.setProperty('--dj-controls-under-nav',top);
      else app.style.removeProperty('--dj-controls-under-nav');
      lastTop=top;
    }
    app.classList.toggle('ped-info-open',!panel.hidden);
  };
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(update);};
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
  resizeObserver?.observe(nav);
  const observer=new MutationObserver(schedule);
  observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
  observer.observe(nav,{attributes:true,attributeFilter:['hidden','class','style']});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  window.visualViewport?.addEventListener?.('resize',schedule,{passive:true});
  document.fonts?.ready?.then(schedule).catch(()=>{});
  update();
  return ()=>{
    disposed=true;if(frame)cancelAnimationFrame(frame);
    resizeObserver?.disconnect();observer.disconnect();
    window.removeEventListener('resize',schedule);
    window.removeEventListener('orientationchange',schedule);
    window.visualViewport?.removeEventListener?.('resize',schedule);
    app.classList.remove('ped-info-open');
    app.style.removeProperty('--dj-controls-under-nav');
    app.style.removeProperty('--dj-rail-btn-w');app.style.removeProperty('--dj-rail-left');
    panel.style.removeProperty('--dj-nearby-dock-clearance');
  };
}

export function initPedestrianTools({map,maplibregl,isDongjak,requestPosition,onReport,onToast=()=>{},onShowMap=()=>{}}){
  const accessButton=document.getElementById('ped-access-toggle');
  const nearButton=document.getElementById('ped-nearby-open');
  const reportButton=document.getElementById('ped-report-open');
  const panel=document.getElementById('ped-tools-panel');
  const header=document.getElementById('ped-tools-heading');
  const status=document.getElementById('ped-tools-status');
  const results=document.getElementById('ped-tools-results');
  const overview=document.getElementById('overview-sheet');
  const close=document.getElementById('ped-tools-close');
  const width=document.getElementById('ped-tools-width');
  if(!accessButton||!nearButton||!reportButton||!panel||!header||!status||!results)return ()=>{};
  const app=document.getElementById('app');
  const mapToolsToggle=document.getElementById('map-tools-toggle');
  const disposePlacement=installPedestrianControlPlacement({
    app,nav:document.getElementById('bottom-nav'),panel
  });
  let active=false,loaded=false,loading=null,seq=0;
  const source='ped-access-osm';
  const layers=['ped-access-halo','ped-access-points','ped-access-symbols'];
  let ready=false;
  const addLayers=()=>{
    if(ready||!map.getStyle?.())return;
    try{
      map.addSource(source,{type:'geojson',data:EMPTY});
      map.addLayer({id:layers[0],type:'circle',source,minzoom:15.2,
        paint:{'circle-radius':['interpolate',['linear'],['zoom'],15.2,9,18,14],
          'circle-color':'#ffffff','circle-opacity':.95,'circle-stroke-width':1.5,'circle-stroke-color':'#226a5b'}});
      map.addLayer({id:layers[1],type:'circle',source,minzoom:15.2,
        paint:{'circle-radius':['interpolate',['linear'],['zoom'],15.2,7.5,18,12],
          'circle-color':['match',['get','risk'],'caution','#b14e41','possible','#287e66','info','#22698e','#777b85'],
          'circle-stroke-width':1.5,'circle-stroke-color':'#fff'}});
      map.addLayer({id:layers[2],type:'symbol',source,minzoom:15.2,
        layout:{'text-field':['match',['get','kind'],'lift','↕','escalator','↗','steps','≋','kerb','▔','crossing','＋','•'],
          'text-size':['interpolate',['linear'],['zoom'],15.2,11,18,15],
          'text-font':['Open Sans Semibold','Open Sans Regular'],'text-allow-overlap':false},
        paint:{'text-color':'#ffffff','text-halo-color':'rgba(0,0,0,.1)','text-halo-width':.4}});
      for(const id of layers){
        map.setLayoutProperty(id,'visibility','none');
        map.on('click',id,event=>{
          const f=event.features?.[0];if(!f)return;
          event.originalEvent?.stopPropagation();
          new maplibregl.Popup({offset:12,maxWidth:'260px'}).setLngLat(event.lngLat)
            .setDOMContent(popupForAccess(f)).addTo(map);
        });
      }
      ready=true;
    }catch(error){console.warn('[보행접근성 레이어]',error);status.textContent='지도 레이어를 초기화하지 못했습니다.';}
  };
  if(map.loaded?.())addLayers();else map.once('load',addLayers);
  let nearbyMarker=null;
  const clearNearbyMarker=()=>{nearbyMarker?.remove();nearbyMarker=null;};
  const resetNearby=()=>{clearNearbyMarker();delete panel.dataset.nearbyMode;status.hidden=false;};
  const hiddenObserver=new MutationObserver(()=>{
    if(!panel.hidden)return;
    resetNearby();
    // Hiding is not a drag settle. Drop old expanded geometry so the next
    // open starts compact rather than inheriting a previous inline top.
    panel.classList.remove('dj871-sheet-expanded');
    for(const property of ['top','height','max-height','bottom','translate','transform','clip-path'])
      panel.style.removeProperty(property);
    delete panel.dataset.djSafeExpandedTop;
  });
  hiddenObserver.observe(panel,{attributes:true,attributeFilter:['hidden']});
  // One owner for nearby-header gestures. The global floating-sheet controller
  // intentionally excludes this sheet; two controllers were competing to set
  // translate and drawing the expanded sheet above the global search field.
  const nearbyHeader=panel.querySelector('.ped-tools-panel-head');
  let nearbySwipe=null,nearbyRetry=0;
  // Recognize the upward gesture before pointerup. On iOS WebKit a MapLibre
  // overlay may interrupt the final pointerup during a compositor transition.
  // Keeping the threshold independent of that last event prevents a compact
  // nearby card from becoming impossible to expand.
  const commitNearbyExpand=()=>{
    nearbyRetry=0;
    if(!panel.hidden&&!panel.classList.contains('dj871-sheet-expanded'))
      setMobileSheetExpanded(panel,true,document,window);
  };
  const checkNearbyUpward=event=>{
    const s=nearbySwipe;
    if(!s||s.pointerId!==event.pointerId||s.committed||s.wasExpanded)return;
    const dx=event.clientX-s.x,dy=event.clientY-s.y;
    if(dy>=-52||Math.abs(dx)>Math.abs(dy)*.8)return;
    s.committed=true;
    if(nearbyRetry)window.cancelAnimationFrame?.(nearbyRetry);
    nearbyRetry=window.requestAnimationFrame?.(commitNearbyExpand)||0;
    if(!nearbyRetry)commitNearbyExpand();
  };
  // Start capture at document level only for the measured *visible* header.
  // A late map compositor overlay can intercept the target, but the bounding
  // guard prevents hijacking taps elsewhere on the map or on X/actions.
  const disposeNearbySwipe=nearbyHeader?bindHeaderDragInput(document,window,{
    down(event){
      if(panel.hidden||!window.matchMedia('(max-width:1079px)').matches||
          event.isPrimary===false||event.target?.closest?.('button,a,input,textarea,select,label,[role="button"]'))return false;
      const rect=nearbyHeader.getBoundingClientRect();
      if(rect.width<36||rect.height<24||
         event.clientX<rect.left+4||event.clientX>rect.right-4||
         event.clientY<rect.top+4||event.clientY>rect.bottom-4)return false;
      nearbySwipe={pointerId:event.pointerId,x:event.clientX,y:event.clientY,
        wasExpanded:panel.classList.contains('dj871-sheet-expanded'),committed:false};
      return true;
    },
    move(event){
      checkNearbyUpward(event);
      const s=nearbySwipe;
      if(!s||s.pointerId!==event.pointerId||s.committed||!s.wasExpanded)return;
      const dx=event.clientX-s.x,dy=event.clientY-s.y;
      if(dy>52&&Math.abs(dx)<Math.abs(dy)*.8){
        s.committed=true;
        setMobileSheetExpanded(panel,false,document,window);
      }
    },
    up(event){
      checkNearbyUpward(event);
      const s=nearbySwipe;nearbySwipe=null;
      if(!s||s.pointerId!==event.pointerId||s.committed)return;
      const dx=event.clientX-s.x,dy=event.clientY-s.y;
      if(Math.abs(dx)>Math.abs(dy)*.8&&Math.abs(dx)>12)return;
      if(s.wasExpanded){
        if(dy>28)setMobileSheetExpanded(panel,false,document,window);
      }else if(dy>105){
        panel.querySelector('#ped-tools-close')?.click();
      }else if(dy<-35||Math.abs(dy)<8){
        if(nearbyRetry)window.cancelAnimationFrame?.(nearbyRetry);
        nearbyRetry=window.requestAnimationFrame?.(commitNearbyExpand)||0;
        if(!nearbyRetry)commitNearbyExpand();
      }
    },
    cancel(){nearbySwipe=null;}
  }):()=>{};

  // A mobile Safari web view and Playwright's mobile-mouse emulation may
  // dispatch mouseup after pointer capture has been moved to the map canvas.
  // Detect an upward drag from the *visible header geometry* at capture phase.
  // The common sheet controller still owns the only layout/animation change;
  // this fallback runs only if that owner did not already expand the card.
  let nearbyMouseStart=null,nearbyMouseCommit=0;
  const onNearbyMouseDown=event=>{
    if(!nearbyHeader||panel.hidden||event.button!==0||
       !window.matchMedia('(max-width:699px)').matches)return;
    if(event.target?.closest?.('button,a,input,textarea,select,label,[role="button"]'))return;
    const rect=nearbyHeader.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||
       event.clientY<rect.top||event.clientY>rect.bottom)return;
    nearbyMouseStart={x:event.clientX,y:event.clientY};
  };
  const onNearbyMouseUp=event=>{
    const start=nearbyMouseStart;nearbyMouseStart=null;
    if(!start||panel.hidden)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(dy>-42||Math.abs(dx)>Math.abs(dy)*.8)return;
    if(nearbyMouseCommit)window.clearTimeout(nearbyMouseCommit);
    nearbyMouseCommit=window.setTimeout(()=>{
      nearbyMouseCommit=0;
      if(!panel.hidden&&!panel.classList.contains('dj871-sheet-expanded'))
        setMobileSheetExpanded(panel,true,document,window);
    },0);
  };
  document.addEventListener('mousedown',onNearbyMouseDown,true);
  window.addEventListener('mouseup',onNearbyMouseUp,true);

  const showPanel=title=>{
    resetNearby();
    window.DongjakWindowLifecycle?.requestOpen(panel.id);
    header.textContent=title;panel.hidden=false;
    // The map options menu must not overlap this utility panel.
    const app=document.getElementById('app');app?.classList.remove('map-controls-open');
    app?.classList.remove('map-safety-open');
    const safetyToggle=document.getElementById('map-safety-toggle');
    if(safetyToggle){safetyToggle.setAttribute('aria-expanded','false');safetyToggle.textContent='보행안전';}
    document.getElementById('map-tools-toggle')?.setAttribute('aria-expanded','false');
    onShowMap();
    if(overview && !overview.hidden){overview.dataset.pedToolsHidden='true';overview.hidden=true;}
    const toggle=document.getElementById('map-tools-toggle');
    if(toggle)toggle.textContent='지도 옵션';
  };
  const restoreOverview=()=>{
    if(overview?.dataset.pedToolsHidden==='true'){
      delete overview.dataset.pedToolsHidden;
      if(document.getElementById('app')?.dataset.tab==='map')overview.hidden=false;
    }
  };
  const showMessage=message=>{results.replaceChildren();status.textContent=message;};
  const applyVisibility=()=>{
    if(!ready)return;
    for(const id of layers)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',active?'visible':'none');
  };
  let accessCollection=EMPTY;
  const loadedStationFeatures=()=>{
    try{
      return (map.querySourceFeatures?.('metro-accessibility-local')||[])
        .filter(f=>f?.geometry?.type==='Point');
    }catch{return [];}
  };
  let runAccessQuery=()=>Promise.resolve();
  const renderAccessSummary=(stage='loading',error='')=>{
    const summary=summarizePedestrianAccess(accessCollection.features,loadedStationFeatures());
    results.replaceChildren();
    const panelBody=el('div','ped-access-summary');
    const statGrid=el('div','ped-access-stat-grid');
    for(const [key,label] of [['elevators','승강설비'],['exits','역 출입구'],['barriers','계단·연석 등']]){
      const tile=el('div','ped-access-stat');
      const value=el('strong','',stage==='loading'&&summary[key]===0?'확인 중':`${summary[key]}곳`);
      tile.append(value,el('span','',label));
      statGrid.append(tile);
    }
    panelBody.append(statGrid);
    const zoom=Number(map.getZoom?.()||0);
    const note=zoom<15.8
      ?`현재 확대 ${zoom.toFixed(1)} · 승강설비·연석 등 상세 아이콘은 확대 15.8 이상에서 주로 표시됩니다.`
      :'시설 아이콘을 누르면 등록된 정보를 확인할 수 있습니다. 자료에 없는 시설은 표시되지 않을 수 있습니다.';
    panelBody.append(el('p','ped-access-note',note));
    if(stage==='loading')panelBody.append(el('p','ped-access-note','공개지도 자료를 조회 중입니다. 현재 화면에 로드된 지하철 시설부터 표시합니다.'));
    if(stage==='failed')panelBody.append(el('p','ped-access-note',`공개지도 서버 연결 실패 · ${safeString(error||'잠시 후 재조회해 주세요.')}`));
    if(stage==='ready' && !summary.total)panelBody.append(el('p','ped-access-note','현재 확인된 등록 시설이 없습니다. 실제 시설이 없다는 뜻은 아닙니다.'));
    const actions=el('div','ped-access-actions');
    if(zoom<15.8){
      const zoomButton=el('button','','현재 지도 확대');zoomButton.type='button';
      zoomButton.addEventListener('click',()=>{
        map.easeTo?.({zoom:16.2,duration:500});
        renderAccessSummary(stage,error);
      });
      actions.append(zoomButton);
    }
    const retryButton=el('button','','시설정보 다시 조회');retryButton.type='button';
    retryButton.addEventListener('click',()=>{if(active)void runAccessQuery(seq,true);});
    actions.append(retryButton);panelBody.append(actions);
    if(summary.locations.length){
      const current=map.getCenter?.();
      const origin=current?[Number(current.lng),Number(current.lat)]:null;
      const nearest=summary.locations.map(f=>({...f,distance:origin?distanceMeters(origin,f.coordinates):Infinity}))
        .sort((a,b)=>a.distance-b.distance).slice(0,5);
      const heading=el('strong','', '현재 확인된 시설');heading.className='ped-access-list-heading';
      panelBody.append(heading);
      const items=el('div','ped-access-list');
      for(const item of nearest){
        const b=el('button','');b.type='button';
        b.append(el('span','',item.name),el('span','',Number.isFinite(item.distance)?`${Math.round(item.distance)}m`:'지도 보기'));
        b.addEventListener('click',()=>map.flyTo?.({center:item.coordinates,zoom:Math.max(16.4,map.getZoom?.()||0),duration:550}));
        items.append(b);
      }
      panelBody.append(items);
    }
    panelBody.append(el('p','ped-access-note','집계는 현재 지도에 로드된 공식 출입구 자료와 공개지도 조회 결과 기준이며, 전체 시설 수나 현재 가동 상태를 의미하지 않습니다.'));
    results.append(panelBody);
  };
  const retrieveAccess=async()=>{
    if(loaded)return accessCollection.features.length;
    if(loading)return loading;
    const bbox='37.473,126.895,37.526,127.005';
    const query=`[out:json][timeout:20];(node["highway"="elevator"](${bbox});node["highway"="crossing"]["kerb"](${bbox});node["highway"="crossing"]["wheelchair"="yes"](${bbox});node["barrier"="kerb"]["kerb"](${bbox});way["highway"="steps"](${bbox}););out center tags;`;
    loading=(async()=>{
      const elements=await queryOverpass(query,8000);
      const geojson=normalizedAccessFeatures(elements,isDongjak);
      accessCollection=geojson;
      map.getSource(source)?.setData(geojson);
      loaded=true;
      return geojson.features.length;
    })();
    try{return await loading;}finally{loading=null;}
  };
  runAccessQuery=async(current,force=false)=>{
    if(force){loaded=false;accessCollection=EMPTY;map.getSource(source)?.setData(EMPTY);}
    renderAccessSummary('loading');
    status.textContent='공개지도 보행시설을 조회 중입니다. 아래에 현재 확인 가능한 정보와 확대 방법을 표시합니다.';
    try{
      const count=await retrieveAccess();
      if(current!==seq||!active)return;
      applyVisibility();
      const metroCount=summarizePedestrianAccess([],loadedStationFeatures());
      status.textContent=`공개지도 등록 시설 ${count}곳 · 현재 로드된 역 출입구 ${metroCount.exits}곳 (표시 범위에 한정)`;
      renderAccessSummary('ready');
    }catch(error){
      if(current!==seq||!active)return;
      applyVisibility();
      status.textContent='공개지도 자료 연결에 실패했습니다. 현재 로드된 지하철 출입구 정보를 확인할 수 있습니다.';
      renderAccessSummary('failed',error?.message);
    }
  };
  accessButton.addEventListener('click',()=>{
    active=!active;seq++;
    const current=seq;
    accessButton.setAttribute('aria-pressed',String(active));
    if(!active){applyVisibility();if(!panel.hidden)panel.hidden=true;restoreOverview();return;}
    showPanel('교통약자 보행정보');
    width.hidden=false;
    // Reuse the existing official transit-accessibility source, if available.
    const stationButton=document.getElementById('toggle-station-accessibility');
    if(stationButton?.getAttribute('aria-pressed')==='false')stationButton.click();
    if(!ready)addLayers();
    if(!ready){
      status.textContent='기본지도가 준비되는 중입니다. 잠시 후 다시 조회해 주세요.';
      renderAccessSummary('loading');return;
    }
    applyVisibility();
    renderAccessSummary('loading');
    void runAccessQuery(current);
  });
  function offerMapCenter(message){
    panel.dataset.nearbyMode='empty';showMessage(message);
    const button=el('button','ped-nearby-item dj-nearby-map-center','지도 중심으로 조회');button.type='button';
    button.addEventListener('click',()=>void showNearby(true));results.append(button);
  }
  async function showNearby(useMapCenter=false){
    seq++;const current=seq;
    showPanel('내 주변 보행정보');
    panel.dataset.nearbyMode='list';
    width.hidden=true;
    showMessage(useMapCenter?'지도 중심 시설 자료 확인 중…':'위치 권한 확인 중… 내 위치는 서버에 저장하지 않습니다.');
    try{
      const position=useMapCenter?null:await requestPosition({enableHighAccuracy:false,timeout:12000,maximumAge:60000});
      if(current!==seq)return;
      const center=useMapCenter?map.getCenter():null;
      const latitude=Number(useMapCenter?center?.lat:position?.coords?.latitude),longitude=Number(useMapCenter?center?.lng:position?.coords?.longitude);
      if(!Number.isFinite(latitude)||!Number.isFinite(longitude))throw new Error('위치 좌표를 확인하지 못했습니다.');
      const inside=isDongjak(longitude,latitude);if(inside!==true){
        offerMapCenter(inside===false?(useMapCenter?'지도 중심이 동작구 밖입니다. 지도를 동작구 안으로 옮긴 후 다시 조회해 주세요.':'현재 위치는 동작구 밖입니다. 지도 중심을 기준으로 조회할 수 있습니다.'):'동작구 경계 정보를 확인 중입니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      map.flyTo({center:[longitude,latitude],zoom:Math.max(map.getZoom(),15.3),duration:600});
      // Query source features after viewport tiles have a chance to update.
      await new Promise(resolve=>{
        let completed=false;
        const finish=()=>{if(completed)return;completed=true;clearTimeout(timer);map.off?.('idle',finish);resolve();};
        const timer=setTimeout(finish,2100);map.on?.('idle',finish);
      });
      if(current!==seq)return;
      const found=nearbyResults([longitude,latitude],nearbyCandidates(map));
      const groups=[...new Set(found.map(p=>p.category))];
      results.replaceChildren();
      if(!found.length)results.append(el('p','ped-tools-note','이 범위에서 지도에 로드된 시설 자료가 없습니다. 시설이 없다는 뜻은 아닙니다.'));
      for(const kind of groups){
        const section=el('section','ped-nearby-group');const heading=el('h4','',kind);
        if(window.matchMedia?.('(max-width:699px)')?.matches){const glyph=document.createElementNS('http://www.w3.org/2000/svg','svg');glyph.setAttribute('class','djNext-nearby-glyph');glyph.setAttribute('viewBox','0 0 24 24');glyph.setAttribute('fill','none');glyph.setAttribute('stroke','currentColor');glyph.setAttribute('stroke-width','1.8');glyph.setAttribute('aria-hidden','true');
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');const paths={'학교':'M3 9l9-5 9 5-9 5-9-5zm4 3v5l5 3 5-3v-5','지하철':'M6 4h12v14H6zM6 10h12M9 18l-3 3m9-3 3 3','교통약자 시설':'M12 3v18M5 8h14M12 14l-5 7m5-7 5 7','버스정류장':'M5 4h14v15H5zM5 11h14M8 19v2m8-2v2','횡단보도':'M4 4v16m16-16v16M8 6h8m-8 6h8m-8 6h8'};path.setAttribute('d',paths[kind]||'M12 3a7 7 0 0 1 7 7c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 7-7z');glyph.append(path);heading.prepend(glyph);}section.append(heading);
        for(const item of found.filter(p=>p.category===kind)){
          const b=el('button','ped-nearby-item');b.type='button';
          const duplicates=found.filter(p=>p.category===item.category&&p.name===item.name);
          const displayName=duplicates.length>1?`${item.name} · ${item.detail||`위치 ${duplicates.indexOf(item)+1}`}`:item.name;
          b.append(el('span','',displayName),el('strong','',`${item.distance}m`));
          b.title=`${item.source} · 지도에서 보기`;
          b.addEventListener('click',()=>{
            clearNearbyMarker();
            const marker=el('div','dj-nearby-selected-marker');
            marker.append(el('span','dj-nearby-marker-name',displayName),el('span','dj-nearby-marker-dot',''));
            nearbyMarker=new maplibregl.Marker({element:marker,anchor:'bottom'}).setLngLat(item.coordinates).addTo(map);
            const saved=[...results.childNodes];
            const scroll=results.closest('.dj836-sheet-body')||panel;
            const listScroll=scroll.scrollTop;
            const back=el('button','ped-nearby-item','목록으로 돌아가기');back.type='button';
            back.addEventListener('click',()=>{clearNearbyMarker();panel.dataset.nearbyMode='list';results.replaceChildren(...saved);status.hidden=false;requestAnimationFrame(()=>{scroll.scrollTop=listScroll;});});
            panel.dataset.nearbyMode='selected';status.hidden=true;
            results.replaceChildren(el('strong','dj-nearby-selected-name',displayName),el('p','ped-tools-note',`${useMapCenter?'지도 중심':'현재 위치'}에서 직선거리 ${item.distance}m`),back);
            const mobile=window.matchMedia?.('(max-width:699px)')?.matches;
            requestAnimationFrame(()=>{
              if(panel.hidden||panel.dataset.nearbyMode!=='selected')return;
              const canvas=map.getCanvas().getBoundingClientRect();
              const sheet=panel.getBoundingClientRect();
              const offset=mobile?[0,Math.min(0,(sheet.top-canvas.bottom)/2)]:[0,0];
              map.flyTo({center:item.coordinates,offset,zoom:Math.max(16,map.getZoom()),duration:650});
            });
          });
          section.append(b);
        }
        results.append(section);
      }
      const accuracy=Number(position?.coords?.accuracy);
      status.textContent=`${useMapCenter?'지도 중심 기준':'현재 위치 기준'} · 반경 ${RADIUS_M}m${!useMapCenter&&Number.isFinite(accuracy)?' · 위치 정확도 약 '+Math.round(accuracy)+'m':''}\n지도에 로드된 시설만 표시합니다.`;
      results.append(el('p','ped-tools-note','경사도·도로폭·시설의 실시간 상태는 원천 데이터가 부족한 곳에서 판단하지 않습니다.'));
    }catch(error){
      if(current!==seq)return;
      const code=Number(error?.code);
      offerMapCenter(useMapCenter?'지도 중심 시설 정보를 가져오지 못했습니다. 다시 시도해 주세요.':code===1?'위치 접근이 거부되었습니다. 지도 중심으로 조회할 수 있습니다.':'현재 위치를 확인하지 못했습니다. 지도 중심으로 조회할 수 있습니다.');
    }
  }
  nearButton.addEventListener('click',()=>void showNearby());
  reportButton.addEventListener('click',()=>{
    panel.hidden=true;
    restoreOverview();
    onReport();
  });
  width?.addEventListener('click',()=>{
    const button=document.getElementById('toggle-road-width');
    if(button?.getAttribute('aria-pressed')!=='true')button?.click();
    status.textContent='도로폭 추정 레이어를 켰습니다. 안전등급이나 보도 유효폭을 뜻하지 않습니다.';
    panel.hidden=true;restoreOverview();
  });
  const onToggleMapTools=()=>{
    if(panel.hidden)return;
    panel.hidden=true;seq++;restoreOverview();
  };
  mapToolsToggle?.addEventListener('click',onToggleMapTools);
  const dismissNearby=()=>{seq++;panel.hidden=true;if(overview)delete overview.dataset.pedToolsHidden;};
  panel.addEventListener('dongjak:ped-dismiss',dismissNearby);
  close?.addEventListener('click',()=>{
    // The X dismisses this utility to the unobstructed map; it does not
    // resurrect a previously covered overview sheet. Other action flows
    // may still call restoreOverview() when returning to their parent.
    const finish=()=>{panel.hidden=true;seq++;if(overview)delete overview.dataset.pedToolsHidden;};
    if(window.DongjakWindowMotion)window.DongjakWindowMotion.close(panel,finish);else finish();
  });
  return ()=>{
    panel.removeEventListener('dongjak:ped-dismiss',dismissNearby);
    seq++;panel.hidden=true;restoreOverview();active=false;applyVisibility();
    mapToolsToggle?.removeEventListener('click',onToggleMapTools);
    hiddenObserver.disconnect();resetNearby();disposePlacement();disposeNearbySwipe();if(nearbyRetry)window.cancelAnimationFrame?.(nearbyRetry);
    document.removeEventListener('mousedown',onNearbyMouseDown,true);window.removeEventListener('mouseup',onNearbyMouseUp,true);if(nearbyMouseCommit)window.clearTimeout(nearbyMouseCommit);
  };
}
