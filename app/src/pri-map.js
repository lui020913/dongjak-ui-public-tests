import {parseImport,segmentScore,displayFeatures,summarize,PALETTE} from './pri-data.mjs';
import './pri-map.css';
const SOURCE='dj-pri-segments',LINE='dj-pri-line',POINT='dj-pri-point';
const EMPTY={type:'FeatureCollection',features:[]};
const colors=['case',['get','evaluated'],['interpolate',['linear'],['get','displayScore'],...PALETTE.flat()], '#9ba4aa'];
export function installPriMap({map,maplibregl,app,doc=document,win=window}){
 if(doc.getElementById('dj-pri-toggle'))return;
 const el=(tag,cls,txt)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const button=(label,fn)=>{const n=el('button','dj-pri-button',label);n.type='button';n.addEventListener('click',fn);return n;};
 let dataset=null,mode=null,display=EMPTY,fetchStarted=false,revision=0,popup=null,lookup=new Map();
 const toggle=el('button');toggle.type='button';toggle.id='dj-pri-toggle';toggle.hidden=true;toggle.setAttribute('aria-pressed','false');app.append(toggle);
 const dialog=el('dialog','dj-pri-dialog');dialog.id='dj-pri-dialog';dialog.setAttribute('aria-label','보행 취약도 데이터');
 const head=el('header','dj-pri-head'),title=el('h2','','보행 취약도');const close=button('닫기',()=>dialog.close());head.append(title,close);
 const intro=el('p','','잠재적 보행안전 취약성 · 0~100점, 높을수록 취약. 사고 발생 확률이 아닙니다.');
 const status=el('p','dj-pri-status','등록된 자료가 없습니다.');status.setAttribute('role','status');
 const actions=el('div','dj-pri-actions');
 const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.id='dj-pri-file';
 const upload=button('JSON 자료 불러오기',()=>file.click());const clear=button('지도 색상 끄기',()=>{activate(null);dialog.close();});
 const exportButton=button('공통 도로망 JSON 내보내기',()=>{if(!dataset)return;const url=URL.createObjectURL(new Blob([JSON.stringify(dataset,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='pri-network.json';a.click();win.setTimeout(()=>URL.revokeObjectURL(url),1000);});
 const local=el('small','','직접 불러온 자료는 현재 페이지에서만 사용되며 서버에 전송하지 않습니다.');
 const dataTools=el('details','dj-pri-data-tools');dataTools.append(el('summary','','데이터 관리 (현재 기기)'),upload,exportButton,file,local);dialog.append(head,intro,status,actions,clear,dataTools);doc.body.append(dialog);
 const legend=el('aside','dj-pri-legend');legend.id='dj-pri-legend';legend.hidden=true;
 const label=el('strong'),ramp=el('div','dj-pri-ramp'),ends=el('div','dj-pri-ends');ends.append(el('span','','0 · 낮음'),el('span','','100 · 높음'));
 const coverage=el('small'),dismiss=button('끄기',()=>activate(null));legend.append(label,dismiss,ramp,ends,coverage);app.append(legend);
 function setDataset(raw){const next=parseImport(raw,dataset);dataset=next;lookup=new Map(next.segments.map(s=>[s.id,s]));revision++;activate(null);render();}
 function render(){
   actions.replaceChildren();exportButton.disabled=!dataset;
   if(!dataset){status.textContent='등록된 자료가 없습니다. JSON 자료를 불러와 주세요.';return;}
   const available=new Set();for(const s of dataset.segments)for(const f of dataset.factors)if(typeof s.scores[f.id]==='number')available.add(f.id);const summary=summarize(dataset,'pri');status.textContent=dataset.area+' · '+dataset.segments.length.toLocaleString('ko-KR')+'개 조사 구간 · 자료 '+available.size+'/'+dataset.factors.length+'종 · 원본 조사연장 '+(summary.totalM/1000).toFixed(2)+' km (공식 도로 총연장 아님) · 좌표 선형 '+(summary.geometryM/1000).toFixed(2)+' km';
   const options=dataset.factors.map(f=>[f.id,f.label]);options.unshift(['pri','종합 PRI']);
   for(const [id,name] of options){
     const unavailable=id==='pri'?dataset.config.status!=='approved':!available.has(id);const suffix=id==='pri'&&unavailable?' · 기준 미확정':unavailable?' · 미제출':id==='lighting'?' · 조명만':'';
     const b=button(name+suffix,()=>{activate(id);dialog.close();});
     b.disabled=unavailable;b.setAttribute('aria-pressed',String(mode===id));actions.append(b);
   }
 }
 async function loadDefault(){
  if(fetchStarted)return;fetchStarted=true;const before=revision;
  try{const r=await win.fetch('/data/pri/manifest.json',{cache:'no-cache'});if(!r.ok)return;const manifest=await r.json();if(typeof manifest.bundle!=='string'||!/^\/data\/pri\/[a-zA-Z0-9_.-]+\.json$/.test(manifest.bundle))return;const response=await win.fetch(manifest.bundle,{cache:'no-cache'});if(!response.ok)throw Error('서버 자료를 불러오지 못했습니다.');const raw=await response.json();if(revision===before)setDataset(raw);}catch(e){if(revision===before)status.textContent='서버 PRI 자료를 불러오지 못했습니다. JSON 자료를 직접 불러올 수 있습니다.';}
 }
 toggle.addEventListener('click',()=>{render();if(!dialog.open)dialog.showModal();void loadDefault();});
 file.addEventListener('change',async()=>{const f=file.files?.[0];file.value='';if(!f)return;try{if(f.size>20*1024*1024)throw Error('자료는 20MB 이하로 나누어 주세요.');setDataset(JSON.parse(await f.text()));}catch(e){status.textContent='가져오기 실패: '+String(e?.message||e);}});
 function draw(){
  if(!map.isStyleLoaded?.()&&!map.getSource(SOURCE))return;
  try{
   if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:display});
   if(!map.getLayer(LINE)){
    // Keep street names readable: insert below the first symbol layer.
    const before=map.getStyle()?.layers?.find(l=>l.type==='symbol')?.id;
    map.addLayer({id:LINE,source:SOURCE,type:'line',minzoom:12,filter:['==',['geometry-type'],'LineString'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':colors,'line-opacity':.96,'line-width':['interpolate',['linear'],['zoom'],12,1.5,15,3.6,18,7,19,10]}},before);
   }
   if(!map.getLayer(POINT))map.addLayer({id:POINT,source:SOURCE,type:'circle',minzoom:17,filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':3,'circle-color':colors,'circle-stroke-color':'#fff','circle-stroke-width':1}});
   map.getSource(SOURCE).setData(display);
  }catch(e){console.warn('[PRI] map layer unavailable',e);}
 }
 function activate(id){
  if(id&&(!dataset||(id==='pri'?dataset.config.status!=='approved':!dataset.factors.some(f=>f.id===id))))return;
  mode=id;popup?.remove();popup=null;display=id?displayFeatures(dataset,id):EMPTY;
  if(id||map.getSource(SOURCE))draw();
  if(id&&dataset.area.startsWith('상도1동')&&dataset.segments.length){const bounds=new maplibregl.LngLatBounds();for(const s of dataset.segments){const ps=s.geometry.type==='Point'?[s.geometry.coordinates]:s.geometry.coordinates;for(const p of ps)bounds.extend(p);}if(!bounds.isEmpty())map.fitBounds(bounds,{padding:{top:155,bottom:140,left:26,right:26},maxZoom:16,duration:450});}
  toggle.setAttribute('aria-pressed',String(Boolean(id)));legend.hidden=!id;
   if(id){label.textContent=id==='pri'?'종합 PRI':id==='lighting'?'야간 조명 취약도 (추정)':dataset.factors.find(f=>f.id===id).label;const s=summarize(dataset,id);coverage.textContent='평가 도로 '+(s.observedM/1000).toFixed(2)+' / '+(s.totalM/1000).toFixed(2)+' km · 회색: 미평가';coverage.title='원본 조사연장 기준 · 좌표 선형 '+(s.geometryM/1000).toFixed(2)+' km'+(s.pointCount?' · 점 구간 '+s.pointCount+'개':'');}
  render();
 }
 function inspect(e){
  if(!mode||app.dataset.tab!=='map'||dialog.open||!map.getLayer(LINE))return;
  const candidates=map.queryRenderedFeatures([[e.point.x-4,e.point.y-4],[e.point.x+4,e.point.y+4]],{layers:[LINE,POINT].filter(l=>map.getLayer(l))});
  const s=lookup.get(candidates[0]?.properties?.segmentId);if(!s)return;
  const v=segmentScore(dataset,s,mode),node=el('div','dj-pri-detail');node.append(el('strong','',s.name||'이름 없는 도로'),el('b','',v===null?'미평가':v.toFixed(0)+' / 100점'),el('p','',s.id+' · 원본 조사연장 약 '+s.lengthM.toFixed(1)+'m'));
  const fs=mode==='pri'?dataset.factors.filter(f=>Object.hasOwn(dataset.config.weights,f.id)):dataset.factors.filter(f=>f.id===mode);
  for(const f of fs){const val=s.scores[f.id],ev=s.evidence[f.id];node.append(el('p','',f.label+': '+(typeof val==='number'?val+'점':'미평가')+(ev?.darkM!==null&&ev?.darkM!==undefined?' · 평균 암부 '+ev.darkM+'m':'')+(ev?.sourceGrade?' · 원본 '+ev.sourceGrade+'등급':'')),el('small','',f.source+' · '+f.method));}
  if(s.geometry.type==='Point')node.append(el('small','','선형 좌표 부족: 점으로만 표시'));
  node.append(el('small','','추정 취약성 정보이며 실제 사고 위험 확률이 아닙니다.'));
  popup?.remove();popup=new maplibregl.Popup({closeButton:true,maxWidth:'278px'}).setLngLat(e.lngLat).setDOMContent(node).addTo(map);
 }
 map.on('style.load',()=>{if(mode)draw();});map.on('load',()=>{if(mode)draw();});map.on('click',inspect);render();
}
