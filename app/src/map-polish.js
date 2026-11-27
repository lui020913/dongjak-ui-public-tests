// v17.8 지도 시인성: 경계 밖 자치구 이름, 장식용 공원 수목, 축척·나침반.
// 정확한 수목 위치/수량 데이터가 아닙니다. 공원 폴리곤 범위 안에서 장식용으로 배치합니다.
import {queryOverpass, SAFETY_BBOX} from './safety-layers.js';
const empty=()=>({type:'FeatureCollection',features:[]});

function polygonRings(geometry){
  if(!geometry)return [];
  if(geometry.type==='Polygon')return [geometry.coordinates];
  if(geometry.type==='MultiPolygon')return geometry.coordinates;
  return [];
}
export function pointInsideRing(lng,lat,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if((yi>lat)!==(yj>lat) && lng<(xj-xi)*(lat-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
}
function pointInsidePolygon(lng,lat,rings){
  return Boolean(rings?.[0] && pointInsideRing(lng,lat,rings[0]) && !rings.slice(1).some(r=>pointInsideRing(lng,lat,r)));
}
function inGeometry(lng,lat,geometry){return polygonRings(geometry).some(r=>pointInsidePolygon(lng,lat,r));}
function ringBounds(ring){
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  for(const [lng,lat] of ring){west=Math.min(west,lng);east=Math.max(east,lng);south=Math.min(south,lat);north=Math.max(north,lat);}
  return {west,south,east,north};
}
function bestPointInside(rings){
  if(!rings?.length)return null;
  const outer=rings[0], b=ringBounds(outer);
  // polygon centroid can land outside concave polygon, so sample a small grid and use a valid interior point.
  const options=[];
  for(let i=1;i<=7;i++)for(let j=1;j<=7;j++){
    const lng=b.west+(b.east-b.west)*i/8;
    const lat=b.south+(b.north-b.south)*j/8;
    if(pointInsidePolygon(lng,lat,rings))options.push([lng,lat]);
  }
  if(!options.length)return outer[0];
  const middle=[(b.west+b.east)/2,(b.south+b.north)/2];
  options.sort((a,b)=>Math.hypot(a[0]-middle[0],a[1]-middle[1])-Math.hypot(b[0]-middle[0],b[1]-middle[1]));
  return options[0];
}
export function makeNeighborDistrictLabels(features,dongjakBounds){
  if(!Array.isArray(features)||!dongjakBounds)return empty();
  const results=new Map();
  const seoul=new Set(),gyeonggi=new Set();
  for(const f of features){
    const props=f?.properties||{};
    const full=String(props.SIG_KOR_NM||'').trim();
    const code=String(props.SIG_CD||props.SIG_COD||'');
    let name='';
    if(code.startsWith('11') && full.endsWith('구') && full!=='동작구'){
      name=full;seoul.add(name);
    }else if(code.startsWith('41')){
      // 경기도는 행정구 단위 대신 원래 도시명(시)으로 묶습니다.
      const city=full.match(/^(.+?시)(?:\s|$)/)?.[1];
      if(!city)continue;
      name=city;gyeonggi.add(name);
    }else continue;
    const polys=polygonRings(f.geometry);
    for(const rings of polys){
      if(!rings.length)continue;
      const point=bestPointInside(rings);
      if(!point)continue;
      const size=(ringBounds(rings[0]).east-ringBounds(rings[0]).west)*(ringBounds(rings[0]).north-ringBounds(rings[0]).south);
      const prev=results.get(name);
      if(!prev||size>prev.size)results.set(name,{name,point,size});
    }
  }
  return {type:'FeatureCollection',features:[...results.values()].map(x=>({type:'Feature',geometry:{type:'Point',coordinates:x.point},properties:{name:x.name}}))};
}
export function installNeighborDistrictLabels(map,features,dongjakBounds,isDongjak){
  const data=makeNeighborDistrictLabels(features,dongjakBounds);
  // If the chosen interior point happens to be inside Dongjak due to imprecise source geometry, omit it.
  data.features=data.features.filter(f=>isDongjak(...f.geometry.coordinates)!==true);
  map.addSource('neighbor-district-names',{type:'geojson',data});
  map.addLayer({id:'neighbor-district-names',type:'symbol',source:'neighbor-district-names',minzoom:10,maxzoom:20,
    layout:{'text-field':['get','name'],'text-size':['interpolate',['linear'],['zoom'],10,10.5,13,15],
      'text-font':['Noto Sans Bold','Open Sans Semibold','Open Sans Regular'],
      'text-allow-overlap':false,'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport','text-max-width':8},
    paint:{'text-color':'#687b80','text-halo-color':'#f4f6f5','text-halo-width':2.6,'text-opacity':0.92}});
  const app=typeof document==='undefined'?null:document.getElementById('app');
  const syncTheme=()=>{
    const dark=app?.dataset.theme==='dark';
    if(!map.getLayer?.('neighbor-district-names'))return;
    try{
      map.setPaintProperty('neighbor-district-names','text-color',dark?'#eff8f5':'#687b80');
      map.setPaintProperty('neighbor-district-names','text-halo-color',dark?'#102329':'#f4f6f5');
      map.setPaintProperty('neighbor-district-names','text-halo-width',dark?2.85:2.6);
    }catch(error){console.warn('[인접 자치구 명칭] 테마 갱신 생략',error?.message);}
  };
  if(app && typeof MutationObserver!=='undefined'){
    new MutationObserver(syncTheme).observe(app,{attributes:true,attributeFilter:['data-theme']});
  }
  syncTheme();
  return data.features.length;
}

function seedFrom(text){let n=2166136261;for(const x of String(text)){n=Math.imul(n^x.charCodeAt(0),16777619)>>>0;}return n>>>0;}
function seededNext(state){return (Math.imul(state,1664525)+1013904223)>>>0;}
function circlePolygon(lng,lat,radiusMeters){
  const latStep=radiusMeters/111320, lngStep=latStep/Math.max(0.2,Math.cos(lat*Math.PI/180));
  const ring=[];for(let k=0;k<=8;k++){const a=2*Math.PI*k/8;ring.push([lng+Math.cos(a)*lngStep,lat+Math.sin(a)*latStep]);}
  return {type:'Polygon',coordinates:[ring]};
}
function geomRings(item){
  if(!Array.isArray(item.geometry)||item.geometry.length<4)return null;
  const ring=item.geometry.map(p=>[Number(p.lon),Number(p.lat)]).filter(p=>p.every(Number.isFinite));
  if(ring.length<4)return null;
  if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])ring.push([...ring[0]]);
  return ring;
}
export function makeDecorativeTrees(elements,isInside=()=>true,maxTrees=320){
  const crowns=[],trunks=[];
  for(const item of elements||[]){
    if(crowns.length>=maxTrees)break;
    if(item.type!=='way')continue;
    const tags=item.tags||{};
    const green=tags.leisure==='park'||tags.landuse==='grass'||tags.landuse==='forest'||tags.natural==='wood'||tags.leisure==='garden';
    if(!green)continue;
    const ring=geomRings(item);if(!ring)continue;
    const b=ringBounds(ring),lat=(b.north+b.south)/2;
    const square=(b.east-b.west)*111320*Math.cos(lat*Math.PI/180)*(b.north-b.south)*111320;
    if(square<1500||square>3500000)continue;
    const count=Math.min(36,Math.max(2,Math.floor(square/2900)));
    let s=seedFrom(item.id),created=0;
    for(let j=0;j<count*12 && created<count && crowns.length<maxTrees;j++){
      s=seededNext(s);const rx=s/4294967296;
      s=seededNext(s);const ry=s/4294967296;
      const x=b.west+(b.east-b.west)*rx,y=b.south+(b.north-b.south)*ry;
      if(!pointInsideRing(x,y,ring)||isInside(x,y)!==true)continue;
      // Vegetation is visual approximation; geometry is not a survey of individual trees.
      const radius=2.1+(s%17)/10,height=4.4+(s%23)/10;
      const props={id:`${item.id}-${created}`,height,base:1.5,kind:'decorative'};
      trunks.push({type:'Feature',geometry:circlePolygon(x,y,0.46),properties:{...props,height:2.8,base:0}});
      crowns.push({type:'Feature',geometry:circlePolygon(x,y,radius),properties:props});
      created++;
    }
  }
  return {trunks:{type:'FeatureCollection',features:trunks},crowns:{type:'FeatureCollection',features:crowns}};
}
export function installDecorativeParkTrees({map,isDongjak}){
  const stems='dongjak-decorative-tree-stems',canopies='dongjak-decorative-tree-canopies';
  map.addSource(stems,{type:'geojson',data:empty()});
  map.addSource(canopies,{type:'geojson',data:empty()});
  const firstLabel=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
  for(const [id,source,color] of [['dongjak-tree-trunks',stems,'#8e8973'],['dongjak-tree-crowns',canopies,'#83b69a']]){
    map.addLayer({id,type:'fill-extrusion',source,minzoom:15.3,layout:{visibility:'none'},
      paint:{'fill-extrusion-color':color,'fill-extrusion-height':['get','height'],
      'fill-extrusion-base':['get','base'],'fill-extrusion-opacity':0.85}},firstLabel);
  }
  // At street-level zoom use small 2D canopies; at street-level 3D they become extrusions.
  map.addLayer({id:'dongjak-tree-symbols',type:'circle',source:canopies,minzoom:15.5,maxzoom:18.3,
    layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],15.5,2.2,17,3.3,18.3,4.1],
      'circle-color':'#68a17b','circle-stroke-color':'#e5f2de','circle-stroke-width':0.7,'circle-opacity':0.72}},firstLabel);
  let loaded=false,busy=false,lastAttempt=0;
  async function loadIfUseful(){
    const zoom=map.getZoom(), pitch=map.getPitch();
    // Do not cover wide-area parks with invented green dots.
    // Detailed, user-initiated zoom is required before decorative trees appear.
    const visible=zoom>=15.3 && pitch>=30;
    const flat=zoom>=15.5 && pitch<30;
    for(const id of ['dongjak-tree-trunks','dongjak-tree-crowns'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none');
    if(map.getLayer('dongjak-tree-symbols'))map.setLayoutProperty('dongjak-tree-symbols','visibility',flat?'visible':'none');
    if(zoom<15.3||loaded||busy||Date.now()-lastAttempt<180000)return;
    lastAttempt=Date.now();
    busy=true;
    try{
      const q=`[out:json][timeout:25];(way["leisure"~"^(park|garden)$"](${SAFETY_BBOX});way["landuse"~"^(grass|forest)$"](${SAFETY_BBOX});way["natural"="wood"](${SAFETY_BBOX}););out geom tags;`;
      const trees=makeDecorativeTrees(await queryOverpass(q),isDongjak);
      map.getSource(stems)?.setData(trees.trunks);
      map.getSource(canopies)?.setData(trees.crowns);
      loaded=true;
    }catch(e){console.warn('공원 장식용 나무 조회 실패: 기존 녹지 유지',e);}
    finally{busy=false;}
  }
  map.on('moveend',loadIfUseful);
  map.on('pitch',loadIfUseful);
  loadIfUseful();
}
export function installMapOrientationControls(map,maplibregl){
  map.addControl(new maplibregl.ScaleControl({maxWidth:110,unit:'metric'}),'bottom-left');
  const btn=document.getElementById('map-compass');
  if(!btn)return;
  const pointer=btn.querySelector('.compass-direction');
  const render=()=>{
    if(pointer)pointer.style.transform=`rotate(${-map.getBearing()}deg)`;
    btn.setAttribute('aria-label',`북쪽으로 지도 회전 (${Math.round(map.getBearing())}°)`);
  };
  btn.addEventListener('click',()=>{
    const bearing=((Number(map.getBearing?.()||0)%360)+360)%360;
    if(Math.min(bearing,360-bearing)<0.6){
      btn.classList.remove('north-up-feedback');
      if(pointer)void pointer.offsetWidth;
      btn.classList.add('north-up-feedback');
      return;
    }
    map.easeTo({bearing:0,duration:350});
  });
  btn.addEventListener('animationend',event=>{
    if(event.animationName==='dj-compass-north-feedback')btn.classList.remove('north-up-feedback');
  });
  map.on('rotate',render);
  render();
}
