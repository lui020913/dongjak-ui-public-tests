import {createProtectionFocusContext} from './protection-zone-context.js';
import {getRoadGuidance,renderRoadGuidance,renderEvidenceStatus} from './protection-zone-guidance.js';
import {createFieldworkStore,FIELDWORK_OPTIONS} from './protection-zone-fieldwork.js';
/**
 * Independent Sangdo 1-dong study overlay (police zone polygons + TAAS hotspot records).
 * No API credentials or runtime external calls; reads local public/data/protection-zone assets.
 * Does NOT label candidate roads as certified danger or legal protection gaps.
 */
const BASE='/data/protection-zone/';
const SOURCE_NAMES={
  zones:'pza-zones-source', candidates:'pza-candidates-source',hotspots:'pza-hotspots-source',
  facilities:'pza-facilities-source',radii:'pza-radii-source',boundary:'pza-boundary-source',focuspoints:'pza-focus-points-source',schoolgap:'pza-school-gap-source',catchments:'pza-catchments-source'
};
const SOURCE_FILES={
  zones:'zones.geojson',candidates:'candidates.geojson',hotspots:'accident_hotspots.geojson',
  facilities:'facilities.geojson',radii:'distance_rings_reference.geojson',boundary:'boundary_reference.geojson',schoolgap:'school_300_500m_unprotected_preview.geojson',catchments:'sangdo1_school_catchment_polygons_20260920.geojson'
};
const childFilter=['==',['get','facility_type'],'어린이'];
const seniorFilter=['==',['get','facility_type'],'노인'];
const tierColors=['match',['get','evidence_tier'],'A','#c83932','B','#df7e2e','C','#e49b3e','D','#8562bf','#73848b'];
const layerIds={
  boundary:['pza-boundary-line'],
  child:['pza-child-fill','pza-child-border','pza-child-point'],
  senior:['pza-senior-fill','pza-senior-border','pza-senior-point'],
  schoolgap:['pza-school-gap-casing','pza-school-gap-500','pza-school-gap-300'],
  catchments:['pza-catchment-fill','pza-catchment-outline'],
  candidates:['pza-candidates-casing','pza-candidates-line'],
  focus:['pza-focus-halo','pza-focus-line','pza-focus-marker','pza-focus-marker-label'],
  accidents:['pza-hotspots-fill','pza-hotspots-outline'],
  radii:['pza-radius-500','pza-radius-300']
};
const esc=(v)=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const formatM=(v)=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?`${Number(v).toFixed(1)}m`:'확인 필요';
const visible=(map,id,value)=>{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',value?'visible':'none');};
const boundsOf=(geometry)=>{
  const coords=[];
  const add=part=>{
    if(Array.isArray(part)&&part.length>=2&&Number.isFinite(part[0])&&Number.isFinite(part[1]))coords.push(part);
    else if(Array.isArray(part))part.forEach(add);
  };
  add(geometry?.coordinates);
  if(!coords.length)return [[126.943,37.490],[126.961,37.510]];
  return [[Math.min(...coords.map(c=>c[0])),Math.min(...coords.map(c=>c[1]))],
    [Math.max(...coords.map(c=>c[0])),Math.max(...coords.map(c=>c[1]))]];
};
export function installProtectionZoneMap({map,maplibregl,app,nightMode=null}){
  const panel=document.getElementById('protection-zone-controls');
  if(!panel)return null;
  const toggle=document.getElementById('protection-zone-toggle');
  const status=document.getElementById('protection-zone-status');
  const checkboxNames={child:'protection-zone-child',senior:'protection-zone-senior',
    candidates:'protection-zone-candidates',accidents:'protection-zone-accidents',radii:'protection-zone-radii',schoolgap:'protection-zone-schoolgap',catchments:'protection-zone-catchments'};
  const inputs=Object.fromEntries(Object.entries(checkboxNames).map(([key,id])=>[key,document.getElementById(id)]));
  const simpleButton=document.getElementById('protection-zone-mode-simple');
  const detailButton=document.getElementById('protection-zone-mode-detail');
  const advancedTools=document.getElementById('pza-advanced-tools');
  const modeGuide=document.getElementById('pza-mode-guide');
  let mode='simple';
  let active=false,assets=null,assetPromise=null,initializedEvents=false;
  let previousNight=false,focusedRoad=null;
  let lastOverlayError='';
  const context=createProtectionFocusContext(map);
  const fieldwork=createFieldworkStore(typeof localStorage==='undefined'?undefined:localStorage);
  const roadSheet=document.getElementById('pza-road-sheet');
  const roadForm=document.getElementById('pza-fieldwork-form');
  const roadDetails=document.getElementById('pza-road-details');
  const verificationDetails=document.getElementById('pza-road-verification-details');
  const guideNode=document.getElementById('pza-road-guidance');
  const verificationNode=document.getElementById('pza-road-verification');
  const fieldDetails=document.getElementById('pza-fieldwork-details');
  const fieldworkStatus=document.getElementById('pza-fieldwork-status');
  const fieldworkCount=document.getElementById('pza-fieldwork-count');
  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  const isMobile=()=>typeof window!=='undefined'&&window.matchMedia?.('(max-width: 1079px)')?.matches;
  function refreshFieldCount(){
    const list=fieldwork.all();
    if(fieldworkCount)fieldworkCount.textContent=`기록 ${list.length}건 · 이 브라우저에 저장`;
  }
  refreshFieldCount();
  function closeRoadSheet(){
    if(roadSheet)roadSheet.hidden=true;
    app?.classList?.remove?.('pza-road-selected');
    focusedRoad=null;
  }
  function openRoadSheet(p){
    if(!roadSheet)return;
    focusedRoad={...p,road_id:p.review_fieldwork_id||p.road_id};
    setText('pza-road-label',`보행환경 확인 권장 · ${focusedRoad.road_id||'도로 ID 미확인'}`);
    setText('pza-road-title',p.road_name||'이름 미확인 도로');
    setText('pza-road-summary','보호구역 경계 밖에 있다는 사실만으로 해당 도로가 위험하거나 법적 거리 기준에서 제외됐다고 판단할 수 없습니다.');
    if(guideNode)guideNode.innerHTML=renderRoadGuidance(p);
    if(verificationNode)verificationNode.innerHTML=renderEvidenceStatus(p);
    setText('pza-road-width',formatM(p.width_est_m));
    setText('pza-road-distance',formatM(p.protection_dist_m));
    const previewScore19=Number(p.policy_coverage_all19_preview_score);
    const previewScoreSchool5=Number(p.policy_coverage_school5_preview_score);
    const hasPreview19=p.policy_coverage_all19_preview_score!==null&&p.policy_coverage_all19_preview_score!==undefined&&Number.isFinite(previewScore19);
    const hasPreviewSchool5=p.policy_coverage_school5_preview_score!==null&&p.policy_coverage_school5_preview_score!==undefined&&Number.isFinite(previewScoreSchool5);
    const scoreExplanation=(hasPreview19||hasPreviewSchool5)
      ? `<p><strong>제도적 보호 공백 시범점수 (0점 공백 큼 · 100점 모형 내 공백 작음)</strong></p>
         ${hasPreview19?`<p>어린이·노인 시설 19곳 기준: <b>${esc(previewScore19.toFixed(1))}점</b></p>`:''}
         ${hasPreviewSchool5?`<p>초등학교 5곳만 기준: <b>${esc(previewScoreSchool5.toFixed(1))}점</b></p>`:''}
         <p class="pza-evidence-note">기존 경찰청 등록 보호구역 경계와 시설 대표점으로 추산한 잠정 연구값입니다. 출입문·고시·통학 동선 확인 전이므로 법적 누락, 실제 위험도 또는 안전 등급이 아닙니다.</p>`
      :'';
    const evidence=document.getElementById('pza-road-evidence');
    if(evidence)evidence.innerHTML=`${scoreExplanation}<p>후보 구간 길이: <b>${formatM(p.segment_length_m)}</b></p>
      <p>조명 시설(등록 데이터)까지 추정거리: <b>${formatM(p.light_dist_min_m)}</b></p>
      <p>2023~24 표기 사고다발지역과 교차: <b>${formatM(p.overlap_2023_24_m)}</b></p>
      <p>2015~22 표기 사고다발지역과 교차: <b>${formatM(p.overlap_2015_22_m)}</b></p>
      <p class="pza-evidence-note">이 연장은 실제 사고 지점·발생 건수가 아닙니다. 추정 도로폭은 보도 유효폭이 아니며, 조명까지의 거리는 실제 조도가 아닙니다.</p>`;
    if(roadDetails)roadDetails.open=false;
    if(verificationDetails)verificationDetails.open=false;
    if(fieldDetails)fieldDetails.open=false;
    const prior=fieldwork.get(focusedRoad.road_id)||{};
    if(roadForm)for(const [key,options] of Object.entries(FIELDWORK_OPTIONS)){
      const control=roadForm.elements?.namedItem?.(key);
      if(control)control.value=options.includes(prior[key])?prior[key]:options[0];
    }
    for(const key of ['survey_date','notes','photo_reference']){
      const control=roadForm?.elements?.namedItem?.(key);
      if(control)control.value=prior[key]||'';
    }
    if(fieldworkStatus)fieldworkStatus.textContent=prior.updated_at
      ?'저장된 기존 현장기록을 불러왔습니다. 수정 후 다시 저장할 수 있습니다.'
      :'미조사 구간입니다. 실제 답사 후 관찰한 사실만 기록하세요.';
    roadSheet.hidden=false;
    app?.classList?.add?.('pza-road-selected');
    closeMobileSafetyDrawer();
  }
  roadSheet?.querySelector?.('#pza-road-close')?.addEventListener('click',closeRoadSheet);
  document.addEventListener?.('keydown',event=>{if(event.key==='Escape'&&!roadSheet?.hidden)closeRoadSheet();});
  roadForm?.addEventListener('submit',event=>{
    event.preventDefault();
    if(!focusedRoad)return;
    const item={road_id:focusedRoad.road_id,road_name:focusedRoad.road_name};
    for(const key of [...Object.keys(FIELDWORK_OPTIONS),'survey_date','notes','photo_reference'])
      item[key]=roadForm.elements.namedItem(key)?.value||'';
    try{
      const result=fieldwork.save(item);
      if(fieldworkStatus)fieldworkStatus.textContent=result.persisted
        ?'저장했습니다. 이 브라우저에 보관됩니다.'
        :'브라우저 저장이 차단되어 이번 세션에서만 유지됩니다.';
      refreshFieldCount();
    }catch(error){if(fieldworkStatus)fieldworkStatus.textContent=`저장 오류: ${error.message}`;}
  });
  document.getElementById('pza-fieldwork-remove')?.addEventListener('click',()=>{
    if(!focusedRoad)return;
    if(!fieldwork.get(focusedRoad.road_id)){if(fieldworkStatus)fieldworkStatus.textContent='이 구간에는 삭제할 기록이 없습니다.';return;}
    if(typeof window!=='undefined'&&!window.confirm?.('이 도로에 저장된 현장기록을 삭제하시겠습니까?'))return;
    const saved=fieldwork.remove(focusedRoad.road_id);
    openRoadSheet(focusedRoad);
    if(fieldworkStatus)fieldworkStatus.textContent=saved?'기록을 삭제했습니다.':'저장소에 반영하지 못했습니다.';
    refreshFieldCount();
  });

  const notify=message=>{if(status)status.textContent=message;};
  const selected=key=>Boolean(inputs[key]?.checked);
  const shouldBlock=()=>app?.dataset?.tab!=='map'||
    ['route-picking','route-preview','route-guiding','adding'].some(c=>app?.classList?.contains(c));
  async function fetchAssets(){
    if(assets)return assets;
    if(!assetPromise)assetPromise=Promise.all(Object.entries(SOURCE_FILES).map(async([key,name])=>{
      const response=await fetch(`${BASE}${name}`);
      if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);
      const json=await response.json();
      if(json.type!=='FeatureCollection'||!Array.isArray(json.features))throw new Error(`${name}: GeoJSON 형식 오류`);
      return [key,json];
    })).then(items=>{assets=Object.fromEntries(items);return assets;}).catch(error=>{assetPromise=null;throw error;});
    return assetPromise;
  }
  function layersAdd(){
    // `isStyleLoaded()` can be temporarily false while unrelated map tiles load.
    // If so, retry on `idle` instead of leaving the UI active with zero drawn layers.
    if(!assets||!map.isStyleLoaded())return false;
    Object.entries(SOURCE_NAMES).forEach(([key,name])=>{
      if(key==='focuspoints')return;
      if(!map.getSource(name))map.addSource(name,{type:'geojson',data:assets[key]});
    });
    if(!map.getSource(SOURCE_NAMES.focuspoints)){
      const features=assets.candidates.features.filter(f=>['R0248','R0288'].includes(f.properties?.road_id))
        .map(f=>({type:'Feature',geometry:{type:'Point',coordinates:[Number(f.properties.center_lon),Number(f.properties.center_lat)]},properties:{...f.properties}}))
        .filter(f=>f.geometry.coordinates.every(Number.isFinite));
      map.addSource(SOURCE_NAMES.focuspoints,{type:'geojson',data:{type:'FeatureCollection',features}});
    }
    // Never place overlays below the first basemap symbol: later opaque district,
    // buildings or custom base layers can entirely cover them. Keep transit pins
    // above the study layer so station and bus controls remain accessible.
    const overlayAnchor=()=>{
      const layers=map.getStyle()?.layers||[];
      const anchors=['transport-bus-stop','transport-subway-station-shadow',
        'transport-subway-station','transport-subway-glyph','transport-bus-names'];
      return layers.find(layer=>anchors.includes(layer.id))?.id;
    };
    const add=def=>{if(!map.getLayer(def.id))map.addLayer(def,overlayAnchor());};
    add({id:'pza-boundary-line',type:'line',source:SOURCE_NAMES.boundary,
      paint:{'line-color':'#256d90','line-width':2.5,'line-opacity':0.75,'line-dasharray':[2,2]}});
    // Reference ranges are explicitly not the designated zone boundaries.
    for(const radius of [500,300])add({id:`pza-radius-${radius}`,type:'line',source:SOURCE_NAMES.radii,
      filter:['==',['get','radius_m'],radius],
      paint:{'line-color':radius===300?'#54a3c9':'#8ea6c4','line-width':radius===300?1.5:1.2,
        'line-opacity':0.7,'line-dasharray':[3,3]}});
    // Official *school attendance catchments* are distinct from legally designated
    // police protection zones and not observations of routes actually used by pupils.
    // Keep muted and opt-in, with no link to navigation safety costs or PRI.
    add({id:'pza-catchment-fill',type:'fill',source:SOURCE_NAMES.catchments,
      paint:{'fill-color':'#5d9c88','fill-opacity':0.065}});
    add({id:'pza-catchment-outline',type:'line',source:SOURCE_NAMES.catchments,
      paint:{'line-color':'#338b79','line-width':['interpolate',['linear'],['zoom'],11,1.1,17,2.4],
        'line-opacity':0.82,'line-dasharray':[2.5,1.5]}});
    // Exploratory school-adjacent *undesignated* road segments (not certified hazards).
    // Full 25m segments can straddle the 300/500m rings; percentages retain overlap.
    add({id:'pza-school-gap-casing',type:'line',source:SOURCE_NAMES.schoolgap,minzoom:13,
      layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-opacity':0.58,
        'line-width':['interpolate',['linear'],['zoom'],13,3,17,7]}});
    add({id:'pza-school-gap-500',type:'line',source:SOURCE_NAMES.schoolgap,minzoom:13,
      filter:['==',['get','band'],'300to500'],
      layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#c39b58',
        'line-width':['interpolate',['linear'],['zoom'],13,2.0,17,4.5],'line-opacity':0.88}});
    add({id:'pza-school-gap-300',type:'line',source:SOURCE_NAMES.schoolgap,minzoom:13,
      filter:['==',['get','band'],'within300'],
      layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#d27e42',
        'line-width':['interpolate',['linear'],['zoom'],13,2.5,17,5.5],'line-opacity':0.92}});
    // TAAS statistical hotspots: year is record label, not proof of accident at click point.
    add({id:'pza-hotspots-fill',type:'fill',source:SOURCE_NAMES.hotspots,
      paint:{'fill-color':['case',['>=',['to-number',['get','id_year']],2023],'#d84d46','#d4a149'],
        'fill-opacity':0.075}});
    add({id:'pza-hotspots-outline',type:'line',source:SOURCE_NAMES.hotspots,
      paint:{'line-color':['case',['>=',['to-number',['get','id_year']],2023],'#c5423f','#b8893d'],
        'line-width':1.2,'line-opacity':0.68,'line-dasharray':[2,1.5]}});
    add({id:'pza-child-fill',type:'fill',source:SOURCE_NAMES.zones,filter:childFilter,
      paint:{'fill-color':'#258cc6','fill-opacity':0.30}});
    add({id:'pza-senior-fill',type:'fill',source:SOURCE_NAMES.zones,filter:seniorFilter,
      paint:{'fill-color':'#8955b0','fill-opacity':0.30}});
    add({id:'pza-child-border',type:'line',source:SOURCE_NAMES.zones,filter:childFilter,
      paint:{'line-color':'#1378b2','line-width':['interpolate',['linear'],['zoom'],11,2.0,17,3.6]}});
    add({id:'pza-senior-border',type:'line',source:SOURCE_NAMES.zones,filter:seniorFilter,
      paint:{'line-color':'#7843a0','line-width':['interpolate',['linear'],['zoom'],11,2.0,17,3.6]}});
    add({id:'pza-child-point',type:'circle',source:SOURCE_NAMES.facilities,
      filter:childFilter,minzoom:14,
      paint:{'circle-color':'#187cb5','circle-radius':4,'circle-stroke-color':'#fff','circle-stroke-width':1.2}});
    add({id:'pza-senior-point',type:'circle',source:SOURCE_NAMES.facilities,
      filter:seniorFilter,minzoom:14,
      paint:{'circle-color':'#8045a5','circle-radius':4,'circle-stroke-color':'#fff','circle-stroke-width':1.2}});
    add({id:'pza-candidates-casing',type:'line',source:SOURCE_NAMES.candidates,minzoom:13,
      layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-opacity':0.85,
        'line-width':['interpolate',['linear'],['zoom'],13,3.6,17,8.5]}});
    add({id:'pza-candidates-line',type:'line',source:SOURCE_NAMES.candidates,minzoom:13,
      layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':tierColors,
        'line-width':['interpolate',['linear'],['zoom'],13,2.5,17,6.2]}});
    add({id:'pza-focus-halo',type:'line',source:SOURCE_NAMES.candidates,minzoom:12,
      filter:['in',['get','road_id'],['literal',['R0248','R0288']]],
      layout:{'line-cap':'round','line-join':'round'},
      paint:{'line-color':'#fff','line-opacity':0.95,
        'line-width':['interpolate',['linear'],['zoom'],13,6.0,17,12.0]}});
    add({id:'pza-focus-line',type:'line',source:SOURCE_NAMES.candidates,minzoom:12,
      filter:['in',['get','road_id'],['literal',['R0248','R0288']]],
      layout:{'line-cap':'round','line-join':'round'},
      paint:{'line-color':'#c53634','line-width':['interpolate',['linear'],['zoom'],12,4.0,17,8.5]}});
    // At neighborhood overview zoom levels, a ~60m line is hard to notice.
    // Two labelled markers identify the reviewed segments; markers disappear at
    // high zoom where their precise road lines and click target take over.
    add({id:'pza-focus-marker',type:'circle',source:SOURCE_NAMES.focuspoints,minzoom:11,maxzoom:16,
      paint:{'circle-color':'#b82e33','circle-radius':['interpolate',['linear'],['zoom'],11,5,15,7.5],
        'circle-stroke-color':'#ffffff','circle-stroke-width':2.3,'circle-opacity':0.98}});
    if(map.getStyle()?.glyphs)add({id:'pza-focus-marker-label',type:'symbol',source:SOURCE_NAMES.focuspoints,minzoom:12,maxzoom:16,
      layout:{'text-field':['get','road_name'],'text-size':12,'text-anchor':'bottom',
        'text-offset':[0,-1.05],'text-allow-overlap':true,'text-ignore-placement':false},
      paint:{'text-color':'#963138','text-halo-color':'#fff','text-halo-width':1.5}});
    ensureOverlayOrder();
    syncVisibility();
    context.sync();
    if(!initializedEvents){bindMapEvents();initializedEvents=true;}
    lastOverlayError='';
    return true;
  }
  function ensureOverlayOrder(){
    if(!map.moveLayer||!map.getStyle)return;
    const layers=map.getStyle()?.layers||[];
    const ids=Object.values(layerIds).flat();
    const own=ids.filter(id=>map.getLayer(id));
    if(!own.length)return;
    const anchors=['transport-bus-stop','transport-subway-station-shadow',
      'transport-subway-station','transport-subway-glyph','transport-bus-names'];
    const firstTransit=layers.find(l=>anchors.includes(l.id))?.id;
    // Check actual stack before applying moveLayer; avoid idle-render loops.
    const positions=new Map(layers.map((l,i)=>[l.id,i]));
    const firstOwn=Math.min(...own.map(id=>positions.get(id)??Infinity));
    const lastOwn=Math.max(...own.map(id=>positions.get(id)??-1));
    const lastOpaque=layers.reduce((acc,l,i)=>
      !own.includes(l.id)&&!anchors.includes(l.id)&&
      (l.type==='fill-extrusion'||l.type==='raster'||l.type==='background'||l.id==='district-exterior-fade')?i:acc,-1);
    const transitPos=firstTransit?positions.get(firstTransit):Infinity;
    // Some custom styles put opaque buildings *above* transit markers. In that
    // case visibility takes precedence: overlay on top instead of an impossible
    // order that would otherwise trigger infinite idle/moveLayer cycles.
    const effectiveAnchor=transitPos>lastOpaque?firstTransit:undefined;
    const upperBound=effectiveAnchor?transitPos:Infinity;
    const orderWrong=own.some((id,i)=>i&&positions.get(id)<positions.get(own[i-1]));
    if(!orderWrong&&firstOwn>lastOpaque&&lastOwn<upperBound)return;
    // Move only when the layer is actually obscured or out of order.
    for(const id of own)map.moveLayer(id,effectiveAnchor);
  }
  function missingOverlayLayers(){return Object.values(layerIds).flat().filter(id=>
    (id!=='pza-focus-marker-label'||Boolean(map.getStyle()?.glyphs))&&!map.getLayer(id));}
  function recoverLayers(){
    if(!active||!assets)return;
    if(!map.isStyleLoaded())return;
    try{
      if(missingOverlayLayers().length)layersAdd();
      else ensureOverlayOrder();
      if(!missingOverlayLayers().length&&status?.textContent?.includes('준비 중'))
        notify('보호구역과 검토 도로를 지도에 표시했습니다. 빨간 선 또는 표식을 선택해 보세요.');
    }catch(error){
      if(lastOverlayError!==String(error))console.warn('[보호구역 레이어 복구]',error);
      lastOverlayError=String(error);
      notify(`보호구역 표시 복구 중 · 지도 스타일 재로딩 후 자동 재시도합니다. (${error.message})`);
    }
  }
  function syncMode(){
    panel.setAttribute?.('data-mode',mode);
    if(simpleButton)simpleButton.setAttribute('aria-pressed',String(mode==='simple'));
    if(detailButton)detailButton.setAttribute('aria-pressed',String(mode==='detail'));
    if(advancedTools)advancedTools.hidden=mode!=='detail';
    if(modeGuide)modeGuide.textContent=mode==='simple'
      ? '빨간색 도로를 누르면 보행 시 참고할 사항과 아직 검증되지 않은 항목을 볼 수 있습니다.'
      : '2026년 학교 배정구역과 300·500m 참고 도로를 구분해 볼 수 있습니다. 학구는 실제 통학로나 보호구역이 아닙니다.';
  }
  function syncVisibility(){
    const detailed=mode==='detail';
    for(const id of layerIds.boundary)visible(map,id,active&&detailed);
    for(const [key,ids] of Object.entries(layerIds)){
      if(key==='boundary')continue;
      for(const id of ids){
        const show=key==='focus'?active
          : key==='child'||key==='senior'?active&&(!detailed||selected(key))&&(!id.endsWith('-point')||detailed)
          : active&&detailed&&selected(key);
        visible(map,id,show);
      }
    }
    if(toggle){toggle.setAttribute('aria-pressed',String(active));
      toggle.textContent=active?'분석 표시 끄기':'지도에 표시하기';}
  }
  function switchMode(next){
    if(!['simple','detail'].includes(next))return;
    mode=next;
    syncMode();
    if(active){recoverLayers();syncVisibility();}
    notify(next==='simple'
      ? '간단 보기 · 공개 보호구역 경계과 보행환경 확인 권장 도로 2곳을 표시합니다.'
      : '상세 분석 · 필요한 레이어를 선택해 추가하세요. 사고자료와 거리 참고선은 기본적으로 꺼져 있습니다.');
  }
  function frameFocusRoads(){
    const geometries=assets?.candidates.features
      .filter(f=>['R0248','R0288'].includes(f.properties.road_id))
      .map(f=>f.geometry.coordinates);
    if(!geometries?.length)return;
    const mobile=typeof window!=='undefined'&&window.matchMedia?.('(max-width: 1079px)')?.matches;
    const padding=mobile?{top:110,bottom:185,left:45,right:45}:{top:85,bottom:90,left:90,right:90};
    map.fitBounds(boundsOf({coordinates:geometries}),{padding,maxZoom:16.25,duration:700});
  }
  function closeMobileSafetyDrawer(){
    // Preserve the desktop workbench; on mobile, let the user see the map after selection.
    if(typeof window==='undefined'||!window.matchMedia?.('(max-width: 1079px)')?.matches)return;
    app?.classList?.remove?.('map-safety-open');
  }
  function explainRoad(p){return getRoadGuidance(p).intro;}
  function roadPopupHtml(p){
    const tier=String(p.evidence_tier||'').slice(0,1);
    const recent=Number(p.overlap_2023_24_m||0);
    const historical=Number(p.overlap_2015_22_m||0);
    const scoreSummary=p.policy_coverage_all19_preview_score!==undefined
      ?`<p>제도적 보호 공백 시범점수: 19개 시설 <b>${esc(p.policy_coverage_all19_preview_score)}점</b> / 초등학교 5개교 <b>${esc(p.policy_coverage_school5_preview_score)}점</b></p>`
      :'';
    return `<strong>${esc(p.road_name||'이름 미확인 도로')}</strong>
      <p class="pza-popup-summary">${esc(explainRoad(p))}</p>${scoreSummary}
      <div class="pza-popup-facts"><span>도로폭(추정) <b>${formatM(p.width_est_m)}</b></span>
      <span>공식 구역과 거리 <b>${formatM(p.protection_dist_m)}</b></span></div>
      <details><summary>분석 근거 자세히</summary>
      <dl><dt>도로 ID / 증거 그룹</dt><dd>${esc(p.road_id)} / ${esc(tier)}</dd>
      <dt>후보 구간 길이</dt><dd>${formatM(p.segment_length_m)}</dd>
      <dt>기록된 조명까지 거리</dt><dd>${formatM(p.light_dist_min_m)}</dd>
      ${p.nearest_zone_name?`<dt>가까운 지정구역</dt><dd>${esc(p.nearest_zone_name)}</dd>`:''}
      <dt>2023~24 표기 사고다발지역 교차</dt><dd>${formatM(recent)}</dd>
      <dt>2015~22 표기 사고다발지역 교차</dt><dd>${formatM(historical)}</dd></dl>
      <p class="pza-popup-note">교차 길이는 실제 사고 발생 지점이나 건수가 아닙니다. 법적 사각지대 및 안전 위험도 확정도 아닙니다. 도로를 누르면 보행 중 참고사항을 확인할 수 있습니다.</p></details>`;
  }
  async function enable(){
    if(active){syncVisibility();return;}
    toggle.disabled=true;notify('보호구역 데이터를 불러오는 중입니다…');
    try{
      await fetchAssets();
      // Do not await style.load here: tile/source loading can make
      // isStyleLoaded() false without another style.load event. The idle
      // recovery hook below finishes registration when the style is ready.
      previousNight=Boolean(nightMode?.isEnabled?.());
      if(previousNight)await nightMode.disable();
      active=true;context.activate();
      if(!layersAdd())notify('지도를 읽는 중입니다. 레이어를 자동으로 표시합니다…');
      syncVisibility();
      if(missingOverlayLayers().length)notify('보호구역 레이어 준비 중 · 지도가 준비되면 자동으로 표시됩니다.');
      else notify(mode==='simple'?'간단 보기 · 공개 보호구역 경계과 검토 도로 2곳을 표시합니다. 빨간 선을 누르면 주의사항을 볼 수 있습니다.':'상세 분석 · 필요한 레이어만 켜세요.');
    }catch(error){
      active=false;context.restore();
      if(previousNight){previousNight=false;void nightMode?.enable?.();}
      notify(`데이터를 표시하지 못했습니다. (${error.message})`);console.warn('[보호구역 분석]',error);
    }
    finally{toggle.disabled=false;syncVisibility();}
  }
  function getPopup(html,lngLat){return new maplibregl.Popup({closeButton:true,maxWidth:'295px'}).setLngLat(lngLat).setHTML(`<div class="pza-popup">${html}</div>`).addTo(map);}
  function bindMapEvents(){
    const bind=(layer,create)=>{
      map.on('click',layer,event=>{
        if(!active||shouldBlock())return;
        const ft=event.features?.[0];if(!ft)return;
        const props=ft.properties||{};
        if(layer==='pza-candidates-line'&&['R0248','R0288'].includes(String(props.road_id)))return;
        if(['pza-candidates-line','pza-focus-line','pza-focus-marker','pza-focus-marker-label'].includes(layer))openRoadSheet(props);
        else getPopup(create(props),event.lngLat);
      });
      map.on('mouseenter',layer,()=>{if(active)map.getCanvas().style.cursor='pointer';});
      map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';});
    };
    const zonePopup=p=>`<strong>${esc(p.facility_name)}</strong><p>경찰청 등록 ${esc(p.facility_type)} 보호구역의 지정 경계입니다.</p><p class="pza-popup-note">시설 위치가 상도1동 안에 있거나 지정 경계가 상도1동 경계와 교차한 자료입니다.</p>`;
    bind('pza-child-fill',zonePopup);bind('pza-senior-fill',zonePopup);
    const facilityPopup=p=>`<strong>${esc(p.facility_name)}</strong><p>시설 대표 POINT (주 출입문 확인 전)</p>`;
    bind('pza-child-point',facilityPopup);bind('pza-senior-point',facilityPopup);
    const schoolGapPopup=p=>`<strong>${esc(p.road_name||'이름 미확인 도로')}</strong>
      <p>연구에 포함된 <b>초등학교 5개교의 시설 대표점</b> 300·500m 범위 중 지정 폴리곤 외부인 선형의 시범 결과입니다. 타 자치구 시설은 아직 미반영됐으며 대표점은 출입문과 다를 수 있습니다.</p>
      <dl><dt>제도적 보호 적정성 시범점수</dt><dd>${esc(p.school_coverage_preview_score)} / 100점</dd>
      <dt>300m 미지정 비율</dt><dd>${esc(p.unprotected_within_300_pct)}%</dd>
      <dt>300~500m 미지정 비율</dt><dd>${esc(p.unprotected_300_to_500_pct)}%</dd>
      <dt>지도에 표시한 해당 범위 선형</dt><dd>${formatM(p.geometry_length_m)}</dd>
      <dt>인접 학교 대표점</dt><dd>${esc(p.nearest_school)}</dd></dl>
      <p class="pza-popup-note">시설 대표점은 주 출입문이 아니며, 반경 내부의 미지정은 법적 누락·위법 또는 사고 위험 확정을 뜻하지 않습니다. 진짜 보행 경로와 지정 고시 확인이 필요합니다.</p>`;
    bind('pza-school-gap-300',schoolGapPopup);bind('pza-school-gap-500',schoolGapPopup);
    bind('pza-catchment-outline',p=>`<strong>${esc(p.catchment_name||'초등학교 통학구역')}</strong>
      <p>2026년 9월 20일 기준 한국교육시설안전원 공식 통학구역 공간자료입니다.</p>
      <p>상도1동 참고경계와 교차한 영역: <b>${esc(
        Number.isFinite(Number(p.overlap_sangdo1_m2))?(Number(p.overlap_sangdo1_m2)/10000).toFixed(2):'확인 필요'
      )}ha</b></p>
      <p class="pza-popup-note">${String(p.name_match_2025||'[]').includes('초')
        ? '2025년 상도1동 통·반 배정표의 학교명과 일치합니다. 다만 2026년 통학구역 경계와 완전히 일치한다는 뜻은 아닙니다.'
        : '2025년 상도1동 통·반 배정표 4개교에는 없는 학구입니다. 참고경계 교차만으로 상도1동 거주지의 배정학교라고 단정할 수 없습니다.'}</p>
      <p class="pza-popup-note">학생의 학교 배정구역입니다. 실제 통학 동선이나 경찰청 지정 어린이보호구역을 의미하지 않으며, 이 자료만으로 위험도를 판정하지 않습니다.</p>`);
    bind('pza-candidates-line',roadPopupHtml);
    bind('pza-focus-line',roadPopupHtml);
    bind('pza-focus-marker',roadPopupHtml);
    bind('pza-focus-marker-label',roadPopupHtml);
    bind('pza-hotspots-fill',p=>`<strong>${esc(p.place)}</strong><p>${esc(p.category)} 사고다발지역 · 자료 표기연도 ${esc(p.id_year)}년</p>
      <p>집계 사고건수: ${esc(p.accidents_cluster)}건 (집계범위 기준)</p><p class="pza-popup-note">면형은 사고다발지역 통계 범위이며 개별 사고 발생 지점이 아닙니다.</p>`);
  }
  simpleButton?.addEventListener('click',()=>switchMode('simple'));
  detailButton?.addEventListener('click',()=>switchMode('detail'));
  syncMode();
  toggle?.addEventListener('click',async()=>{
    if(active){disable();notify('분석 레이어가 꺼졌으며 이전 안전시설 표시 상태를 복원했습니다.');return;}
    await enable();
    if(active){frameFocusRoads();closeMobileSafetyDrawer();}
  });
  Object.values(inputs).forEach(input=>input?.addEventListener('change',()=>{
    if(active){recoverLayers();syncVisibility();}else if(input.checked)enable();
  }));
  document.getElementById('protection-zone-zoom')?.addEventListener('click',async()=>{
    await enable();if(!assets)return;
    map.fitBounds(boundsOf(assets.boundary.features[0].geometry),{padding:70,maxZoom:15.5,duration:650});
    closeMobileSafetyDrawer();
  });
  for(const [id,roadId] of [['protection-zone-focus54','R0248'],['protection-zone-focus62','R0288']]){
    document.getElementById(id)?.addEventListener('click',async()=>{
      await enable();const f=assets?.candidates.features.find(f=>f.properties.road_id===roadId);
      if(!f)return;
      // Focus layers are independent from the 125 general candidates in simple view.
      syncVisibility();
      const p=f.properties;
      const center=[Number(p.center_lon),Number(p.center_lat)];
      map.flyTo({center,zoom:16.8,pitch:0,duration:650,offset:isMobile()?[0,-75]:[0,0]});
      openRoadSheet(p);
      notify(`${p.road_name} 위치를 선택했습니다. 상세창에서 보행 시 참고사항과 1~3차 조사 현황을 확인하세요.`);
      closeMobileSafetyDrawer();
    });
  }
  // Fallback map style is rebuilt by the main app on a connection failure.
  map.on('style.load',()=>{if(active)recoverLayers();});
  // Lazy OSM safety layers can appear after protection mode is activated.
  // Sync only the explicitly managed optional layers, never base map or transit.
  map.on('idle',()=>{if(active){recoverLayers();context.sync();}});
  function disable({restoreNight=true}={}){
    if(!active){previousNight=false;return;}
    active=false;
    closeRoadSheet();
    syncVisibility();
    context.restore();
    const shouldRestore=previousNight&&restoreNight;
    previousNight=false;
    if(shouldRestore)void nightMode?.enable?.();
  }
  document.querySelector?.('.safety-layer-menu')?.addEventListener('click',event=>{
    if(active&&event.target?.closest?.('button'))disable({restoreNight:false});
  },true);
  if(typeof MutationObserver!=='undefined'&&app){
    new MutationObserver(()=>{if(active&&shouldBlock())disable();}).observe(app,{attributes:true,attributeFilter:['data-tab','class']});
  }
  return {enable,disable,isActive:()=>active,getMode:()=>mode,switchMode,openRoadSheet};
}
