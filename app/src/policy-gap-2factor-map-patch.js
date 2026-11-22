/**
 * Research-only MapLibre overlay for Sangdo1 institutional protection gaps.
 * Uses 300m GIS results combining 2025 police zone polygons & facility points,
 * 2026 elementary catchments, excluding road width. Never modifies PRI or routing.
 */
const URL='/data/protection-zone/sangdo1_policy_gap_2factor_300m_20261122.geojson';
const IDS={source:'pza2-data',casing:'pza2-casing',lines:'pza2-score-lines'};
const MODES={combined:['combined_new_score','combined_color','통합'],child:['child_new_score','child_color','어린이'],elderly:['elderly_new_score','elderly_color','노인']};
const STYLES=[
'#pza2-panel{display:grid;gap:9px;margin:9px 0;padding:13px;border:1px solid var(--dj-ui-border,#d6e3dc);border-radius:12px;background:var(--dj-ui-field,#f5faf7);color:var(--dj-ui-text,#244437);font-size:12px;line-height:1.5;min-width:0}',
'#pza2-panel strong{font-size:13px}#pza2-panel p{margin:0;font-size:11px;line-height:1.55;color:var(--dj-ui-subtext,#607970)}',
'#pza2-panel button{cursor:pointer;border-radius:9px;font-size:12px;font-weight:700}',
'#pza2-toggle{background:#245f53;color:white;padding:10px 12px;min-height:42px;border:0}',
'#pza2-toggle[aria-pressed=true]{background:#dcece2;color:#1a5446;border:1px solid #b4d3c1}',
'#pza2-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}',
'#pza2-modes button{min-width:0;min-height:36px;border:1px solid #cbdcd2;color:#244437;background:var(--dj-ui-bg,#fff)}',
'#pza2-modes button[aria-pressed=true]{background:#245f53;color:white}',
'#pza2-gradient{height:12px;border-radius:5px;background:linear-gradient(90deg,#D64550,#F18C4A 25%,#E5BC52 50%,#7EAF83 75%,#338D80)}',
'#pza2-ticks{display:flex;justify-content:space-between;font-size:10px}',
'#pza2-gray{display:flex;gap:6px;align-items:center;font-size:11px}#pza2-gray i{background:#A3AAB4;border-radius:2px;width:15px;height:10px;flex:none}',
'#pza2-status{font-size:11px;color:var(--dj-ui-subtext,#607970)}',
'.pza2-popup{font-family:inherit;font-size:12px;line-height:1.5;color:#263e38;max-width:280px}.pza2-popup h3{margin:0 0 6px;font-size:14px}',
'.pza2-popup dl{display:grid;grid-template-columns:95px minmax(0,1fr);gap:5px 7px;margin:7px 0}.pza2-popup dt{color:#607970}.pza2-popup dd{margin:0;font-weight:650;overflow-wrap:anywhere}',
'.pza2-popup p{font-size:11px;line-height:1.6;color:#5b7069;margin:9px 0 0}'
].join('');
const isNum=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const format=v=>isNum(v)?Number(v).toFixed(1)+'점':'NULL · 평가 제외';
/** Do not replace NULL with 100. Team's five other factors must all be present. */
export function policyGapTeamAverage(five,policy){
 if(!Array.isArray(five)||five.length!==5||!five.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100))
  throw new TypeError('다른 5개 지표는 모두 0~100점 숫자여야 합니다.');
 const has=policy!==null&&policy!==undefined&&policy!=='';
 if(has&&(!isNum(policy)||Number(policy)<0||Number(policy)>100))throw new RangeError('보호 공백 지표 점수 오류');
 const denominator=has?6:5;
 return {score:Math.round((five.reduce((s,n)=>s+n,0)+(has?Number(policy):0))/denominator*10)/10,indicatorCount:denominator};
}
export function verifyPolicyGapFeatures(geo){
 if(geo?.type!=='FeatureCollection'||geo.metadata?.radius_m!==300||geo.metadata?.schema!=='sangdo1_policy_gap_2factor_v1'||!Array.isArray(geo.features)||geo.features.length!==1676)
  throw new Error('300m 평가 GeoJSON의 기준 또는 도로 구간 수가 다릅니다.');
 const ids=new Set();
 for(const f of geo.features){
  const p=f.properties||{};
  if(!p.segment_id||ids.has(p.segment_id)||f.geometry?.type!=='LineString'||f.geometry?.coordinates?.length<2)
   throw new Error('중복 구간 ID 또는 유효하지 않은 선형');
  ids.add(p.segment_id);
  for(const [score,color] of Object.values(MODES)){
   if(!isNum(p[score])&&p[color]!=='#A3AAB4')throw new Error('NULL 구간 색상이 회색이 아닙니다.');
   if(isNum(p[score])&&(Number(p[score])<0||Number(p[score])>100))throw new Error('점수가 0~100 밖입니다.');
  }
  if(Number(p.team_average_divisor)!==(isNum(p.combined_new_score)?6:5))throw new Error('5/6개 평균 규칙 불일치');
 }
 return geo.features.length;
}
function popupNode(p,mode){
 const root=document.createElement('section');root.className='pza2-popup';
 const heading=document.createElement('h3');heading.textContent=(p.road_name||'이름 없는 도로')+' · '+(p.segment_id||'');root.append(heading);
 const dl=document.createElement('dl');
 const items=[['선택한 점수',format(p[MODES[mode][0]])],['어린이',format(p.child_new_score)],['노인',format(p.elderly_new_score)],
  ['통합 시범점수',format(p.combined_new_score)],['학구 적용',p.school_applied_child?'적용':'미적용'],
  ['학구도 교차',p.catchment_names||'해당 자료 없음'],['팀 종합평균',isNum(p.combined_new_score)?'6개 지표 평균':'나머지 5개 지표 평균']];
 for(const [label,value] of items){
  const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);
 }
 root.append(dl);
 const notice=document.createElement('p');notice.textContent='보호구역 지정 경계·시설점 거리와 동일 초등학교 통학구역을 50:50으로 결합한 연구용 점수입니다. 학구도 미적용·노인 구간은 거리점수만 사용합니다. 도로폭은 제외했습니다. 실제 통학로, 법적 미지정 또는 보행 위험 확정값이 아닙니다.';root.append(notice);
 return root;
}
function createPanel(){
 const parent=document.getElementById('walking-vulnerability-layer-controls');
 if(!parent)return null;
 let panel=document.getElementById('pza2-panel');if(panel)return panel;
 if(!document.getElementById('pza2-style')){
  const style=document.createElement('style');style.id='pza2-style';style.textContent=STYLES;document.head.append(style);
 }
 panel=document.createElement('section');panel.id='pza2-panel';panel.setAttribute('aria-label','보행 취약도 · 300m 제도적 보호 공백 연구지도');
 const header=document.createElement('strong');header.textContent='제도적 보호 공백 · 2지표 평가';
 const note=document.createElement('p');note.textContent='시설·지정 경계 + 공식 초등학교 학구도 · 300m 시범점수';
 const toggle=document.createElement('button');toggle.id='pza2-toggle';toggle.type='button';toggle.textContent='그라데이션 지도 표시';toggle.setAttribute('aria-pressed','false');
 const modes=document.createElement('div');modes.id='pza2-modes';modes.setAttribute('role','group');modes.setAttribute('aria-label','어린이 노인 통합 점수 선택');
 for(const [key,mode] of Object.entries(MODES)){const btn=document.createElement('button');btn.type='button';btn.dataset.pza2Mode=key;btn.textContent=mode[2];btn.setAttribute('aria-pressed',String(key==='combined'));modes.append(btn);}
 const gradient=document.createElement('div');gradient.id='pza2-gradient';gradient.setAttribute('aria-label','0점 빨강에서 100점 청록까지 연속 그라데이션');
 const ticks=document.createElement('div');ticks.id='pza2-ticks';
 for(const value of ['0','25','50','75','100']){const span=document.createElement('span');span.textContent=value;ticks.append(span);}
 const gray=document.createElement('div');gray.id='pza2-gray';
 const chip=document.createElement('i');chip.setAttribute('aria-hidden','true');gray.append(chip,document.createTextNode('NULL(회색): 300m 평가 범위 밖 · 팀 평균에서 제외'));
 const status=document.createElement('span');status.id='pza2-status';status.setAttribute('role','status');status.textContent='연구지도 꺼짐';
 const caution=document.createElement('p');caution.textContent='임시 가중치 50/50 (학구도 해당 도로에 한정) · 학구는 실제 통학로가 아닙니다. 길찾기·PRI 점수에는 적용하지 않습니다.';
 panel.append(header,note,toggle,modes,gradient,ticks,gray,status,caution);
 parent.append(panel);
 return panel;
}
export function installPolicyGapTwoFactorMap({map,maplibregl,app,nightMode,protectionOverlay}={}){
 if(!map||!maplibregl||!app)return null;
 const panel=createPanel();if(!panel)return null;
 const toggle=panel.querySelector('#pza2-toggle'),status=panel.querySelector('#pza2-status'),modes=panel.querySelector('#pza2-modes');
 if(toggle.dataset.installed==='1')return null;
 toggle.dataset.installed='1';
 let enabled=false,loading=false,destroyed=false,data=null,promise=null,mode='combined',popup=null,handlers=false,focused=false;
 const notice=text=>{status.textContent=text;};
 const blocked=()=>app.dataset.tab!=='map'||['route-picking','route-preview','route-guiding','adding'].some(name=>app.classList.contains(name));
 const shown=()=>enabled&&!blocked();
 const paint=()=>['coalesce',['get',MODES[mode][1]],'#A3AAB4'];
 function visible(){
  for(const id of [IDS.casing,IDS.lines])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',shown()?'visible':'none');
  if(!shown())popup?.remove?.();
 }
 function onClick(event){
  if(!shown()||!event.features?.length)return;
  popup?.remove?.();
  popup=new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'320px'})
   .setLngLat(event.lngLat).setDOMContent(popupNode(event.features[0].properties||{},mode)).addTo(map);
 }
 const onEnter=()=>{if(shown())map.getCanvas().style.cursor='pointer';};
 const onLeave=()=>{map.getCanvas().style.cursor='';};
 function ensure(){
  if(destroyed||!data||!map.isStyleLoaded?.())return false;
  if(!map.getSource(IDS.source))map.addSource(IDS.source,{type:'geojson',data});
  const order=map.getStyle()?.layers||[];
  const before=order.find(l=>['transport-bus-stop','transport-subway-station','transport-subway-glyph'].includes(l.id))?.id;
  if(!map.getLayer(IDS.casing))map.addLayer({id:IDS.casing,type:'line',source:IDS.source,minzoom:11.8,
   layout:{'line-cap':'round','line-join':'round',visibility:shown()?'visible':'none'},
   paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],12,3.5,17,9],'line-opacity':0.9}},before);
  if(!map.getLayer(IDS.lines))map.addLayer({id:IDS.lines,type:'line',source:IDS.source,minzoom:11.8,
   layout:{'line-cap':'round','line-join':'round',visibility:shown()?'visible':'none'},
   paint:{'line-color':paint(),'line-width':['interpolate',['linear'],['zoom'],12,2.1,17,6],'line-opacity':0.97}},before);
  if(!handlers){map.on('click',IDS.lines,onClick);map.on('mouseenter',IDS.lines,onEnter);map.on('mouseleave',IDS.lines,onLeave);handlers=true;}
  visible();return true;
 }
 async function load(){
  if(data)return data;
  if(!promise)promise=fetch(URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();})
    .then(geo=>{verifyPolicyGapFeatures(geo);data=geo;return data;})
    .catch(e=>{promise=null;throw e;});
  return promise;
 }
 function focus(){
  if(focused||!data)return;
  focused=true;
  const endPoints=data.features.flatMap(f=>[f.geometry.coordinates[0],f.geometry.coordinates[f.geometry.coordinates.length-1]]);
  const xs=endPoints.map(p=>p[0]),ys=endPoints.map(p=>p[1]);
  if(!xs.length)return;
  const mobile=window.matchMedia?.('(max-width:1079px)')?.matches===true;
  map.fitBounds([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]],
   {padding:mobile?{top:90,left:25,right:25,bottom:150}:70,maxZoom:15.5,duration:550});
 }
 function deactivate(){
  enabled=false;toggle.setAttribute('aria-pressed','false');toggle.textContent='그라데이션 지도 표시';visible();popup?.remove?.();popup=null;notice('연구지도 꺼짐');
 }
 async function activate(){
  if(destroyed||loading)return;
  if(enabled){deactivate();return;}
  loading=true;toggle.disabled=true;notice('연구 데이터를 불러오는 중입니다.');
  try{
   await load();
   if(destroyed)return;
   if(nightMode?.isEnabled?.())await nightMode.disable?.();
   protectionOverlay?.disable?.({restoreNight:false});
   enabled=true;toggle.setAttribute('aria-pressed','true');toggle.textContent='연구지도 표시 끄기';
   if(ensure()){focus();notice('1,676개 도로 선형 표시 · 회색은 이 지표 미평가');}
   else notice('지도 스타일 준비 중 · 자동 복구 대기');
  }catch(e){deactivate();notice('연구지도 실패: '+(e?.message||'데이터 오류'));}
  finally{loading=false;toggle.disabled=false;}
 }
 function selectMode(event){
  const button=event.target.closest('[data-pza2-mode]');if(!button)return;
  mode=button.dataset.pza2Mode;
  modes.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  if(map.getLayer(IDS.lines))map.setPaintProperty(IDS.lines,'line-color',paint());
  popup?.remove?.();popup=null;
  if(enabled)notice(MODES[mode][2]+' 점수 표시 · 해당 유형의 회색 도로는 미평가');
 }
 function recover(){
  if(!enabled||destroyed||!data)return;
  try{if(ensure()){focus();notice(MODES[mode][2]+' 연구점수 표시 중');}}
  catch(e){notice('지도 레이어 재연결 중: '+(e?.message||'스타일 확인 필요'));}
 }
 const idle=()=>{if(enabled&&!map.getLayer(IDS.lines))recover();};
 const observer=typeof MutationObserver!=='undefined'?new MutationObserver(visible):null;
 observer?.observe(app,{attributes:true,attributeFilter:['class','data-tab']});
 toggle.addEventListener('click',activate);modes.addEventListener('click',selectMode);
 map.on('style.load',recover);map.on('idle',idle);
 return {enable:activate,disable:deactivate,isEnabled:()=>enabled,destroy(){
  destroyed=true;observer?.disconnect();toggle.removeEventListener('click',activate);modes.removeEventListener('click',selectMode);
  map.off('style.load',recover);map.off('idle',idle);
  if(handlers){map.off('click',IDS.lines,onClick);map.off('mouseenter',IDS.lines,onEnter);map.off('mouseleave',IDS.lines,onLeave);}
  deactivate();for(const id of [IDS.lines,IDS.casing])if(map.getLayer(id))map.removeLayer(id);
  if(map.getSource(IDS.source))map.removeSource(IDS.source);
  delete toggle.dataset.installed;
 }};
}
