/** 상도1동 팀 분석: 기존 사고 38건을 재사용하고, 근접 권역 및 OSM 참고 경계만 강조합니다. */
export const TEAM_FOCUS_PATH='/data/safety/accidents/sangdo1_team_review.geojson';
export const TEAM_BOUNDARY_PATH='/data/safety/accidents/sangdo1_team_osm_reference_boundary.geojson';
export const TEAM_LAYER_IDS=Object.freeze({boundarySource:'dj-team-sangdo-boundary-source',boundaryLine:'dj-team-sangdo-boundary-line',areaSource:'dj-team-sangdo-area-source',areaFill:'dj-team-sangdo-area-fill',areaOutline:'dj-team-sangdo-area-outline'});

export function verifyTeamReview(focus,boundary){
  if(focus?.type!=='FeatureCollection'||focus.features?.length!==1)throw Error('팀 검토 권역 자료가 올바르지 않습니다.');
  const polygon=focus.features[0];
  if(!['Polygon','MultiPolygon'].includes(polygon?.geometry?.type))throw Error('검토 권역 면형이 없습니다.');
  const rows=polygon.properties?.records;
  if(!Array.isArray(rows)||rows.length!==3||new Set(rows.map(row=>row.source_fid)).size!==3)throw Error('연도별 선정기록이 올바르지 않습니다.');
  if(boundary?.type!=='FeatureCollection'||boundary.features?.length!==1||boundary.features[0]?.geometry?.type!=='Polygon')throw Error('OSM 참고 경계가 올바르지 않습니다.');
  return rows;
}

const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};

export function installSangdoAccidentTeamReview({map,ensureAccidentsVisible,onStatus=()=>{}}={}){
  const button=document.getElementById('dj-sangdo-team-toggle');
  const panel=document.getElementById('dj-sangdo-team-panel');
  const accidentButton=document.querySelector?.('button[data-dj-import="accidents"]');
  if(!map||!button||!panel||!accidentButton)return ()=>{};
  const ids=TEAM_LAYER_IDS;
  let active=false,loading=false,disposed=false,focus=null,boundary=null;
  const asSource=(key,data)=>{if(!map.getSource(key))map.addSource(key,{type:'geojson',data});else map.getSource(key)?.setData?.(data);};
  function addMapLayers(){
    if(!active||!map.getStyle?.()||!focus||!boundary)return;
    asSource(ids.boundarySource,boundary);
    asSource(ids.areaSource,focus);
    if(!map.getLayer(ids.boundaryLine))map.addLayer({id:ids.boundaryLine,type:'line',source:ids.boundarySource,paint:{'line-color':'#168b81','line-width':2.3,'line-opacity':.8,'line-dasharray':[2,2]}});
    if(!map.getLayer(ids.areaFill))map.addLayer({id:ids.areaFill,type:'fill',source:ids.areaSource,paint:{'fill-color':'#c75039','fill-opacity':.12}});
    if(!map.getLayer(ids.areaOutline))map.addLayer({id:ids.areaOutline,type:'line',source:ids.areaSource,paint:{'line-color':'#c75039','line-width':3,'line-opacity':.95}});
  }
  function removeMapLayers(){
    for(const id of [ids.areaOutline,ids.areaFill,ids.boundaryLine]){if(map.getLayer(id))map.removeLayer(id);}
    for(const id of [ids.areaSource,ids.boundarySource]){if(map.getSource(id))map.removeSource(id);}
  }
  function renderSummary(){
    if(!focus)return;
    const rows=focus.features[0].properties.records;
    panel.replaceChildren();
    const title=make('strong','dj-team-title','상도1동 사고다발 근접 권역');panel.append(title);
    panel.append(make('p','dj-team-context','경계 안 연도별 선정기록 3건 · 대표점 간 최대 약 79m · 기존 사고 마커 재사용'));
    const grid=make('div','dj-team-year-grid');
    for(const row of rows){
      const item=make('div','dj-team-year');
      item.append(make('b','',`${row.selection_year}년 선정`),make('span','',`${row.site_name.replace(/^서울(?:특별시)?\s*(?:동작구)?\s*/,'')} · 사고 ${row.accident_count}건 · 사망 ${row.death_count}명`));
      grid.append(item);
    }
    panel.append(grid);
    panel.append(make('p','dj-team-note','3건은 서로 가까운 연도별 선정기록입니다. 같은 사고의 중복 여부가 확인되지 않아 건수·사망자 수를 합산하지 않습니다. 기준연도는 개별 사고 발생연도가 아닙니다.'));
    const details=make('details','dj-team-reference');
    details.append(make('summary','','TAAS 동작구 전체 참고자료'),make('p','','첨부된 2023년 엑셀은 13행(주간 7·야간 6)입니다. “2024~2025” 파일도 동일한 2023년 자료이므로 해당 연도의 통계로 사용하지 않습니다. 좌표·동 주소가 없어 상도1동 사고 위치로 표시할 수 없습니다.'));
    panel.append(details);
    panel.append(make('small','dj-team-source','자료: 팀원 QGIS 검토 · 보행자 사고다발지역 선정기록 · 상도1동 OSM 참고 경계(공식 행정동 경계 아님). 현재 위험도 판정이 아닙니다.'));
  }
  const onStyleLoad=()=>{try{addMapLayers();}catch(e){console.warn('[상도1동 팀 검토 레이어 복원]',e);}};
  map.on('style.load',onStyleLoad);
  const sync=()=>{button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-expanded',String(active));panel.hidden=!active;};
  async function turnOn(){
    if(!focus||!boundary){
      const [a,b]=await Promise.all([fetch(TEAM_FOCUS_PATH),fetch(TEAM_BOUNDARY_PATH)]);
      if(!a.ok||!b.ok)throw Error('팀원 조사 데이터를 불러오지 못했습니다.');
      const [f,g]=await Promise.all([a.json(),b.json()]);verifyTeamReview(f,g);focus=f;boundary=g;
    }
    await ensureAccidentsVisible?.();
    if(disposed)return;
    active=true;sync();renderSummary();addMapLayers();
    const coords=focus.features[0].geometry.coordinates;
    const flat=focus.features[0].geometry.type==='Polygon'?coords[0]:coords.flatMap(poly=>poly[0]);
    const lng=flat.map(p=>p[0]),lat=flat.map(p=>p[1]);
    if(lng.length){map.fitBounds?.([[Math.min(...lng),Math.min(...lat)],[Math.max(...lng),Math.max(...lat)]],{padding:{top:84,bottom:140,left:66,right:66},maxZoom:16.8,duration:750});}
    onStatus('상도1동 사고다발 근접 권역 · 2022~2024년 선정기록 3건 · 합산하지 않음');
  }
  function turnOff(){active=false;sync();removeMapLayers();}
  const onClick=async()=>{
    if(loading)return;
    if(active){turnOff();return;}
    loading=true;button.disabled=true;
    try{await turnOn();}catch(error){turnOff();onStatus(`상도1동 조사자료 표시 실패: ${error.message||'자료 확인 필요'}`);}
    finally{loading=false;button.disabled=false;}
  };
  const observer=new MutationObserver(()=>{
    if(active&&accidentButton.getAttribute('aria-pressed')==='false')turnOff();
  });
  observer.observe(accidentButton,{attributes:true,attributeFilter:['aria-pressed']});
  button.addEventListener('click',onClick);
  sync();
  return ()=>{disposed=true;observer.disconnect();button.removeEventListener('click',onClick);map.off('style.load',onStyleLoad);turnOff();};
}
