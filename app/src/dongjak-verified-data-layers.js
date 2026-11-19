import {registerSafetyPictogram,SAFETY_MARKER_LAYOUT_SIZE} from './dongjak-safety-symbols.js';
import {installSangdoAccidentTeamReview} from './sangdo-accident-team-review.js';
import {createDataLayerFader} from './map-layer-fade-v815.js';
/** Optional official-source/fieldwork layers. No source is downloaded until user opts in. */
export const EXTRA_LAYER_DEFS=Object.freeze({
  'audio-signals':{title:'보행자 음향신호기',file:'/data/safety/accessibility/dongjak_audio_signals_candidates.geojson',kind:'circle',color:'#178e89',minzoom:13.8},
  'official-aed':{title:'자동심장충격기 AED',file:'/api/aed',kind:'circle',color:'#cb4b66',minzoom:12.8,dynamic:true},
  'road-incidents':{title:'실시간 도로 돌발정보',file:'/api/road-incidents',kind:'circle',color:'#d46b3b',minzoom:11.5,dynamic:true},
  'sdot-environment':{title:'S-DoT 도시환경 관측',file:'/api/sdot-environment',kind:'circle',color:'#a76d31',minzoom:12,dynamic:true},
  'accidents':{title:'보행사고 다발지역',file:'/data/safety/accidents/dongjak_accident_points_all.geojson',kind:'circle',color:'#c75039',minzoom:11.5},
  'cctv-security':{title:'방범·어린이보호 CCTV',file:'/data/safety/cctv/dongjak_cctv_security.geojson',kind:'circle',color:'#19847c',minzoom:13.3},
  'cctv-parking':{title:'불법주정차 CCTV',file:'/data/safety/cctv/dongjak_cctv_parking.geojson',kind:'circle',color:'#b68128',minzoom:13.7},
  'cctv-other':{title:'기타·다목적 CCTV',files:['/data/safety/cctv/dongjak_cctv_multipurpose.geojson','/data/safety/cctv/dongjak_cctv_other.geojson'],kind:'circle',color:'#6a6b88',minzoom:13.7},
  'survey-crosswalk':{title:'상도1동 조사 횡단지점',file:'/data/sangdo1-crosswalks-team-review.geojson',kind:'circle',color:'#0d9488',minzoom:14.2},
  'metro-elevator':{title:'지하철 엘리베이터 (2020)',file:'/data/safety/metro/dongjak_elevators_verified.geojson',kind:'circle',color:'#4e7cc3',minzoom:13.8},
  'slope':{title:'보행로 경사 추정',file:'/data/sangdo1-analysis-view/slope.geojson',kind:'line',color:'#4f948d',minzoom:14}
});
export function inPolygon(point,rings){
  const ringContains=ring=>{
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a[1]>point[1])!==(b[1]>point[1]) && point[0] < (b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  };
  return !!rings?.length&&ringContains(rings[0])&&!rings.slice(1).some(ringContains);
}
export function insideBoundary(point,geom){
  if(geom?.type==='Polygon')return inPolygon(point,geom.coordinates);
  if(geom?.type==='MultiPolygon')return geom.coordinates.some(poly=>inPolygon(point,poly));
  return false;
}
export function filteredDistrictPoints(raw,boundary){
  if(!boundary)throw new Error('동작구 경계가 준비되지 않았습니다.');
  if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features))throw new Error('GeoJSON 형식을 확인할 수 없습니다.');
  return {type:'FeatureCollection',features:raw.features.filter(f=>f?.geometry?.type==='Point'&&
    Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length===2&&f.geometry.coordinates.every(Number.isFinite)&&
    insideBoundary(f.geometry.coordinates,boundary))};
}
// Scope analytical *presentation* to Sangdo1; complete Dongjak originals stay on disk.
const SANGDO1_ANALYSIS=new Set(['accidents','cctv-security','cctv-parking','cctv-other','survey-crosswalk','slope']);
const keyFor=name=>`dj-external-${name}`;
const statusMsg=(text)=>{const target=document.getElementById('dj-import-status');if(target)target.textContent=text;};
const updateFeedIndicator=(name,text,state='idle')=>{
  const ids={'road-incidents':'dj-feed-road-status','sdot-environment':'dj-feed-sdot-status','official-aed':'dj-aed-status','audio-signals':'dj-audio-status'};
  const node=document.getElementById(ids[name]||'dj-import-status');
  if(node){node.textContent=text;node.dataset.feedState=state;}
};
const seoulTimestamp=value=>{
  if(!value)return '기록 없음';
  const date=new Date(value);
  return Number.isNaN(+date)?'기록 없음':date.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
};
export function installDongjakOfficialDataLayers({map,maplibregl,getBoundary,canOpen=()=>true}={}){
  const cache=new Map(),rawCache=new Map(),inflight=new Map(),busy=new Set(),enabled=new Set();
  const fetchedAt=new Map(),dataMeta=new Map();let dynamicRefreshTimer=null,sdotRefreshTimer=null;
  const layerFader=createDataLayerFader(map);
  const empty={type:'FeatureCollection',features:[]};
  const partIds=name=>[keyFor(name),`${keyFor(name)}-cluster`,`${keyFor(name)}-cluster-badge`,`${keyFor(name)}-cluster-label`];
  function toggleDraw(name){
    for(const id of partIds(name)){
      if(map.getLayer(id))layerFader.apply(id,enabled.has(name));
    }
  }
  function addLayer(name){
    const def=EXTRA_LAYER_DEFS[name],key=keyFor(name),data=cache.get(name);
    if(!data||!map.getStyle?.()||!getBoundary())return;
    const isPoint=def.kind!=='line';
    if(!map.getSource(key))map.addSource(key,isPoint
      ? {type:'geojson',data,cluster:true,clusterMaxZoom:17,clusterRadius:36}
      : {type:'geojson',data});
    const visibility='none'; // reveal through the layer fader after registration
    if(def.kind==='line'){
      if(!map.getLayer(key))map.addLayer({
        id:key,type:'line',source:key,minzoom:def.minzoom,
        layout:{visibility,'line-cap':'round','line-join':'round'},
        paint:{'line-color':['match',['get','slope_quality'],'model_estimate',
          ['step',['get','slope_mean_abs_pct'],'#239787',5,'#e0af42',10,'#d77c3b',15,'#bc4d48'],
          '#9a9da2'],'line-width':['interpolate',['linear'],['zoom'],14,1.8,17,4.5],'line-opacity':.85}
      });
      toggleDraw(name);return;
    }
    const icon=registerSafetyPictogram(map,name);
    const reviewIcon=name==='survey-crosswalk'?registerSafetyPictogram(map,name,'#858b94'):null;
    if(!map.getLayer(key)){
      if(icon){
        map.addLayer({id:key,type:'symbol',source:key,minzoom:def.minzoom,
          filter:['!', ['has','point_count']],
          layout:{visibility,'icon-image':reviewIcon?['case',['boolean',['get','review_required'],false],reviewIcon,icon]:icon,
            'icon-size':SAFETY_MARKER_LAYOUT_SIZE,
            'icon-allow-overlap':true,'icon-ignore-placement':true,
            'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport',
            'icon-padding':1},
          paint:{'icon-opacity':1}});
      }else{
        // Conservative fallback if canvas icon creation is not supported on a device.
        map.addLayer({id:key,type:'circle',source:key,minzoom:def.minzoom,
          filter:['!', ['has','point_count']],layout:{visibility},
          paint:{'circle-radius':['interpolate',['linear'],['zoom'],13.3,8,16.4,11,18.2,14,20,17],
            'circle-color':def.color,'circle-stroke-color':'#fff','circle-stroke-width':2}});
      }
    }
    const clusterId=`${key}-cluster`,badgeId=`${key}-cluster-badge`,labelId=`${key}-cluster-label`;
    if(!map.getLayer(clusterId)){
      if(icon){
        // Clusters keep the same category pictogram and marker size as one point.
        map.addLayer({id:clusterId,type:'symbol',source:key,minzoom:def.minzoom,
          filter:['has','point_count'],layout:{visibility,'icon-image':icon,
            'icon-size':SAFETY_MARKER_LAYOUT_SIZE,'icon-allow-overlap':true,
            'icon-ignore-placement':true,'icon-pitch-alignment':'viewport',
            'icon-rotation-alignment':'viewport','icon-padding':0},paint:{'icon-opacity':1}});
      }else{
        map.addLayer({id:clusterId,type:'circle',source:key,minzoom:def.minzoom,
          filter:['has','point_count'],layout:{visibility},
          paint:{'circle-color':def.color,'circle-radius':15,
            'circle-stroke-color':'#fff','circle-stroke-width':3}});
      }
    }
    if(!map.getLayer(badgeId))map.addLayer({id:badgeId,type:'circle',source:key,minzoom:def.minzoom,
      filter:['has','point_count'],layout:{visibility},
      paint:{'circle-color':'#173c39',
        'circle-radius':['step',['get','point_count'],11,100,13,1000,15],
        'circle-translate':[13,-13],
        'circle-stroke-color':'#fff','circle-stroke-width':2.2,'circle-opacity':1}});
    if(!map.getLayer(labelId))map.addLayer({id:labelId,type:'symbol',source:key,minzoom:def.minzoom,
      filter:['has','point_count'],layout:{visibility,'text-field':['get','point_count_abbreviated'],
        // Retain the already available text font, with size+halo for strong digits.
        'text-font':['Noto Sans Regular','Open Sans Regular'],
        'text-size':['step',['get','point_count'],15,100,16,1000,17],
        'text-anchor':'center','text-justify':'center','text-offset':[0,0],
        'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport',
        'text-allow-overlap':true,'text-ignore-placement':true},
      paint:{'text-color':'#fff','text-translate':[13,-13],'text-translate-anchor':'viewport','text-halo-width':0}});
    toggleDraw(name);
  }
  async function load(name,{force=false}={}){
    const dynamic=Boolean(EXTRA_LAYER_DEFS[name]?.dynamic);
    const ttl=name==='official-aed'?30*60*1000:name==='sdot-environment'?30*60*1000:90000;
    if(cache.has(name)&&!force&&(!dynamic||Date.now()-(fetchedAt.get(name)||0)<ttl))return cache.get(name);
    if(inflight.has(name))return inflight.get(name);
    const job=(async()=>{
      const def=EXTRA_LAYER_DEFS[name];if(!def)throw new Error('확인되지 않은 레이어입니다.');
      const boundary=getBoundary();if(!boundary)throw new Error('동작구 경계 정보가 준비되지 않았습니다.');
      // S-DoT observations have no verified coordinates in their API payload.
      // Only join official installation coordinates when a reviewed location GeoJSON is supplied.
      if(name==='sdot-environment'){
        let payload=null, archived=null, failure=null;
        try{
          const response=await fetch(def.file,{cache:'no-store',headers:{Accept:'application/json'}});
          payload=await response.json();
          if(!response.ok)throw new Error(payload?.message||`환경정보 API HTTP ${response.status}`);
          if(!Array.isArray(payload.observations)||!payload.summary)throw new Error('S-DoT 응답 형식 오류');
        }catch(error){failure=error;}
        const hasFresh=payload?.summary?.recent_sensor_count>0 && !payload?.summary?.stale;
        // The user-provided CSV contains historical observations but NO coordinates.
        // It is intentionally never promoted to "live" data or geocoded.
        if(!hasFresh){
          try{
            const response=await fetch('/data/safety/sdot/dongjak_sdot_archive_20261026_1101.json',{cache:'force-cache'});
            if(response.ok)archived=await response.json();
          }catch{}
        }
        if(!payload && !archived)throw failure||new Error('환경 관측자료를 불러올 수 없습니다.');
        const data={type:'FeatureCollection',features:[]};
        let locationCount=0;
        if(hasFresh){
          try{
            const response=await fetch('/data/safety/sdot/dongjak_sdot_locations.geojson',{cache:'force-cache'});
            const locations=response.ok?await response.json():empty;
            const observed=new Map(payload.observations.map(r=>[String(r.serial||'').trim(),r]));
            const features=(locations?.features||[]).filter(f=>f?.geometry?.type==='Point' &&
              observed.has(String(f?.properties?.serial||'').trim())).map(f=>({
                type:'Feature',geometry:f.geometry,properties:{...f.properties,...observed.get(String(f.properties.serial).trim())}
              }));
            data.features=filteredDistrictPoints({type:'FeatureCollection',features},boundary).features;
            locationCount=data.features.length;
          }catch(error){console.warn('[S-DoT 위치 검증 실패]',error);}
        }
        const historical=archived && archived.status==='historical' ? archived : null;
        dataMeta.set(name,{...(payload?.summary||{}),mode:hasFresh?'live':historical?'archive':'unavailable',
          source_complete:payload?.meta?.source_complete!==false,
          timestamp:payload?.meta?.retrieved_at||null,location_count:locationCount,
          source:payload?.source||null,historical,api_note:failure?.message||null});
        cache.set(name,data);fetchedAt.set(name,Date.now());return data;
      }
      // Fetch split files concurrently; memoize identical in-flight requests.
      const files=def.files||[def.file];
      const groups=await Promise.all(files.map(async file=>{
        const response=await fetch(file,dynamic?{cache:'no-store',headers:{'Accept':'application/json'}}:{cache:'force-cache'});
        if(!response.ok){let message=`${def.title}: HTTP ${response.status}`;
          try{const error=await response.json();if(error?.message)message=error.message;}catch{}
          throw new Error(message);}

        const json=await response.json();
        if(json?.type!=='FeatureCollection'||!Array.isArray(json.features))throw new Error('GeoJSON 데이터 형식 오류');
        if(name==='official-aed')dataMeta.set(name,json.meta||{});
        return json.features;
      }));
      const raw={type:'FeatureCollection',features:groups.flat()};
      if(name==='audio-signals')rawCache.set(name,raw);
      const viewBoundary=SANGDO1_ANALYSIS.has(name)&&typeof window!=='undefined'
        ?await (await import('./admin-dong-layer.js')).getSangdo1Boundary():boundary;
      // Fail closed when the official boundary cannot be verified; never fall
      // back to showing district-wide analytical data under a Sangdo1 label.
      const data=def.kind==='circle'?filteredDistrictPoints(raw,viewBoundary):raw;
      if(name==='road-incidents'){
        // The API must supply a capture time; don't mistake request time for event time.
        const item=groups[0]?.[0];
        dataMeta.set(name,{retrieved_at:item?.properties?.fetched_at||new Date().toISOString(),count:data.features.length});
      }
      cache.set(name,data);fetchedAt.set(name,Date.now());return data;
    })();
    inflight.set(name,job);
    try{return await job;}finally{inflight.delete(name);}
  }
  const defIsDynamic=name=>Boolean(EXTRA_LAYER_DEFS[name]?.dynamic);
  async function setVisible(name,visible){
    if(!Object.hasOwn(EXTRA_LAYER_DEFS,name))throw new Error('알 수 없는 레이어');
    if(!visible){
      enabled.delete(name);toggleDraw(name);
      if(name==='sdot-environment'){const box=document.getElementById('dj-sdot-summary');if(box)box.hidden=true;}
      if(defIsDynamic(name)||name==='audio-signals')updateFeedIndicator(name,'표시하지 않음','idle');
      return;
    }
    if(!canOpen())throw new Error('현재 화면에서는 안전 데이터를 열 수 없습니다.');
    if(busy.has(name))return;
    busy.add(name);
    try{const data=await load(name);enabled.add(name);addLayer(name);
      const source=map.getSource(keyFor(name));if(defIsDynamic(name))source?.setData?.(data);
      if(name==='sdot-environment')updateSdotStatus();
      else if(name==='audio-signals'){
        updateFeedIndicator(name,`동작구 경계 내부 ${data.features.length.toLocaleString('ko-KR')}개 설치 기록 · 정상 작동 여부 미확인`,'archive');
        statusMsg(`음향신호기 설치 기록 ${data.features.length.toLocaleString('ko-KR')}개 · 2026년 5월 원본 · 현재 작동 여부 미검증`);
      }else if(name==='official-aed'){
        const meta=dataMeta.get(name)||{};
        const stamp=seoulTimestamp(meta.retrieved_at);
        const noCoordinates=!data.features.length && Number(meta.retrieved_rows)>0;
        const message=noCoordinates
          ?`API ${meta.retrieved_rows}건 수신 · 유효 좌표 확인 불가 (지도 표시 없음)`
          :`AED 위치 ${data.features.length.toLocaleString('ko-KR')}개 · 조회 ${stamp}${meta.source_complete===false?' · 일부 페이지만 조회됨':''}`;
        updateFeedIndicator(name,message,noCoordinates?'error':'live');
        statusMsg(`${message} · 출입시간·현재 작동 여부 미확인 · 응급상황은 119`);
      }else if(name==='road-incidents'){
        const t=seoulTimestamp(dataMeta.get(name)?.retrieved_at);
        updateFeedIndicator(name,`조회 ${t} · 동작구 ${data.features.length}건`,'live');
        statusMsg(`TOPIS 도로 돌발정보 ${data.features.length}건 · 조회 ${t} · 실제 보행 통제 여부 미확인`);
      }else statusMsg(defIsDynamic(name)?`${EXTRA_LAYER_DEFS[name].title}: ${data.features.length.toLocaleString()}개 · 조회 ${new Date().toLocaleTimeString('ko-KR')} · 보행 통제 여부 미확인`:
      `${EXTRA_LAYER_DEFS[name].title}: ${data.features.length.toLocaleString()}개 기록 표시 · 조사·통행 상태는 미검증`);
    }finally{busy.delete(name);}
  }
  function updateSdotStatus(){
    const m=dataMeta.get('sdot-environment'),el=document.getElementById('dj-sdot-summary');
    if(!m||!el)return;
    const fmt=value=>Number.isFinite(value)?String(value):'—';
    const live=m.mode==='live',archive=m.mode==='archive';
    el.replaceChildren();el.hidden=false;
    const make=(tag,klass,text)=>{const node=document.createElement(tag);if(klass)node.className=klass;if(text!=null)node.textContent=text;return node;};
    if(live){
      el.append(make('strong','','최신 S-DoT 관측 요약'));
      const metrics=make('div','dj-metrics');
      for(const [label,value] of [['평균 기온',`${fmt(m.recent_mean_temp_c)} ℃`],['평균 습도',`${fmt(m.recent_mean_humidity_pct)} %`]]){
        const cell=make('div','dj-metric');cell.append(make('span','',label),make('b','',value));metrics.append(cell);
      }
      el.append(metrics,make('small','dj-sdot-caveat',`최근 4시간 관측 ${m.recent_sensor_count||0}개 센서 · 마지막 관측 ${seoulTimestamp(m.latest_sample_at)} · 지도 좌표 확인 ${m.location_count}개`));
      updateFeedIndicator('sdot-environment',`최근 관측 ${m.recent_sensor_count||0}개 센서 · ${seoulTimestamp(m.latest_sample_at)}`,'live');
    }else if(archive){
      const h=m.historical;
      el.append(make('strong','','과거 관측자료 · 10월 26일~11월 1일'));
      const metrics=make('div','dj-metrics');
      for(const [label,value] of [['기록된 센서',`${h.sensor_count}개`],['관측 기록',`${h.total_records.toLocaleString('ko-KR')}건`]]){
        const cell=make('div','dj-metric');cell.append(make('span','',label),make('b','',value));metrics.append(cell);
      }
      const lastDay=h.daily?.at(-1);
      if(lastDay)el.append(make('small','dj-sdot-caveat',`${lastDay.date} 기록: 기온 평균 ${fmt(lastDay.temperature_c)}℃ · 습도 평균 ${fmt(lastDay.humidity_pct)}% (과거 센서 평균)`));
      el.append(make('small','dj-sdot-caveat',`2026년 10월 26일~11월 1일 자료입니다. ${m.api_note?'실시간 API에 연결되지 않아 ': '최신 관측이 없어 '}과거 요약만 표시합니다. 위치 좌표가 없어 지도에 점을 찍지 않습니다.`));
      updateFeedIndicator('sdot-environment','과거 자료만 표시 · 실시간 아님','archive');
    }else{
      el.append(make('strong','','최근 관측정보 없음'),make('small','dj-sdot-caveat','현재 유효한 동작구 관측자료를 확인하지 못했습니다.'));
      updateFeedIndicator('sdot-environment','현재 관측 확인 불가','error');
    }
    statusMsg(live?`S-DoT 관측 ${m.recent_sensor_count}개 센서 · ${m.location_count}개 지도 표시 · 현재 보행 안전등급 아님`:
      archive?'S-DoT 과거 자료만 표시 중 · 2026년 10월 26일~11월 1일 · 실시간 아님':'S-DoT 최근 관측 확인 불가');
  }
  function onStyleLoad(){for(const name of enabled){try{addLayer(name);}catch(error){console.warn('[공개 안전자료 레이어 복원]',error);}}}
  map.on('style.load',onStyleLoad);
  function onBoundaryUpdated(){
    const raw=rawCache.get('audio-signals');const boundary=getBoundary();
    if(!raw||!boundary)return;
    try{
      const clipped=filteredDistrictPoints(raw,boundary);
      cache.set('audio-signals',clipped);
      map.getSource(keyFor('audio-signals'))?.setData?.(clipped);
      if(enabled.has('audio-signals'))updateFeedIndicator('audio-signals',`동작구 경계 내부 ${clipped.features.length.toLocaleString('ko-KR')}개 설치 기록 · 정상 작동 여부 미확인`,'archive');
    }catch(error){console.warn('[음향신호기 경계 재검사]',error);}
  }
  map.on('dongjak:boundary-updated',onBoundaryUpdated);
  async function refreshIncidents(){
    const name='road-incidents';if(!enabled.has(name)||document.hidden)return;
    try{
      const data=await load(name,{force:true});
      const source=map.getSource(keyFor(name));source?.setData?.(data);
      updateFeedIndicator(name,`조회 ${new Date().toLocaleTimeString('ko-KR')} · 동작구 ${data.features.length}건`,'live');
      statusMsg(`도로 돌발정보 ${data.features.length}건 · 보행 통제 여부 미확인`);
    }catch(error){
      // Do not keep advertising last-known points as a current road incident feed.
      map.getSource(keyFor(name))?.setData?.(empty);cache.delete(name);fetchedAt.delete(name);
      updateFeedIndicator(name,'갱신 실패 · 기존 지점 표시 중단','error');
      statusMsg('도로 돌발정보 갱신 실패 · 오래된 돌발정보를 지도에서 숨겼습니다.');
    }
  }
  // Visible layer only: slow polling, never promise exact real-time.
  dynamicRefreshTimer=setInterval(refreshIncidents,120000);
  sdotRefreshTimer=setInterval(async()=>{
    const name='sdot-environment';if(!enabled.has(name)||document.hidden)return;
    try{const data=await load(name,{force:true});map.getSource(keyFor(name))?.setData?.(data);updateSdotStatus();}
    catch(error){map.getSource(keyFor(name))?.setData?.(empty);cache.delete(name);fetchedAt.delete(name);
      const box=document.getElementById('dj-sdot-summary');if(box)box.hidden=true;
      updateFeedIndicator(name,'갱신 실패 · 이전 관측 표시 중단','error');
      statusMsg('S-DoT 갱신 실패 · 오래된 관측값을 지도에서 숨겼습니다.');}
  },30*60*1000);
  // One click handler instead of delegated handlers for layers that might not exist yet.
  // This avoids MapLibre querying missing layer IDs during initial map startup.
  const handleMapClick=e=>{
      if(!canOpen()||!enabled.size)return;
      const available=[...enabled].filter(name=>partIds(name).some(id=>map.getLayer(id)));
      if(!available.length)return;
      const hits=map.queryRenderedFeatures(e.point,{layers:available.flatMap(name=>partIds(name).filter(id=>map.getLayer(id)))});
      const f=hits?.[0];if(!f)return;
      const name=available.find(item=>partIds(item).includes(f.layer?.id));
      if(!name)return;
      const def=EXTRA_LAYER_DEFS[name];
      if(f.properties?.cluster && def.kind!=='line'){
        const source=map.getSource(keyFor(name));
        const zoom=source?.getClusterExpansionZoom?.(f.properties.cluster_id);
        if(zoom!==undefined){
          Promise.resolve(zoom).then(value=>{
            if(Number.isFinite(value))map.easeTo?.({center:f.geometry.coordinates,zoom:Math.min(value,20)});
          }).catch(error=>console.warn('[안전 지점 묶음 확대]',error));
        }
        e.originalEvent?.stopPropagation();return;
      }
      e.originalEvent?.stopPropagation();
      const p=f.properties||{};
      if(name==='audio-signals'||name==='official-aed'){
        const box=document.createElement('div');box.className='safety-popup dj-safety-access-popup';
        const title=document.createElement('strong');title.textContent=name==='audio-signals'?'보행자 음향신호기':p.name||'자동심장충격기 AED';box.append(title);
        const addLine=(t)=>{if(!t)return;const line=document.createElement('p');line.textContent=t;box.append(line);};
        if(name==='audio-signals'){
          addLine(`관리번호: ${p.id||'정보 없음'}`);
          if(p.installed_on)addLine(`원본 설치일: ${p.installed_on}`);
        }else{
          if(p.address)addLine(p.address);
          if(p.location_detail)addLine(`건물 내부 위치: ${p.location_detail}`);
          if(p.phone)addLine(`설치기관 연락처: ${p.phone}`);
          addLine(`이용시간: ${p.hours||'제공 자료 없음'} (현재 이용 가능 여부 미확인)`);
        }
        const caption=document.createElement('small');caption.textContent=name==='audio-signals'
          ?'서울시 음향신호기 설치기록(2026년 5월 원본)입니다. 정상 작동·사용 가능 여부를 뜻하지 않습니다.'
          :'국립중앙의료원 등록 위치정보입니다. 실제 위치·건물 출입·작동 여부가 다를 수 있습니다. 응급상황은 119에 신고하세요.';
        box.append(caption);
        const coordinates=f.geometry?.coordinates;
        if(Array.isArray(coordinates)&&coordinates.length===2&&coordinates.every(Number.isFinite)){
          const actions=document.createElement('div');actions.className='dj-access-popup-actions';
          const destination=document.createElement('button');destination.type='button';destination.textContent='여기로 길찾기';
          destination.addEventListener('click',()=>{
            window.dispatchEvent(new CustomEvent('dongjak:route-select',{detail:{which:'end',place:{name:name==='audio-signals'?'음향신호기':(p.name||'AED'),lng:coordinates[0],lat:coordinates[1]}}}));
            popup?.remove();
          });
          actions.append(destination);
          if(name==='official-aed'){
            const emergency=document.createElement('a');emergency.href='tel:119';emergency.textContent='119 신고';emergency.className='dj-access-emergency-link';
            emergency.setAttribute('aria-label','119에 전화 연결');actions.append(emergency);
          }
          box.append(actions);
        }
        const popup=new maplibregl.Popup({offset:12,maxWidth:'320px'}).setLngLat(e.lngLat).setDOMContent(box).addTo(map);
        return;
      }
      const box=document.createElement('div');box.className='safety-popup';
      const headline=document.createElement('strong');headline.textContent=def.title;box.append(headline);
      const detail=document.createElement('p');
      const describe={
        'road-incidents':()=>`${p.description||'도로 돌발정보'} · 발생 ${p.occurrence_date||'일자 미상'} ${p.occurrence_time||''} · 보행 통제 여부 미확인`,
        'sdot-environment':()=>`센서 ${p.serial||'미상'} · 기온 ${p.temperature_c??'—'}℃ · 습도 ${p.humidity_pct??'—'}% · 풍속 ${p.wind_mps??'—'}m/s · 조도 ${p.illumination_lux??'—'}lux · 관측 ${p.sensing_time||'미상'}`, 
        accidents:()=>`${p.site_name||'사고다발지역'} · 선정 기준연도 ${p.reference_year||'미상'} · 사고 ${p.accident_count??'미상'}건 (해당 지역 집계)`,
        'cctv-security':()=>`${p.purpose||'방범'} · 설치 ${p.camera_count||'?'}대 · ${p.address||'위치 미상'}`,
        'cctv-parking':()=>`${p.address||'불법주정차 단속시설'} · 실제 운영 상태 미확인`,
        'cctv-other':()=>`${p.purpose||'기타 CCTV'} · ${p.address||'위치 정보'}`,
        'survey-crosswalk':()=>`${p.name||'현장 조사 지점'} · ${p.review_required?'좌표·시설 현장 재확인 필요':'공식 시설 여부 미확인'}`,
        'metro-elevator':()=>`${p.station_name_source||'역명 미상'} · 운영·고장 상태는 별도 확인`,
        slope:()=>`평균 절대경사 추정 ${p.slope_mean_abs_pct??'?'}% · 품질 ${p.slope_quality||'미상'}`
      };
      detail.textContent=describe[name]?.()||'';box.append(detail);
      const caveat=document.createElement('small');caveat.textContent=name==='sdot-environment'?'서울시 S-DoT 센서 관측값입니다. 기상청 공식 관측이나 현재 보행 위험등급이 아닙니다.':name==='road-incidents'?'도로교통 돌발정보입니다. 실제 보행로 통제와 직접 일치하지 않을 수 있습니다. 현장 안내를 우선하세요.':name==='accidents'?'과거 사고다발지역 통계이며 현재 사고 위험도나 2026년 사고건수를 의미하지 않습니다.':
        name==='slope'?'지형 기반 경사 추정이며 실제 보도 경사·휠체어 통행 가능성을 보증하지 않습니다.':
        '시설 위치·운영 및 현장 통행 가능 여부는 확인이 필요합니다.';
      box.append(caveat);
      new maplibregl.Popup({offset:12,maxWidth:'310px'}).setLngLat(e.lngLat).setDOMContent(box).addTo(map);
  };
  map.on('click',handleMapClick);
  // Load small safety datasets while users inspect the open drawer.
  // Large slope geometry is opt-in only and uses a lightweight visualization file.
  let warmed=false;
  const warmSmall=()=>{
    if(warmed||!getBoundary())return;
    warmed=true;
    const tasks=['accidents','survey-crosswalk','metro-elevator','cctv-security','cctv-parking','cctv-other'];
    let n=0;
    const next=()=>{
      if(n>=tasks.length)return;
      const name=tasks[n++];
      const idle=globalThis.requestIdleCallback||((callback)=>setTimeout(callback,200));
      idle(()=>{load(name).catch(()=>{}).finally(next);},{timeout:1500});
    };
    next();
  };
  const safetyToggle=document.getElementById('map-safety-toggle');
  const scheduleWarm=()=>setTimeout(warmSmall,80);
  safetyToggle?.addEventListener('click',scheduleWarm);
  document.querySelectorAll('[data-dj-import]').forEach(button=>{
    const name=button.dataset.djImport;
    if(!Object.hasOwn(EXTRA_LAYER_DEFS,name))return;
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',async()=>{
      const wanted=!enabled.has(name);button.disabled=true;
      statusMsg(`${EXTRA_LAYER_DEFS[name].title} 자료를 확인하는 중…`);
      if((defIsDynamic(name)||name==='audio-signals')&&wanted)updateFeedIndicator(name,'자료 조회 중…','idle');
      try{
        // Render the immediate loading state before decoding GeoJSON / adding layers.
        await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
        await setVisible(name,wanted);button.setAttribute('aria-pressed',String(wanted));
        if(!wanted)statusMsg(`${EXTRA_LAYER_DEFS[name].title} 표시 해제`);
      }catch(error){if(defIsDynamic(name)||name==='audio-signals')updateFeedIndicator(name,'조회 실패 · 연결·좌표 확인 필요','error');statusMsg(`${EXTRA_LAYER_DEFS[name].title}: ${error.message||'표시 실패'}`);}
      finally{button.disabled=false;}
    });
  });
  const disposeTeamReview=installSangdoAccidentTeamReview({map,onStatus:statusMsg,ensureAccidentsVisible:async()=>{
    if(!enabled.has('accidents')){await setVisible('accidents',true);const button=document.querySelector('button[data-dj-import="accidents"]');button?.setAttribute('aria-pressed','true');}
  }});
  return {setVisible,enabled,dispose(){disposeTeamReview();clearInterval(sdotRefreshTimer);clearInterval(dynamicRefreshTimer);safetyToggle?.removeEventListener('click',scheduleWarm);map.off('style.load',onStyleLoad);map.off('dongjak:boundary-updated',onBoundaryUpdated);map.off('click',handleMapClick);}};
}
