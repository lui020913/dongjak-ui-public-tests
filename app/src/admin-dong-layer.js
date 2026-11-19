// 행정동 경계: 통계청 SGIS 기반 admdongkor (2026-10-01, light GeoJSON).
// 법정동 경계가 아니며 원본 전체를 화면에 직접 그리지 않고 동작구만 필터링합니다.
export const ADMIN_DONG_DATE = '2026-10-01';
export const ADMIN_SGG_CODE = '11590';
export const EMPTY_COLLECTION = {type:'FeatureCollection',features:[]};

export function selectDongjakAdminFeatures(collection) {
  return (collection?.features || [])
    .filter(f => f?.geometry && (String(f.properties?.sggcd || '') === ADMIN_SGG_CODE ||
      (String(f.properties?.sggnm || '').includes('동작구') && String(f.properties?.sidonm || '').includes('서울'))))
    .map(f => ({...f,properties:{...f.properties,
      dong_id:String(f.properties?.emdcd || f.properties?.emd8 || f.properties?.emd7 || f.properties?.emdnm || ''),
      dong_name:String(f.properties?.emdnm || '이름 미확인')}}));
}
// Both the district selector and the night model must use the identical
// October 2026 administrative-dong polygons, never a lighting-point hull.
let districtAdminPromise = null;
export function getDongjakAdminFeatures(){
  if (!districtAdminPromise){
    districtAdminPromise=import('admdongkor').then(pkg=>pkg.get('20261001','emd'))
      .then(selectDongjakAdminFeatures)
      .then(features=>{if(features.length<10)throw new Error('동작구 행정동 경계 자료 부족');return features;})
      .catch(error=>{districtAdminPromise=null;throw error;});
  }
  return districtAdminPromise;
}
export async function getSangdo1Boundary(){
  const features=await getDongjakAdminFeatures();
  const match=features.find(f=>f.properties?.dong_name==='상도1동');
  if(!match?.geometry||!['Polygon','MultiPolygon'].includes(match.geometry.type))
    throw new Error('상도1동 공식 행정경계 미확인');
  return match.geometry;
}
export function geometryBounds(geometry) {
  if(!geometry || !['Polygon','MultiPolygon'].includes(geometry.type)) return null;
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  const visit=(v)=>{if(!Array.isArray(v))return;
    if(typeof v[0]==='number' && typeof v[1]==='number'){
      if(!Number.isFinite(v[0])||!Number.isFinite(v[1]))return;
      west=Math.min(west,v[0]);east=Math.max(east,v[0]);south=Math.min(south,v[1]);north=Math.max(north,v[1]);
    } else for(const t of v)visit(t);
  };
  visit(geometry.coordinates);
  return Number.isFinite(west)?[[west,south],[east,north]]:null;
}
function polygonCentroid(ring){
  if(!Array.isArray(ring)||ring.length<3)return null;
  let twice=0,x=0,y=0;
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length];
    if(!a||!b)continue;
    const k=a[0]*b[1]-b[0]*a[1];twice+=k;
    x+=(a[0]+b[0])*k;y+=(a[1]+b[1])*k;
  }
  if(Math.abs(twice)<1e-10)return null;
  return {center:[x/(3*twice),y/(3*twice)],area:Math.abs(twice)};
}
export function labelPointForFeature(feature){
  const geo=feature?.geometry;
  if(!geo)return null;
  const polygons=geo.type==='Polygon'?[geo.coordinates]:geo.type==='MultiPolygon'?geo.coordinates:[];
  const candidates=polygons.map(p=>polygonCentroid(p?.[0])).filter(Boolean).sort((a,b)=>b.area-a.area);
  return candidates[0]?.center || null;
}

export async function installAdminDongLayer({map, openButton, picker, onError=console.warn, loadData=null, onDistrictBoundary=null}) {
  if(!map || !openButton || !picker)return;
  const list=picker.querySelector('#admin-dong-list');
  const status=picker.querySelector('#admin-dong-status');
  const closeButton=picker.querySelector('#admin-dong-close');
  const clearButton=picker.querySelector('#admin-dong-clear');
  const boundaryLayers=['dongjak-admin-dong-boundaries','dongjak-admin-dong-labels'];
  function setBoundaryVisibility(visible){
    const state=visible?'visible':'none';
    for(const id of boundaryLayers) if(map.getLayer?.(id)) try{ map.setLayoutProperty(id,'visibility',state); }catch{}
  }
  closeButton?.addEventListener('click',()=>{const finish=()=>{picker.hidden=true;setBoundaryVisibility(false);};if(window.DongjakWindowMotion)window.DongjakWindowMotion.close(picker,finish);else finish();});
  openButton.addEventListener('click',()=>{picker.hidden=!picker.hidden; setBoundaryVisibility(!picker.hidden);});
  let features=[];
  const sourceId='dongjak-admin-dongs',labelSource='dongjak-admin-dong-labels';
  map.addSource(sourceId,{type:'geojson',data:EMPTY_COLLECTION});
  map.addSource(labelSource,{type:'geojson',data:EMPTY_COLLECTION});
  const topSymbol=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
  map.addLayer({id:'dongjak-admin-dong-boundaries',type:'line',source:sourceId,minzoom:12,
    layout:{visibility:'none'},
    paint:{'line-color':'rgba(34,112,100,0.46)','line-width':['interpolate',['linear'],['zoom'],12,0.55,16,1.15],
      'line-opacity':0.54}},topSymbol);
  map.addLayer({id:'dongjak-admin-dong-selected',type:'fill',source:sourceId,
    filter:['==',['get','dong_id'],'__none__'],
    paint:{'fill-color':'#11a78d','fill-opacity':0.13}},topSymbol);
  map.addLayer({id:'dongjak-admin-dong-selected-outline',type:'line',source:sourceId,
    filter:['==',['get','dong_id'],'__none__'],
    paint:{'line-color':'#007c68','line-width':3.4,'line-opacity':0.98}},topSymbol);
  map.addLayer({id:'dongjak-admin-dong-labels',type:'symbol',source:labelSource,minzoom:12.8,
    layout:{visibility:'none','text-field':['get','dong_name'],'text-size':['interpolate',['linear'],['zoom'],12.8,11,16,14],
      'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Regular'],
      'text-allow-overlap':false,'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport',
      'text-optional':false,'text-padding':5},
    paint:{'text-color':'#225e52','text-halo-color':'#ffffff','text-halo-width':2.6}},undefined);
  function clear(){
    for(const id of ['dongjak-admin-dong-selected','dongjak-admin-dong-selected-outline'])
      if(map.getLayer(id)) map.setFilter(id,['==',['get','dong_id'],'__none__']);
    list?.querySelectorAll('.admin-dong-choice').forEach(b=>b.setAttribute('aria-pressed','false'));
    const quick=document.getElementById('overview-admin-clear');if(quick)quick.hidden=true;
  }
  clearButton?.addEventListener('click',()=>{clear();picker.hidden=true;setBoundaryVisibility(false);});
  document.addEventListener('dongjak:map-home-reset',()=>{clear();picker.hidden=true;setBoundaryVisibility(false);});
  function choose(feature){
    const id=feature.properties.dong_id;
    for(const layer of ['dongjak-admin-dong-selected','dongjak-admin-dong-selected-outline'])
      if(map.getLayer(layer))map.setFilter(layer,['==',['get','dong_id'],id]);
    const bounds=geometryBounds(feature.geometry);
    if(bounds)map.fitBounds(bounds,{padding:{top:135,bottom:175,left:50,right:50},maxZoom:15.5,duration:800});
    list?.querySelectorAll('.admin-dong-choice').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.dongId===id?'true':'false'));
    const quick=document.getElementById('overview-admin-clear');if(quick)quick.hidden=false;
    picker.hidden=true;
    setBoundaryVisibility(false);
  }
  try{
    status.textContent='2026년 행정동 경계를 불러오는 중입니다…';
    features=loadData ? selectDongjakAdminFeatures(await loadData()) : await getDongjakAdminFeatures();
    // 시군구 경계까지 같은 SGIS-admdongkor 2026-10 자료로 갱신합니다.
    // 과거 외곽선(다른 출처)과 행정동 선이 엇갈리던 문제를 해소합니다.
    if(typeof onDistrictBoundary==='function'){
      try{
        const sgg=await (await import('admdongkor')).get('20261001','sgg');
        const matching=(sgg?.features||[]).filter(x=>{
          const pr=x.properties||{};
          return String(pr.sggcd||'')===ADMIN_SGG_CODE ||
            (String(pr.sggnm||'').includes('동작구')&&String(pr.sidonm||'').includes('서울'));
        });
        if(matching.length===1&&matching[0].geometry)
          onDistrictBoundary(matching[0]);
        else onError(new Error('같은 기준연도의 동작구 외곽 경계를 확인하지 못해 기존 경계를 유지합니다.'));
      }catch(error){onError(error);}
    }

    if(features.length<10)throw new Error(`동작구 행정동 데이터가 충분하지 않습니다 (${features.length}개)`);
    map.getSource(sourceId)?.setData({type:'FeatureCollection',features});
    const labels=features.map(f=>{
      const p=labelPointForFeature(f);
      return p?{type:'Feature',properties:f.properties,geometry:{type:'Point',coordinates:p}}:null;
    }).filter(Boolean);
    map.getSource(labelSource)?.setData({type:'FeatureCollection',features:labels});
    list.replaceChildren();
    for(const f of features.sort((a,b)=>a.properties.dong_name.localeCompare(b.properties.dong_name,'ko'))){
      const b=document.createElement('button');b.type='button';b.className='admin-dong-choice';
      b.textContent=f.properties.dong_name;b.dataset.dongId=f.properties.dong_id;b.setAttribute('aria-pressed','false');
      b.addEventListener('click',()=>choose(f));list.append(b);
    }
    setBoundaryVisibility(false);
    status.textContent=`${features.length}개 행정동 · ${ADMIN_DONG_DATE} 기준 · 선택하면 경계 강조`;
  }catch(error){
    status.textContent='행정동 경계 데이터를 불러오지 못했습니다. 인터넷 연결 후 새로고침해 주세요.';
    onError(error);
  }
}
