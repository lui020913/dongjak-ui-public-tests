import {parseImport,segmentScore,observedFactorScore,displayFeatures,summarize,PALETTE} from './pri-data.mjs';
import {priOverlayAnchor,priCoveredByMapLayer} from './pri-map-layer-order.mjs';
import './pri-map.css';
const SOURCE='dj-pri-segments',LINE='dj-pri-line',POINT='dj-pri-point';
const EMPTY={type:'FeatureCollection',features:[]};
const colors=['case',['get','evaluated'],['interpolate',['linear'],['get','displayScore'],...PALETTE.flat()], '#9ba4aa'];
const protectionGapColors=['case',['get','evaluated'],['interpolate',['linear'],['get','displayScore'],0,'#CB6563',25,'#DDA263',50,'#DBC576',75,'#82AB94',100,'#4C948B'],'#8D969F'];
export function installPriMap({map,maplibregl,app,doc=document,win=window,restoreMode=null}){
 if(doc.getElementById('dj-pri-toggle'))return;
 const el=(tag,cls,txt)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const button=(label,fn)=>{const n=el('button','dj-pri-button',label);n.type='button';n.addEventListener('click',fn);return n;};
 let dataset=null,mode=null,display=EMPTY,fetchStarted=false,revision=0,popup=null,lookup=new Map();
 let pendingRestore=typeof restoreMode==='string'&&/^[a-zA-Z][a-zA-Z0-9_.-]{0,40}$/.test(restoreMode)?restoreMode:null;
 const toggle=el('button');toggle.type='button';toggle.id='dj-pri-toggle';toggle.hidden=true;toggle.setAttribute('aria-pressed','false');app.append(toggle);
 const dialog=el('dialog','dj-pri-dialog');dialog.id='dj-pri-dialog';dialog.setAttribute('aria-label','보행 취약도 평가자료');
 const head=el('header','dj-pri-head'),title=el('h2','','보행 취약도');const close=button('닫기',()=>dialog.close());head.append(title,close);
 const intro=el('p','','상도1동 보행 취약도 평가점수 · 0점은 가장 취약, 100점은 상대적으로 양호. 각 지표의 점수는 사고 발생 확률이나 법적 지정 누락의 확정값이 아닙니다.');
 const status=el('p','dj-pri-status','등록된 자료가 없습니다.');status.setAttribute('role','status');
 const actions=el('div','dj-pri-actions');
 const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.id='dj-pri-file';
 const upload=button('JSON 자료 불러오기',()=>file.click());const clear=button('지도 색상 끄기',()=>{activate(null);dialog.close();});
 const focusArea=button('분석 지역으로 이동',()=>{
  if(!dataset?.segments?.length)return;
  const bounds=new maplibregl.LngLatBounds();
  for(const seg of dataset.segments){
   const points=seg.geometry.type==='Point'?[seg.geometry.coordinates]:seg.geometry.coordinates;
   for(const point of points)bounds.extend(point);
  }
  if(!bounds.isEmpty())map.fitBounds(bounds,{padding:{top:155,bottom:140,left:26,right:26},maxZoom:16,duration:450});
  dialog.close();
 });
 const exportButton=button('공통 도로망 JSON 내보내기',()=>{if(!dataset)return;const url=URL.createObjectURL(new Blob([JSON.stringify(dataset,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='pri-network.json';a.click();win.setTimeout(()=>URL.revokeObjectURL(url),1000);});
 const local=el('small','','직접 불러온 자료는 현재 페이지에서만 사용되며 서버에 전송하지 않습니다.');
 const dataTools=el('details','dj-pri-data-tools');dataTools.append(el('summary','','데이터 관리 (현재 기기)'),upload,exportButton,file,local);dialog.append(head,intro,status,actions,focusArea,clear,dataTools);doc.body.append(dialog);
 const legend=el('aside','dj-pri-legend');legend.id='dj-pri-legend';legend.hidden=true;
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
 ends.append(el('span','','매우 취약'),el('span','','취약'),el('span','','보통'),el('span','','양호'),el('span','','안전'));
 const coverage=el('small'),dismiss=button('끄기',()=>activate(null));
 const detailToggle=button('평가 기준 보기',()=>{const expanded=detailToggle.getAttribute('aria-expanded')!=='true';detailToggle.setAttribute('aria-expanded',String(expanded));detailBody.setAttribute('aria-hidden',String(!expanded));});
 detailToggle.classList.add('dj-pri-detail-toggle');detailToggle.setAttribute('aria-expanded','false');detailToggle.setAttribute('aria-controls','dj-pri-legend-detail-body');
 detailToggle.innerHTML='<span>평가 기준 보기</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
 const detailWrap=el('div','dj-pri-detail-wrap'),detailBody=el('div','dj-pri-detail-body');detailBody.id='dj-pri-legend-detail-body';detailBody.setAttribute('aria-hidden','true');const modelNote=el('small','dj-pri-model-note','미평가·미선정 도로는 회색으로 표시하고 임시 100점은 어떠한 평균에도 사용하지 않습니다.');detailBody.append(coverage,modelNote);detailWrap.append(detailBody);
 legend.append(label,dismiss,ramp,ends,detailToggle,detailWrap);app.append(legend);
 function acceptDataset(next){
  dataset=next;lookup=new Map(next.segments.map(s=>[s.id,s]));revision++;activate(null);render();
  if(pendingRestore){const requested=pendingRestore;pendingRestore=null;activate(requested);}
 }
 function setDataset(raw){acceptDataset(parseImport(raw,dataset));}
 function render(){
   actions.replaceChildren();exportButton.disabled=!dataset;focusArea.disabled=!dataset?.segments?.length;
   if(!dataset){status.textContent='등록된 자료가 없습니다. JSON 자료를 불러와 주세요.';return;}
   const available=new Set();for(const s of dataset.segments)for(const f of dataset.factors)if(observedFactorScore(s,f.id)!==null)available.add(f.id);const summary=summarize(dataset,'pri');status.textContent=dataset.area+' · '+dataset.segments.length.toLocaleString('ko-KR')+'개 조사 구간 · 자료 '+available.size+'/'+dataset.factors.length+'종 · 원본 조사연장 '+(summary.totalM/1000).toFixed(2)+' km (공식 도로 총연장 아님) · 좌표 선형 '+(summary.geometryM/1000).toFixed(2)+' km';
   const options=dataset.factors.map(f=>[f.id,f.label]);options.unshift(['pri12','PRI ①·② 평균 (시범)']);options.unshift(['pri','종합 PRI']);
   for(const [id,name] of options){
     const hasBoth=id==='pri12'&&dataset.segments.some(s=>segmentScore(dataset,s,'pri12')!==null);
     const unavailable=id==='pri'?dataset.config.status!=='approved':id==='pri12'?!hasBoth:!available.has(id);
     const suffix=id==='pri'&&unavailable?' · 기준 미확정':id==='pri12'?(unavailable?' · 두 지수 결측':' · 실측·조사값만'):unavailable?' · 미제출':id==='protectionGap'?' · 3자료·300m':id==='lighting'?' · 조명만':'';
     const b=button(name+suffix,()=>{activate(id);dialog.close();});
     b.disabled=unavailable;b.setAttribute('aria-pressed',String(mode===id));actions.append(b);
   }
 }
 async function loadDefault(){
  if(fetchStarted)return;fetchStarted=true;const before=revision;
  try{
   const r=await win.fetch('/data/pri/manifest.json',{cache:'no-cache'});if(!r.ok)return;
   const manifest=await r.json();
   const isPriPath=p=>typeof p==='string'&&/^\/data\/pri\/[a-zA-Z0-9_.-]+\.json$/.test(p);
   if(!isPriPath(manifest.bundle))return;
   const response=await win.fetch(manifest.bundle,{cache:'no-cache'});if(!response.ok)throw Error('서버 자료를 불러오지 못했습니다.');
   let next=parseImport(await response.json(),dataset);
   const failed=[];
   for(const patchPath of Array.isArray(manifest.patches)?manifest.patches:[]){
    if(!isPriPath(patchPath)){failed.push('잘못된 추가 파일 경로');continue;}
    try{const p=await win.fetch(patchPath,{cache:'no-cache'});if(!p.ok)throw Error('HTTP '+p.status);next=parseImport(await p.json(),next);}
    catch(error){failed.push(patchPath);console.warn('[PRI] factor patch skipped',patchPath,error);}
   }
   if(revision===before){acceptDataset(next);if(failed.length)status.textContent+=' · 일부 추가 지표를 불러오지 못했습니다.';}
  }catch(e){if(revision===before)status.textContent='서버 PRI 자료를 불러오지 못했습니다. JSON 자료를 직접 불러올 수 있습니다.';}
 }
 toggle.addEventListener('click',()=>{render();if(!dialog.open)dialog.showModal();app.dataset.djPriDialog='true';void loadDefault();});
 dialog.addEventListener('close',()=>{delete app.dataset.djPriDialog;});
 file.addEventListener('change',async()=>{const f=file.files?.[0];file.value='';if(!f)return;try{if(f.size>20*1024*1024)throw Error('자료는 20MB 이하로 나누어 주세요.');setDataset(JSON.parse(await f.text()));}catch(e){status.textContent='가져오기 실패: '+String(e?.message||e);}});
 function draw(){
  // isStyleLoaded() also becomes false while tiles are loading. That is not
  // evidence that the MapLibre style cannot accept a new GeoJSON layer.
  try{
   if(!Array.isArray(map.getStyle?.()?.layers))return false;
   if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:display});
   // First-symbol insertion was too low: later district/building fills could
   // cover every PRI road. Insert AFTER all opaque layers but BEFORE map pins.
   if(!map.getLayer(LINE))map.addLayer({id:LINE,source:SOURCE,type:'line',minzoom:11.5,
    filter:['==',['geometry-type'],'LineString'],layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':colors,'line-opacity':['case',['get','evaluated'],.72,.27],'line-width':['interpolate',['linear'],['zoom'],11.5,.7,13,1.1,15,1.8,17,2.8,19,4.1]}},
    priOverlayAnchor(map.getStyle()?.layers));
   if(!map.getLayer(POINT))map.addLayer({id:POINT,source:SOURCE,type:'circle',minzoom:16,
    filter:['==',['geometry-type'],'Point'],
    paint:{'circle-radius':3,'circle-opacity':.8,'circle-color':colors,'circle-stroke-color':'#34434d','circle-stroke-width':.8}},
    priOverlayAnchor(map.getStyle()?.layers));
   // Reposition layers if a late building/district overlay was appended above
   // them, including when the basemap changes its style without a full reset.
   for(const id of [LINE,POINT]){
    if(priCoveredByMapLayer(map.getStyle()?.layers,id)){
     map.moveLayer(id,priOverlayAnchor(map.getStyle()?.layers));
    }
   }
   const activeColors=mode==='protectionGap'?protectionGapColors:colors;
   map.setPaintProperty(LINE,'line-color',activeColors);
   map.setPaintProperty(POINT,'circle-color',activeColors);
   map.getSource(SOURCE).setData(display);
   return true;
  }catch(error){console.warn('[PRI] map layer unavailable; will retry on style update',error);return false;}
 }
 function activate(id){
  if(id&&(!dataset||(id==='pri'?dataset.config.status!=='approved':id==='pri12'?!dataset.segments.some(s=>segmentScore(dataset,s,'pri12')!==null):!dataset.factors.some(f=>f.id===id))))return;
  mode=id;if(id){app.dataset.djPriVisible='true';app.dataset.djPriMode=id;}
  else{delete app.dataset.djPriVisible;delete app.dataset.djPriMode;}
  doc.documentElement.dataset.djPriActive=id?'true':'false';syncPriHud(Boolean(id));popup?.remove();popup=null;display=id?displayFeatures(dataset,id):EMPTY;
  if(id||map.getSource(SOURCE))draw();
  // Selecting a layer is not permission to replace the user's camera. Area
  // navigation belongs to the explicit button below, not every mode switch.
  toggle.setAttribute('aria-pressed',String(Boolean(id)));legend.hidden=!id;if(!id){detailToggle.setAttribute('aria-expanded','false');detailBody.setAttribute('aria-hidden','true');}
   if(id){label.textContent=id==='pri'?'종합 PRI':id==='pri12'?'보행 취약도 · 야간+사고 평균':id==='lighting'?'야간 시야 평가점수 (추정)':id==='accidents'?'사고다발지 평가점수 (미선정 회색)':dataset.factors.find(f=>f.id===id).label;const s=summarize(dataset,id);coverage.textContent='평가 도로 '+(s.observedM/1000).toFixed(2)+' / '+(s.totalM/1000).toFixed(2)+' km · '+'회색: 미평가·미선정 (평균 제외)';coverage.title='원본 조사연장 기준 · 좌표 선형 '+(s.geometryM/1000).toFixed(2)+' km'+(s.pointCount?' · 점 구간 '+s.pointCount+'개':'');}
  ramp.style.background=id==='protectionGap'?'linear-gradient(90deg,#CB6563,#DDA263 25%,#DBC576 50%,#82AB94 75%,#4C948B)':'linear-gradient(90deg,#d74648,#ed9045 25%,#efd05a 50%,#9bc777 75%,#279b80)';
  modelNote.textContent=id==='protectionGap'?'제도적 보호 공백: 시설 기준 300m 범위에서 기존 보호구역 공간관계와 동일 초등학교 학구도 지표를 각각 50% 반영합니다(학구도 비적용 구간은 유효한 공간관계 지표만 사용). 도로폭은 평가에 사용하지 않습니다. 회색은 평가 대상 밖이며 종합평가에서는 나머지 5개 지표만 평균합니다. 실제 통학 경로나 법적 지정 누락을 확정하는 자료는 아닙니다.':'미선정 구간과 미평가 지표는 회색으로 표시합니다. 과거 데이터의 임시 100점은 화면과 평균에서 제외합니다.';
  render();
 }
 function inspect(e){
  if(!mode||app.dataset.tab!=='map'||dialog.open||!map.getLayer(LINE))return;
  const candidates=map.queryRenderedFeatures([[e.point.x-4,e.point.y-4],[e.point.x+4,e.point.y+4]],{layers:[LINE,POINT].filter(l=>map.getLayer(l))});
  const s=lookup.get(candidates[0]?.properties?.segmentId);if(!s)return;
  const v=segmentScore(dataset,s,mode),node=el('div','dj-pri-detail');const modeled=mode==='accidents'&&s.evidence?.accidents?.modeled===true;node.append(el('strong','',s.name||'이름 없는 도로'),el('b','',modeled?'미선정 · 미평가':v===null?'미평가':v.toFixed(0)+' / 100점'),el('p','',s.id+' · 원본 조사연장 약 '+s.lengthM.toFixed(1)+'m'));
  const fs=mode==='pri'?dataset.factors.filter(f=>Object.hasOwn(dataset.config.weights,f.id)):mode==='pri12'?dataset.factors.filter(f=>['lighting','accidents'].includes(f.id)):dataset.factors.filter(f=>f.id===mode);
  for(const f of fs){const val=s.scores[f.id],ev=s.evidence[f.id];node.append(el('p','',f.label+': '+(observedFactorScore(s,f.id)!==null?val+'점':'미평가')+(ev?.darkM!==null&&ev?.darkM!==undefined?' · 평균 암부 '+ev.darkM+'m':'')+(ev?.sourceGrade?' · 원본 위험 '+ev.sourceGrade+'등급':'')+(ev?.note?' · '+ev.note:'')),el('small','',f.source+' · '+f.method));}
  if(s.geometry.type==='Point')node.append(el('small','','선형 좌표 부족: 점으로만 표시'));
  node.append(el('small','','높을수록 상대적으로 안전한 방향의 연구용 점수입니다. 미선정·미평가 구간은 회색이며, 내부 임시점수는 표시 및 평균에서 제외됩니다.'));
  popup?.remove();popup=new maplibregl.Popup({closeButton:true,maxWidth:'278px'}).setLngLat(e.lngLat).setDOMContent(node).addTo(map);
 }
 let recoveryQueued=false;
 function recoverLayer(){
  if(!mode)return;
  const layers=map.getStyle?.()?.layers;
  if(map.getSource(SOURCE)&&map.getLayer(LINE)&&map.getLayer(POINT)
   &&!priCoveredByMapLayer(layers,LINE)&&!priCoveredByMapLayer(layers,POINT))return;
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
