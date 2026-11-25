import {parseImport,segmentScore,observedFactorScore,displayFeatures,summarize,CURRENT_VULNERABILITY_FACTORS,CURRENT_FOUR_FACTORS,CURRENT_SIX_FACTORS,currentVulnerabilityCoverage,currentFourFactorCoverage,currentSixFactorCoverage} from './pri-data.mjs';
import {scopedPolicyFeatures,scopedCompositeFeatures} from './pri-scope-data.mjs';
import {buildSanghyeonMiddleSchoolReview} from './sangdo1-middle-school-review.mjs';
import {priOverlayAnchor,priCoveredByMapLayer} from './pri-map-layer-order.mjs';
import {SPEED_RISK_SOURCE,SPEED_RISK_METADATA,speedLimitRiskScore,speedRiskDisplay,speedRiskCounts,validateSpeedRiskSource} from './pri-speed-risk.mjs';
import {spatialMatchSpeedFactor} from './pri-speed-spatial-match.mjs';
import './pri-map.css';
const SOURCE='dj-pri-segments',LINE='dj-pri-line',POINT='dj-pri-point',SPEED_LINE='dj-pri-speed-line',UNKNOWN_CASING='dj-pri-unknown-casing',CANDIDATE_LINE='dj-pri-candidate-line',BOUNDARY_SOURCE='dj-pri-boundary-source',BOUNDARY_CASING='dj-pri-boundary-casing',BOUNDARY_LINE='dj-pri-boundary-line';
const UNKNOWN_COLOR='#687380',CANDIDATE_COLOR='#52677E',BOUNDARY_COLOR='#436F9C';
const EMPTY={type:'FeatureCollection',features:[]};
const POLICY_SCOPE_URL='/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson';
const colors=['case',['get','evaluated'],['step',['get','displayScore'],'#4C948B',40,'#E0A04A',70,'#CF4248'],UNKNOWN_COLOR]; // 0-39 low, 40-69 caution, 70-100 red
const protectionGapColors=['case',['get','evaluated'],['interpolate',['linear'],['get','displayScore'],0,'#4C948B',25,'#82AB94',50,'#DBC576',75,'#DDA263',100,'#CB6563'],UNKNOWN_COLOR];

/** Shared PRI engine stores normalized safety scores, while all public map labels are risk scores (100-safety). */
const riskValue=value=>typeof value==='number'&&Number.isFinite(value)?+(100-value).toFixed(1):null;
const displayRisk=collection=>({...collection,features:collection.features.map(f=>({...f,properties:{...f.properties,score:f.properties.evaluated?riskValue(f.properties.score):null,displayScore:f.properties.evaluated?100-f.properties.displayScore:0}}))});
export function installPriMap({map,maplibregl,app,doc=document,win=window,restoreMode=null}){
 if(doc.getElementById('dj-pri-toggle'))return;
 const el=(tag,cls,txt)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const button=(label,fn)=>{const n=el('button','dj-pri-button',label);n.type='button';n.addEventListener('click',fn);return n;};
 let dataset=null,mode=null,display=EMPTY,policyScope=null,priBoundary=null,schoolReview=null,boundaryAudit=null,speedSource=null,speedMetadata=null,speedMatchStats=null,sharedCandidates=null,fetchStarted=false,revision=0,popup=null,lookup=new Map();
 let pendingRestore=typeof restoreMode==='string'&&/^[a-zA-Z][a-zA-Z0-9_.-]{0,40}$/.test(restoreMode)?(['pri12','pri','current3','current4'].includes(restoreMode)?'current6':restoreMode==='sharedCandidate'?'sharedRoad':restoreMode==='middleReview'?'protectionGap':restoreMode):null;
 const toggle=el('button');toggle.type='button';toggle.id='dj-pri-toggle';toggle.hidden=true;toggle.setAttribute('aria-pressed','false');app.append(toggle);
 const dialog=el('dialog','dj-pri-dialog');dialog.id='dj-pri-dialog';dialog.setAttribute('aria-label','보행 취약도 평가자료');
 const head=el('header','dj-pri-head'),title=el('h2','','보행 취약도');const close=button('닫기',()=>dialog.close());close.classList.add('dj-pri-close');close.setAttribute('aria-label','보행 취약도 닫기');head.append(title,close);
 const intro=el('p','','상도1동 보행 취약도 · 조명·교통사고·제도적 사각지대·제한속도·횡단보도·보차혼용도로 6개 항목. 각 지수는 100점 만점(높을수록 위험)입니다. 구간별 평가된 항목만 동일 가중치로 임시 평균하며, 6/6 미만은 부분평가입니다. 미평가는 회색입니다.');
 const status=el('p','dj-pri-status','등록된 자료가 없습니다.');status.setAttribute('role','status');
 const actions=el('div','dj-pri-actions');
 const scrollBody=el('div','dj-pri-body');
 const resetDialogView=()=>{actions.hidden=false;dialog.dataset.djPriView='list';title.textContent='보행 취약도';scrollBody.scrollTop=0;};
 const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.id='dj-pri-file';
 const upload=button('JSON 자료 불러오기',()=>file.click());const clear=button('지도 색상 끄기',()=>{activate(null);dialog.close();});
 const focusArea=button('분석 지역으로 이동',()=>{
  if(!dataset?.segments?.length)return;
  const bounds=new maplibregl.LngLatBounds();
  if(mode==='speed'){
   for(const feature of speedSource?.features||[])for(const point of feature.geometry.coordinates)bounds.extend(point);
  }else if(mode==='protectionGap'||mode==='current3'){
   for(const feature of policyScope?.features||[])for(const point of feature.geometry.coordinates)bounds.extend(point);
  }else for(const seg of dataset.segments){
   const points=seg.geometry.type==='Point'?[seg.geometry.coordinates]:seg.geometry.coordinates;
   for(const point of points)bounds.extend(point);
  }
  if(!bounds.isEmpty())map.fitBounds(bounds,{padding:{top:155,bottom:140,left:26,right:26},maxZoom:16,duration:450});
  dialog.close();
 });
 const exportButton=button('공통 도로망 JSON 내보내기',()=>{if(!dataset)return;const url=URL.createObjectURL(new Blob([JSON.stringify(dataset,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='pri-network.json';a.click();win.setTimeout(()=>URL.revokeObjectURL(url),1000);});
 const local=el('small','','직접 불러온 자료는 현재 페이지에서만 사용되며 서버에 전송하지 않습니다.');
 const dataTools=el('details','dj-pri-data-tools');dataTools.append(el('summary','','데이터 관리 (현재 기기)'),upload,exportButton,file,local);scrollBody.append(intro,status,actions,focusArea,clear,dataTools);dialog.append(head,scrollBody);doc.body.append(dialog);
 const legend=el('aside','dj-pri-legend');legend.id='dj-pri-legend';legend.hidden=true;
 // Anchor both floating surfaces exactly above the live bottom navigation,
 // not a guessed iPhone safe-area value from an older release.
 // CSS positioning is not necessarily in the same coordinate system as a
 // native modal top layer or a MapLibre popup. On a 375–430px phone the
 // previously rendered dialog remained 121px above the REAL dock despite
 // changes to its CSS bottom. Correct against the two rendered rectangles,
 // only after the browser has laid the surface out.
 const alignPriDockSurface=node=>{
  if(!node||node.hidden||win.innerWidth>699)return;
  const nav=doc.getElementById('bottom-nav');
  if(!nav||nav.hidden)return;
  const dock=nav.getBoundingClientRect?.();
  if(!dock||dock.height<40||!Number.isFinite(dock.top))return;
  node.style.removeProperty('translate');
  const rect=node.getBoundingClientRect?.();
  if(!rect||rect.height<1||!Number.isFinite(rect.bottom))return;
  const shift=Math.round(dock.top-9-rect.bottom);
  if(Math.abs(shift)>1)node.style.setProperty('translate','0px '+shift+'px','important');
 };
 const alignPriDockSurfaces=()=>{
  if(dialog.open)alignPriDockSurface(dialog);
  if(!legend.hidden)alignPriDockSurface(legend);
  if(popup?.getElement?.())alignPriDockSurface(popup.getElement());
 };
 const syncDockClearance=()=>{
  const nav=doc.getElementById('bottom-nav');
  const rect=nav?.getBoundingClientRect?.();
  // The nav can be positioned inside a transformed 100dvh app whose fixed
  // containing block differs from the body/dialog top layer by ~120px.
  // Neither window.innerHeight - nav.top NOR computedStyle(nav).bottom are
  // in the same coordinate system as the body-attached fixed dialog.
  // Use the ACTUAL dock height together with the native dock's 3px bottom
  // safe-area padding. This keeps exactly 9px clear even on iOS standalone.
  const dockHeight=Number.isFinite(rect?.height)&&rect.height>=48&&rect.height<=160?Math.round(rect.height):70;
  doc.documentElement.style.setProperty('--dj-pri-dock-clearance',
   'calc(env(safe-area-inset-bottom,0px) + '+(dockHeight+12)+'px)');
  alignPriDockSurfaces();
 };
 win.addEventListener('resize',syncDockClearance,{passive:true});
 win.visualViewport?.addEventListener?.('resize',syncDockClearance,{passive:true});
 // Keep native map HUD controls out of the PRI data view even when legacy
 // phone controllers set their own inline `display: ... !important` styles.
 // Restore each preexisting inline value exactly when the layer is disabled.
 const savedHudStyle=new Map();
 const syncPriHud=active=>{
  for(const id of ['dj840-map-tip','dj-user-tip-close']){
   const node=doc.getElementById(id);if(!node?.style)continue;
   if(active){
    if(!savedHudStyle.has(node))savedHudStyle.set(node,{value:node.style.getPropertyValue('display'),priority:node.style.getPropertyPriority('display')});
    node.style.setProperty('display','none','important');
   }
  }
  if(!active){for(const [node,old] of savedHudStyle){if(old.value)node.style.setProperty('display',old.value,old.priority);else node.style.removeProperty('display');}savedHudStyle.clear();}
 };
 const label=el('strong'),ramp=el('div','dj-pri-ramp'),ends=el('div','dj-pri-ends');
 ends.append(el('span','','저위험 (0~39)'),el('span','','주의 (40~69)'),el('span','','고위험 (70~100)'));
 const mapKey=el('div','dj-pri-map-key');const unknownKey=el('span','dj-pri-key-unknown','미평가'),boundaryKey=el('span','dj-pri-key-boundary','상도1동 경계'),candidateKey=el('span','dj-pri-key-candidate','조사 후보(미평가)');candidateKey.hidden=true;mapKey.append(unknownKey,boundaryKey,candidateKey);
 const coverage=el('small'),dismiss=button('끄기',()=>activate(null));
 const detailToggle=button('평가 기준 보기',()=>{const expanded=detailToggle.getAttribute('aria-expanded')!=='true';detailToggle.setAttribute('aria-expanded',String(expanded));detailBody.setAttribute('aria-hidden',String(!expanded));});
 detailToggle.classList.add('dj-pri-detail-toggle');detailToggle.setAttribute('aria-expanded','false');detailToggle.setAttribute('aria-controls','dj-pri-legend-detail-body');
 detailToggle.innerHTML='<span>평가 기준 보기</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
 const detailWrap=el('div','dj-pri-detail-wrap'),detailBody=el('div','dj-pri-detail-body');detailBody.id='dj-pri-legend-detail-body';detailBody.setAttribute('aria-hidden','true');const modelNote=el('small','dj-pri-model-note','미평가·미선정 도로는 회색으로 표시하고 임시 100점은 어떠한 평균에도 사용하지 않습니다.');detailBody.append(coverage,modelNote);detailWrap.append(detailBody);
 legend.append(label,dismiss,ramp,ends,mapKey,detailToggle,detailWrap);app.append(legend);
 function acceptDataset(next){
  dataset=next;lookup=new Map(next.segments.map(s=>[s.id,s]));revision++;activate(null);render();
  if(pendingRestore){const requested=pendingRestore;pendingRestore=null;activate(requested);}
 }
 function setDataset(raw){acceptDataset(parseImport(raw,dataset));}
 function render(){
   actions.replaceChildren();exportButton.disabled=!dataset;focusArea.disabled=!dataset?.segments?.length;
   if(!dataset){status.textContent='등록된 자료가 없습니다. JSON 자료를 불러와 주세요.';return;}
   const available=new Set();for(const s of dataset.segments)for(const f of dataset.factors)if(observedFactorScore(s,f.id)!==null)available.add(f.id);const summary=summarize(dataset,'pri');status.textContent=dataset.area+' · '+dataset.segments.length.toLocaleString('ko-KR')+'개 조사 구간 · 자료 '+available.size+'/'+dataset.factors.length+'종 · 원본 조사연장 '+(summary.totalM/1000).toFixed(2)+' km (공식 도로 총연장 아님) · 좌표 선형 '+(summary.geometryM/1000).toFixed(2)+' km'+(speedSource?.features?.length?' · 제한속도 링크 '+speedSource.features.length+'개(별도 도로망)':'');
   // Two added rubrics have NO submitted per-road observations; only real
   // scores enter the observed-only mean. Never invent safe zeros.
   const options=[['current6','종합 보행 취약도 · 6개 지표'],...dataset.factors.filter(f=>CURRENT_SIX_FACTORS.includes(f.id)&&f.id!=='speed').map(f=>[f.id,f.label]),['speed','제한속도 위험도 · 상도1동 표준노드링크']];
   const choice=(id,name)=>{
     const eligible=id==='sharedRoad'?Boolean(sharedCandidates?.scores?.length)||available.has(id):id==='protectionGap'?Boolean(policyScope):id==='speed'?Boolean(speedSource?.features?.length):id==='current6'?dataset.segments.some(s=>currentSixFactorCoverage(s)>=2):id==='current4'?dataset.segments.some(s=>currentFourFactorCoverage(s)>=2):id==='current3'?dataset.segments.some(s=>currentVulnerabilityCoverage(s)>=2):available.has(id);
     const suffix=!eligible?' · 미평가':id==='sharedRoad'?' · 조사 후보 및 평가':id==='speed'?' · 0·40·80·100점':id==='current6'?' · 6개 동일 가중치·결측 제외':id==='current4'?' · 유효자료만 동일 가중치':id==='current3'?' · 동일 가중치':id==='protectionGap'?' · 2지표·300m':id==='lighting'?' · 조명 자료':'';
     const item=button(name+suffix,()=>{activate(id);dialog.close();});
     // Criteria-only new factors may be opened to inspect grey (unassessed)
     // roads; this must never look like an observed risk score.
     item.disabled=!eligible&&!['crossing','sharedRoad'].includes(id);item.setAttribute('aria-pressed',String(mode===id));
     return item;
   };
   for(const [id,name] of options)actions.append(choice(id,id==='protectionGap'?'제도적 사각지대':name));
   const awaiting=dataset.factors.filter(f=>CURRENT_SIX_FACTORS.includes(f.id)&&!available.has(f.id));
   if(awaiting.length)actions.append(el('small','dj-pri-awaiting','6개 평가기준 등록 완료 · 구간별 미평가 자료는 평균에서 제외 · '+awaiting.map(f=>f.label).join('·')+' 등 관측이 없는 지수는 회색으로 표시합니다.'));
 }
 async function loadDefault(){
  if(fetchStarted)return;fetchStarted=true;const before=revision;
  try{
   const r=await win.fetch('/data/pri/manifest.json',{cache:'no-cache'});if(!r.ok)return;
   const manifest=await r.json();
   const isPriPath=p=>typeof p==='string'&&/^\/data\/pri\/[a-zA-Z0-9_.-]+\.json$/.test(p);
   if(!isPriPath(manifest.bundle))return;
   try{const candidate=await win.fetch('/data/pri/sangdo1_shared_road_candidates_20261125.json',{cache:'no-cache'});if(candidate.ok)sharedCandidates=await candidate.json();}catch(error){console.warn('[PRI] shared-road candidate layer unavailable',error);}
   const response=await win.fetch(manifest.bundle,{cache:'no-cache'});if(!response.ok)throw Error('서버 자료를 불러오지 못했습니다.');
   let next=parseImport(await response.json(),dataset);
   const failed=[];
   for(const patchPath of Array.isArray(manifest.patches)?manifest.patches:[]){
    if(!isPriPath(patchPath)){failed.push('잘못된 추가 파일 경로');continue;}
    try{const p=await win.fetch(patchPath,{cache:'no-cache'});if(!p.ok)throw Error('HTTP '+p.status);next=parseImport(await p.json(),next);}
    catch(error){failed.push(patchPath);console.warn('[PRI] factor patch skipped',patchPath,error);}
   }
   try{
    const scoped=await win.fetch(POLICY_SCOPE_URL,{cache:'no-store'});
    if(!scoped.ok)throw Error('HTTP '+scoped.status);
    const geo=await scoped.json();
    scopedPolicyFeatures(geo);
    policyScope=geo;
    try{schoolReview=buildSanghyeonMiddleSchoolReview(geo);}catch(error){schoolReview=null;failed.push('상현중학교 검토 범위');console.warn('[PRI] school review unavailable',error);}
   }catch(error){policyScope=null;schoolReview=null;failed.push('상도1동 경계 내 보호 공백 선형');console.warn('[PRI] restricted policy geometry unavailable',error);}
   try{const response=await win.fetch('/data/protection-zone/boundary_reference.geojson',{cache:'no-cache'});if(!response.ok)throw Error('HTTP '+response.status);const geo=await response.json();const features=geo.features?.filter(f=>String(f.properties?.emdcd)==='1159053000'&&['Polygon','MultiPolygon'].includes(f.geometry?.type));if(!features?.length)throw Error('상도1동 행정경계 자료 없음');priBoundary={type:'FeatureCollection',features};}catch(error){priBoundary=null;failed.push('상도1동 행정경계');console.warn('[PRI] boundary unavailable',error);}
   try{
    const response=await win.fetch('/data/protection-zone/sangdo1_22_clipped_official_catchment_audit_20261122.json',{cache:'no-cache'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const official=await response.json();
    if(official.schema!=='sangdo1_22_boundary_exact_school_catchment_audit_v1'||official.rows?.length!==22||official.score_change_required!==0||new Set(official.rows.map(x=>x.segment_id)).size!==22)
     throw Error('22개 공식 통학구역 검증 자료 불일치');
    boundaryAudit=new Map(official.rows.map(x=>[x.segment_id,x]));
   }catch(error){boundaryAudit=null;console.warn('[PRI] official boundary catchment audit unavailable',error);}
   try{
    const response=await win.fetch(SPEED_RISK_SOURCE,{cache:'no-cache'});
    if(!response.ok)throw Error('HTTP '+response.status);
    speedSource=validateSpeedRiskSource(await response.json());
    const metadataResponse=await win.fetch(SPEED_RISK_METADATA,{cache:'no-cache'});
    speedMetadata=metadataResponse.ok?await metadataResponse.json():null;
   }catch(error){speedSource=null;speedMetadata=null;failed.push('제한속도 표준노드링크');console.warn('[PRI] speed source unavailable',error);}
   if(speedSource){
    try{const matched=spatialMatchSpeedFactor(next,speedSource);next=parseImport(matched.patch,next);speedMatchStats=matched.stats;}
    catch(error){speedMatchStats=null;failed.push('제한속도 공통망 기하 정합');console.warn('[PRI] speed crosswalk unavailable; scores remain unknown',error);}
   }
   if(revision===before){acceptDataset(next);if(failed.length)status.textContent+=' · 일부 추가 지표를 불러오지 못했습니다.';}
  }catch(e){if(revision===before)status.textContent='서버 PRI 자료를 불러오지 못했습니다. JSON 자료를 직접 불러올 수 있습니다.';}
 }
 toggle.addEventListener('click',()=>{render();resetDialogView();syncDockClearance();if(!dialog.open)dialog.showModal();alignPriDockSurface(dialog);win.requestAnimationFrame?.(alignPriDockSurfaces);app.dataset.djPriDialog='true';syncPriHud(true);void loadDefault();});
 dialog.addEventListener('close',()=>{delete app.dataset.djPriDialog;resetDialogView();syncPriHud(Boolean(mode));});
 file.addEventListener('change',async()=>{const f=file.files?.[0];file.value='';if(!f)return;try{if(f.size>20*1024*1024)throw Error('자료는 20MB 이하로 나누어 주세요.');setDataset(JSON.parse(await f.text()));}catch(e){status.textContent='가져오기 실패: '+String(e?.message||e);}});
 function draw(){
  // isStyleLoaded() also becomes false while tiles are loading. That is not
  // evidence that the MapLibre style cannot accept a new GeoJSON layer.
  try{
   if(!Array.isArray(map.getStyle?.()?.layers))return false;
   if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:display});
   if(priBoundary){
    if(!map.getSource(BOUNDARY_SOURCE))map.addSource(BOUNDARY_SOURCE,{type:'geojson',data:priBoundary});
    for(const [id,color,width] of [[BOUNDARY_CASING,'#FFFFFF',4.5],[BOUNDARY_LINE,BOUNDARY_COLOR,2.5]])if(!map.getLayer(id))map.addLayer({id,source:BOUNDARY_SOURCE,type:'line',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':color,'line-width':width,'line-opacity':.95}},map.getLayer(LINE)?LINE:priOverlayAnchor(map.getStyle()?.layers));
    for(const id of [BOUNDARY_CASING,BOUNDARY_LINE])map.setLayoutProperty(id,'visibility',mode?'visible':'none');
   }
   if(!map.getLayer(UNKNOWN_CASING))map.addLayer({id:UNKNOWN_CASING,source:SOURCE,type:'line',minzoom:11.5,filter:['all',['==',['geometry-type'],'LineString'],['!', ['get','evaluated']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#F7F8FA','line-opacity':.9,'line-width':['interpolate',['linear'],['zoom'],11.5,3.2,13,4.0,15,5.3,17,6.8,19,8.2]}},map.getLayer(LINE)?LINE:priOverlayAnchor(map.getStyle()?.layers));
   // First-symbol insertion was too low: later district/building fills could
   // cover every PRI road. Insert AFTER all opaque layers but BEFORE map pins.
   if(!map.getLayer(LINE))map.addLayer({id:LINE,source:SOURCE,type:'line',minzoom:11.5,
    filter:['==',['geometry-type'],'LineString'],layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':colors,'line-opacity':['case',['get','evaluated'],.88,.95],'line-width':['interpolate',['linear'],['zoom'],11.5,1,13,1.5,15,2.35,17,3.6,19,5.2]}},
    priOverlayAnchor(map.getStyle()?.layers));
   if(!map.getLayer(POINT))map.addLayer({id:POINT,source:SOURCE,type:'circle',minzoom:16,
    filter:['==',['geometry-type'],'Point'],
    paint:{'circle-radius':3,'circle-opacity':.8,'circle-color':colors,'circle-stroke-color':'#34434d','circle-stroke-width':.8}},
    priOverlayAnchor(map.getStyle()?.layers));
   // Separate native speed links from grey, unjoined PRI reference roads.
   // The score belongs to the verified link ID, NEVER to a nearby 25m edge.
   if(!map.getLayer(SPEED_LINE))map.addLayer({id:SPEED_LINE,source:SOURCE,type:'line',minzoom:11.5,
    filter:['==',['get','speedSource'],'observed-link'],
    layout:{'line-cap':'round','line-join':'round','visibility':'none'},
    paint:{'line-color':colors,'line-opacity':.95,
     'line-width':['interpolate',['linear'],['zoom'],11.5,1.4,13,2.4,15,3.8,17,5.7,19,7.8]}},
    priOverlayAnchor(map.getStyle()?.layers));
   if(!map.getLayer(CANDIDATE_LINE))map.addLayer({id:CANDIDATE_LINE,source:SOURCE,type:'line',minzoom:11.5,filter:['==',['get','sharedCandidate'],true],layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':CANDIDATE_COLOR,'line-opacity':1,'line-dasharray':[2,1.4],'line-width':['interpolate',['linear'],['zoom'],11.5,2,13,2.8,15,3.7,17,5,19,6.4]}},priOverlayAnchor(map.getStyle()?.layers));
   // Reposition layers if a late building/district overlay was appended above
   // them, including when the basemap changes its style without a full reset.
   for(const id of [BOUNDARY_CASING,BOUNDARY_LINE,UNKNOWN_CASING,LINE,POINT,SPEED_LINE,CANDIDATE_LINE]){
    if(map.getLayer(id)&&priCoveredByMapLayer(map.getStyle()?.layers,id)){
     map.moveLayer(id,priOverlayAnchor(map.getStyle()?.layers));
    }
   }
   const activeColors=mode==='protectionGap'?protectionGapColors:colors;
   map.setLayoutProperty(SPEED_LINE,'visibility',mode==='speed'?'visible':'none');
   map.setLayoutProperty(UNKNOWN_CASING,'visibility',mode?'visible':'none');
   map.setLayoutProperty(CANDIDATE_LINE,'visibility',mode==='sharedRoad'?'visible':'none');
   map.setFilter(LINE,mode==='sharedRoad'?['all',['==',['geometry-type'],'LineString'],['!=',['get','sharedCandidate'],true]]:['==',['geometry-type'],'LineString']);
   map.setPaintProperty(LINE,'line-color',activeColors);
   map.setPaintProperty(POINT,'circle-color',activeColors);
   map.setPaintProperty(LINE,'line-opacity',mode==='speed'?['case',['get','evaluated'],.28,.95]:['case',['get','evaluated'],.88,.95]);
   map.setPaintProperty(LINE,'line-width',['interpolate',['linear'],['zoom'],11.5,['case',['get','evaluated'],1,1.8],13,['case',['get','evaluated'],1.5,2.4],15,['case',['get','evaluated'],2.35,3.4],17,['case',['get','evaluated'],3.6,4.8],19,['case',['get','evaluated'],5.2,6.2]]);
   map.getSource(SOURCE).setData(display);
   return true;
  }catch(error){console.warn('[PRI] map layer unavailable; will retry on style update',error);return false;}
 }
 function activate(id){
  // Existing devices may still have the deleted preview mode in local storage.
  if(id==='pri12'||id==='pri'||id==='current3'||id==='current4')id='current6';
  if(id==='sharedCandidate')id='sharedRoad';
  if(id==='middleReview')id='protectionGap';
  if(id&&(!dataset||(id==='protectionGap'?!policyScope:id==='speed'?!speedSource?.features?.length:id==='current6'?!dataset.segments.some(s=>currentSixFactorCoverage(s)>=2):id==='current4'?!dataset.segments.some(s=>currentFourFactorCoverage(s)>=2):id==='current3'?!dataset.segments.some(s=>currentVulnerabilityCoverage(s)>=2):!dataset.factors.some(f=>f.id===id))))return;
  mode=id;syncDockClearance();if(id){app.dataset.djPriVisible='true';app.dataset.djPriMode=id;}
  else{delete app.dataset.djPriVisible;delete app.dataset.djPriMode;}
  doc.documentElement.dataset.djPriActive=id?'true':'false';syncPriHud(Boolean(id));popup?.remove();popup=null;
  if(id==='sharedRoad'){
   const ids=new Set((sharedCandidates?.networkVersion===dataset.networkVersion?(sharedCandidates.scores||[]):[]).map(s=>s.id));
   const source=policyScope?scopedCompositeFeatures(policyScope,new Map(dataset.segments.map(s=>[s.id,riskValue(observedFactorScore(s,'sharedRoad'))]))):displayRisk(displayFeatures(dataset,'sharedRoad'));
   display={...source,features:source.features.map(f=>({...f,properties:{...f.properties,sharedCandidate:!f.properties.evaluated&&ids.has(f.properties.segmentId)}}))};
  }else display=id?(id==='speed'?speedRiskDisplay(speedSource,policyScope?scopedPolicyFeatures(policyScope).features:[]):id==='protectionGap'?(policyScope?scopedPolicyFeatures(policyScope):EMPTY):id==='current6'?(policyScope?scopedCompositeFeatures(policyScope,new Map(dataset.segments.map(s=>[s.id,riskValue(segmentScore(dataset,s,'current6'))]))):EMPTY):id==='current4'?(policyScope?scopedCompositeFeatures(policyScope,new Map(dataset.segments.map(s=>[s.id,riskValue(segmentScore(dataset,s,'current4'))]))):EMPTY):id==='current3'?(policyScope?scopedCompositeFeatures(policyScope,new Map(dataset.segments.map(s=>[s.id,riskValue(segmentScore(dataset,s,'current3'))]))):EMPTY):(['crossing','sharedRoad'].includes(id)&&policyScope?scopedCompositeFeatures(policyScope,new Map(dataset.segments.map(s=>[s.id,riskValue(segmentScore(dataset,s,id))]))):displayRisk(displayFeatures(dataset,id)))):EMPTY;
  if(id||map.getSource(SOURCE))draw();
  // Selecting a layer is not permission to replace the user's camera. Area
  // navigation belongs to the explicit button below, not every mode switch.
  toggle.setAttribute('aria-pressed',String(Boolean(id)));legend.hidden=!id;ramp.hidden=false;ends.hidden=false;candidateKey.hidden=id!=='sharedRoad';unknownKey.hidden=false;boundaryKey.hidden=!priBoundary;if(!id){detailToggle.setAttribute('aria-expanded','false');detailBody.setAttribute('aria-hidden','true');}
   if(id){label.textContent=id==='sharedRoad'?'보차혼용도로 위험도':id==='protectionGap'?'제도적 사각지대':id==='speed'?'제한속도 위험도 · 표준노드링크':id==='current6'?'종합 보행 취약도 · 6개 항목':id==='current4'?'종합 보행 취약도 · 4개 항목':id==='current3'?'종합 보행 취약도 · 3개 자료':id==='pri'?'종합 PRI':id==='pri12'?'PRI 위험점수 · 야간+사고 평균':id==='lighting'?'야간 시야 위험점수 (추정)':id==='accidents'?'사고다발지 위험점수 (미선정 회색)':dataset.factors.find(f=>f.id===id).label;const s=id==='speed'?{geometryM:0,pointCount:0}:summarize(dataset,id);coverage.textContent=id==='sharedRoad'?display.features.filter(f=>f.properties.evaluated).length+'개 평가 · '+display.features.filter(f=>f.properties.sharedCandidate).length+'개 조사 후보(미평가) · 나머지 회색 미평가 · 미확인 점수는 종합 PRI 제외':id==='current6'?'6개 지수 동일 가중치 · 실제로 평가된 자료만 평균한 부분평가 · 상도1동 '+display.features.filter(f=>f.properties.evaluated).length+'개 평가 표시 · 회색 '+display.features.filter(f=>!f.properties.evaluated).length+'개 · 횡단보도 접근성 추정 포함 · 보차혼용 분류 미확인 제외':id==='speed'?'상도1동 표준노드링크 '+speedRiskCounts(speedSource.features).total+'개 · 30km/h 미만 '+speedRiskCounts(speedSource.features).observed[0]+' · 30km/h '+speedRiskCounts(speedSource.features).observed[40]+' · 40km/h '+speedRiskCounts(speedSource.features).observed[80]+' · 50km/h '+speedRiskCounts(speedSource.features).observed[100]+' · 공통 조사도로 미매칭 구간 회색':(id==='protectionGap'||id==='current3'||id==='current4')?(policyScope?'상도1동 '+policyScope.features.length+'개 구간 · 평가 '+display.features.filter(f=>f.properties.evaluated).length+'개 · 회색 미평가 '+display.features.filter(f=>!f.properties.evaluated).length+'개'+(id==='protectionGap'?' · 공식 SHP 경계 검증 '+(boundaryAudit?.size??'미확인')+'개 (기존 점수 유지) · 상현중학교 검토 '+(schoolReview?.metadata?.road_segments??0)+'개 구간 · 중학교 위험점수 NULL':id==='current4'?' · 제한속도 기하 매칭 '+(speedMatchStats?.observed??0)+'개/1,686개 (현장 미확인)':''):'경계 검증 자료를 불러오지 못해 표시하지 않습니다.'):'평가 도로 '+(s.observedM/1000).toFixed(2)+' / '+(s.totalM/1000).toFixed(2)+' km · '+'회색: 미평가·미선정 (평균 제외)';coverage.title=id==='current6'?'완전한 6개 지수 평균은 6/6 평가구간에만 성립합니다. 미평가 값을 0점이나 100점으로 가정하지 않으며 지도 색상은 현재 실제 관측값의 평균을 표시합니다. 구간을 누르면 평가 개수를 확인할 수 있습니다.':id==='current4'?'4개 항목은 동등 가중, 실제 유효한 값만 계산 · 제한속도 공통망 기하 정합 '+(speedMatchStats?.observed??0)+'개(잠정, 현장 미확인)':id==='speed'?'표준노드링크 자료 기준 '+(speedMetadata?.speed_record_updated??'미확인')+' · 조명 도로망에 위험점수 임의 매핑하지 않음':'원본 조사연장 기준 · 좌표 선형 '+(s.geometryM/1000).toFixed(2)+' km'+(s.pointCount?' · 점 구간 '+s.pointCount+'개':'');}
  ramp.style.background=id==='protectionGap'?'linear-gradient(90deg,#4C948B,#82AB94 25%,#DBC576 50%,#DDA263 75%,#CB6563)':'linear-gradient(90deg,#4C948B 0%,#4C948B 39.8%,#E0A04A 40%,#E0A04A 69.8%,#CF4248 70%,#CF4248 100%)';
  modelNote.textContent=id==='current6'?'6개 지표: 야간 조명·교통사고·제도적 사각지대·제한속도·횡단보도 접근성·보차혼용도로. 유효한 지표 2개 이상을 동일 가중 평균합니다. 횡단보도 접근성은 50/100m 연구용 추정이며 보차혼용도로는 분리 여부와 도로폭 기준으로 확인된 점수만 반영합니다. 미평가 제외, 6개 미만 부분평가.':id==='crossing'?'OSM 도로 위계 대리지표: 집산·국지 후보 50m, 간선 후보 100m. 39개 조사 후보의 접근권 외부 연장 비율 ×100. 좌표 불일치·경계 영향 및 비대상은 미평가. 실제 가시거리·횡단 안전·4항목 현장평가가 아닙니다.':id==='sharedRoad'?'신규 도로폭 기준: 확인된 혼용 4m 미만 100점, 4m 이상 6m 미만 70점, 6m 이상 30점. 물리적 분리 0점(폭 무관). 분류 또는 필요한 폭 미확인 NULL. 청회색 점선은 PDF 보차혼용·이면도로 조사 후보(미평가)입니다. 도로폭 추정 및 조건부 점수는 도로 상세정보에 표시하며 실제 보차 분리 여부 검증 전 PRI에서 제외합니다.':id==='speed'?'첨부된 제한속도 위험도 기준: 30km/h 미만 0점, 30km/h 40점, 40km/h 80점, 50km/h 100점. 속도수치가 없거나 표에 없는 제한속도는 NULL(미평가)입니다. 표준노드링크 최고제한속도 수집값(2025-05-12 기준)이며 현장 지정·최신 표지와 다를 수 있습니다. 이는 법정 위험등급이나 실제 사고 확률이 아닌 잠재적 충돌 피해 심각성의 상대점수입니다. 206개 링크는 공통 25m 조사망과 대응 검증 전이므로 기존 3지표 종합·길찾기 점수에 포함하지 않습니다.':id==='current4'?'4개 평가항목은 야간 조명·교통사고·제도적 사각지대·제한속도입니다. 상도1동 기준 기하 정합된 제한속도 공통 조사구간 '+(speedMatchStats?.observed??0)+'개만 네 번째 지표로 반영합니다. 같은 항목 가중치는 1이며 유효 관측 2개 이상을 동일하게 평균합니다(점수별 유효 지표 수는 상세정보 표시). 미정합 도로는 제한속도 NULL로 남고 0점이나 안전 100점을 만들지 않습니다. 센터라인 기하 정합은 현장·법정속도 검증이 아닙니다. 높은 점수=취약, 빨간색입니다.':id==='current3'?'상도1동 참고 행정경계 내부 도로에서 현재 확인된 3개 지표(야간 조명·교통사고·제도적 사각지대)를 동일 가중치로 평균합니다. 미평가 지표를 0점이나 100점으로 대체하지 않으며 유효 지표가 2개 이상인 구간만 표시합니다. 실제 사고다발지 미선정은 안전 판정이 아닙니다. 점수가 높을수록 취약하며 빨간색입니다.':id==='protectionGap'?'제도적 사각지대: 상도1동 참고 행정경계 내부 도로만 표시하고, 경계와 교차하는 보호시설 9곳의 300m 거리와 동일 초등학교 학구도를 결합(적용 가능 시 각 50%)한 연구용 위험점수. 높을수록 공백이 크며 빨간색으로 표시합니다. 경계 교차 22개 구간은 2026-09-20 공식 학구 원본의 절단 도로 재교차를 별도로 검증했고 기존 위험점수가 변하지 않았습니다. 원본 점수와 보호구역 여부는 그대로 유지합니다. 상현중학교 300m 검토 여부는 도로 상세정보에서 확인합니다. 지도는 기존 보호 공백 점수의 색상과 회색 미평가 기준을 그대로 사용합니다. 중학교 관련 점수는 미산정(NULL)이며 기존 점수와 종합 PRI에 추가하지 않습니다. 동작고는 제외합니다. 도로폭은 제외합니다. 회색은 평가 대상 밖이며 현행 3개 자료 종합에서는 유효한 조사값만 평균합니다. 실제 통학로·법적 지정 필요성은 미확인입니다.':'위험점수가 높을수록 취약 신호가 큽니다(빨간색). 미선정·미평가 구간은 회색으로 표시하고 임시 모델값은 평균에서 제외합니다.';
  render();
  if(id){alignPriDockSurface(legend);win.requestAnimationFrame?.(alignPriDockSurfaces);}
 }
 function inspect(e){
  if(!mode||app.dataset.tab!=='map'||dialog.open||!map.getLayer(LINE))return;
  const candidates=map.queryRenderedFeatures([[e.point.x-4,e.point.y-4],[e.point.x+4,e.point.y+4]],{layers:[SPEED_LINE,CANDIDATE_LINE,LINE,POINT].filter(l=>map.getLayer(l))});
  const selected=candidates[0];
  if(mode==='speed'){
   if(!selected)return;
   const properties=selected.properties||{};
   const node=el('div','dj-pri-detail');
   if(properties.speedSource==='observed-link'){
    const speed=Number(properties.speed),score=speedLimitRiskScore(speed);
    node.append(el('strong','','제한속도 위험도 · 표준노드링크'),
     el('b','',score===null?'미평가':score.toFixed(0)+' / 100점'),
     el('p','','수집된 최고제한속도 '+speed+'km/h · 링크 ID '+properties.linkId),
     el('small','','경계 내 링크 연장 약 '+Number(properties.lengthM).toFixed(1)+'m · 갱신일 '+(properties.updated||'미확인')),
     el('small','','PDF 상대평가 기준: 30km/h 미만 0점, 30km/h 40점, 40km/h 80점, 50km/h 100점. 이 도로링크 속성은 최신 현장 제한속도·교통안전시설 지정 고시와 다를 수 있습니다.'));
   }else{
    node.append(el('strong','','제한속도 위험도 · 공통 조사도로'),
     el('b','','미평가 (NULL)'),
     el('p','',(properties.name||'이름 없는 도로')+' · 공통 조사구간 '+(properties.segmentId||'미확인')),
     el('small','','속도 표준노드링크와 이 조사 도로구간의 1:1 공간대응이 검증되지 않아 점수를 임의로 배정하지 않았습니다. 회색은 저위험 판정이 아닙니다.'));
   }
   node.append(el('small','','점수가 높을수록 잠재적 충돌 피해 심각성이 큰 상대평가입니다. 실제 사고 발생 가능성이나 법정 위험등급이 아닙니다.'));
   popup?.remove();popup=new maplibregl.Popup({closeButton:true,className:'dj-pri-map-popup',maxWidth:'284px'}).setLngLat(e.lngLat).setDOMContent(node).addTo(map);alignPriDockSurface(popup.getElement?.());return;
  }
  const s=lookup.get(selected?.properties?.segmentId);if(!s)return;
  if(mode==='sharedRoad'&&selected?.properties?.sharedCandidate===true){const row=sharedCandidates?.scores?.find(r=>r.id===s.id);const node=el('div','dj-pri-detail');node.append(el('strong','',s.name||'이름 없는 도로'),el('b','','보차혼용·이면도로 후보 · 미평가'),el('p','',row?.evidence?.note||'팀 PDF 표시구간'),el('small','','보차 분리 여부 미확인 · 종합 PRI 및 경로 평가 제외'));popup?.remove();popup=new maplibregl.Popup({closeButton:true,className:'dj-pri-map-popup',maxWidth:'278px'}).setLngLat(e.lngLat).setDOMContent(node).addTo(map);alignPriDockSurface(popup.getElement?.());return;}
  const v=riskValue(segmentScore(dataset,s,mode)),node=el('div','dj-pri-detail');const modeled=mode==='accidents'&&s.evidence?.accidents?.modeled===true;node.append(el('strong','',s.name||'이름 없는 도로'),el('b','',modeled?'미선정 · 미평가':v===null?'미평가':v.toFixed(0)+' / 100점'),el('p','',s.id+' · 원본 조사연장 약 '+s.lengthM.toFixed(1)+'m'));
  const fs=mode==='current6'?dataset.factors.filter(f=>CURRENT_SIX_FACTORS.includes(f.id)):mode==='current4'?dataset.factors.filter(f=>CURRENT_FOUR_FACTORS.includes(f.id)):mode==='current3'?dataset.factors.filter(f=>CURRENT_VULNERABILITY_FACTORS.includes(f.id)):mode==='pri'?dataset.factors.filter(f=>Object.hasOwn(dataset.config.weights,f.id)):mode==='pri12'?dataset.factors.filter(f=>['lighting','accidents'].includes(f.id)):dataset.factors.filter(f=>f.id===mode);
  for(const f of fs){const val=s.scores[f.id],ev=s.evidence[f.id];node.append(el('p','',f.label+' 위험점수: '+(observedFactorScore(s,f.id)!==null?riskValue(val)+'점':'미평가')+(ev?.darkM!==null&&ev?.darkM!==undefined?' · 평균 암부 '+ev.darkM+'m':'')+(ev?.sourceGrade?' · 원본 위험 '+ev.sourceGrade+'등급':'')+(ev?.note?' · '+ev.note:'')),el('small','',f.source+' · '+f.method));}
  if(mode==='protectionGap'&&schoolReview?.features?.some(f=>f.properties.segment_id===s.id)){const reviewBox=el('section','dj-pri-official-audit');reviewBox.append(el('strong','','상현중학교 300m 검토'),el('p','','중학교 관련 보호 공백 점수: 미산정 (NULL)'),el('small','','학교 대표점 기준 공간검토 범위이며 공식 보호구역·실제 통학로가 아닙니다. 기존 초등학교·노인시설 점수는 유지하며 중학교 점수는 종합 PRI에 추가하지 않습니다.'));node.append(reviewBox);}
  if(s.geometry.type==='Point')node.append(el('small','','선형 좌표 부족: 점으로만 표시'));
  if((mode==='protectionGap'||mode==='current3'||mode==='current4')&&boundaryAudit?.has(s.id)){
   const audit=boundaryAudit.get(s.id),names=audit.official_catchments.map(x=>x.catchment).join(' · ')||'해당 학구 중첩 없음';
   const auditBox=el('section','dj-pri-official-audit');
   auditBox.append(el('strong','','공식 SHP 경계 도로 검증'));
   auditBox.append(el('small','','2026-09-20 초등학교 학구 · '+names));
   auditBox.append(el('p','','절단 도로 학구 중첩 '+Number(audit.official_catchment_covered_pct).toFixed(1)+'% · 기존 보호 공백 점수 변동 없음'));
   auditBox.append(el('small','','공식 학구는 실제 통학 경로 또는 법정 보호구역 지정 여부를 뜻하지 않습니다.'));
   node.append(auditBox);
  }
  if(mode==='current6')node.append(el('small','','종합 PRI 6개 항목 중 실제 평가 '+currentSixFactorCoverage(s)+'/6 · '+(currentSixFactorCoverage(s)===6?'완전평가':'부분평가')+' · 누락된 자료는 평균에서 제외 · 고위험 빨강'));
  if(mode==='current4')node.append(el('small','','4개 항목 중 실제 유효 지표 '+currentFourFactorCoverage(s)+'/4 · 결측은 평균에서 제외 · 제한속도 공간 정합 잠정'));
  if(mode==='current3')node.append(el('small','',`유효 지표 ${currentVulnerabilityCoverage(s)}/3 · 미평가 지표는 평균에서 제외`));
   node.append(el('small','','높을수록 상대적으로 큰 취약 신호이며 빨간색으로 표현되는 연구용 위험점수입니다. 미선정·미평가 구간은 회색이며, 내부 임시점수는 표시 및 평균에서 제외됩니다.'));
  popup?.remove();popup=new maplibregl.Popup({closeButton:true,className:'dj-pri-map-popup',maxWidth:'278px'}).setLngLat(e.lngLat).setDOMContent(node).addTo(map);alignPriDockSurface(popup.getElement?.());
 }
 let recoveryQueued=false;
 function recoverLayer(){
  if(!mode)return;
  const layers=map.getStyle?.()?.layers;
  if(map.getSource(SOURCE)&&map.getLayer(LINE)&&map.getLayer(POINT)&&map.getLayer(UNKNOWN_CASING)&&map.getLayer(CANDIDATE_LINE)
   &&(!priBoundary||(map.getSource(BOUNDARY_SOURCE)&&map.getLayer(BOUNDARY_CASING)&&map.getLayer(BOUNDARY_LINE)&&!priCoveredByMapLayer(layers,BOUNDARY_CASING)&&!priCoveredByMapLayer(layers,BOUNDARY_LINE)))
   &&!priCoveredByMapLayer(layers,UNKNOWN_CASING)&&!priCoveredByMapLayer(layers,CANDIDATE_LINE)
   &&(!['speed'].includes(mode)||map.getLayer(SPEED_LINE))
   &&!priCoveredByMapLayer(layers,LINE)&&!priCoveredByMapLayer(layers,POINT)
   &&(mode!=='speed'||!priCoveredByMapLayer(layers,SPEED_LINE)))return;
  if(recoveryQueued)return;
  recoveryQueued=true;
  win.setTimeout(()=>{recoveryQueued=false;if(mode)draw();},0);
 }
 map.on('style.load',()=>{if(mode)draw();});
 map.on('load',()=>{if(mode)draw();});
 map.on('styledata',recoverLayer);
 map.on('idle',recoverLayer);
 map.on('click',inspect);
 render();
 // Restore this layer only after the exact existing dataset has loaded.
 // Never force a camera move or re-open a modal during native iOS repaint.
 if(pendingRestore)void loadDefault();
}
