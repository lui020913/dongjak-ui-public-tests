import {hasTransportPoiHit} from './poi-click-identity.js';
import {normalizeFacilityCategory,facilityOsmCategory,normalizeFacilityRecord,sameFacility,verifiedFacilityLabelExpression,formerPoliceNameVariants,isFormerPoliceFacility,isUnverifiedPoliceFacility,repurposedPoliceNameVariants} from './facility-display-names.js';
import {openPlaceDetails} from './place-details.js';
import {installSeoulOfficialFacilities} from './seoul-official-facilities.js';
import {registerFacilityIcons,iconName,DEFAULT_POI_GROUPS} from './v912-poi-presentation.js';
/** Dongjak schools, civic offices and recreation facilities from the map's
 * already downloaded OpenMapTiles 'poi' vector source. No second API request.
 * These points are only rendered inside the verified district polygon. */

export const CIVIC_POI_TYPES=Object.freeze({
  school:['school','kindergarten','childcare','child_care'],
  civic:['town_hall','police','police_station','police_substation','police_box','fire_station','fire_substation','post','library'],
  sports:['stadium','swimming','sports_centre','fitness_centre']
});

const colors={school:'#3f7a70',civic:'#4f718a',sports:'#986e3e'};
const sourceClasses=['school','town_hall','police','fire_station','post','library','stadium','swimming','sports_centre','fitness_centre'];
const featuredNames=['동작구청','국립서울현충원','중앙대학교','숭실대학교','총신대학교'];
const placeDisplayName=['coalesce',['get','name:ko'],['get','name:nonlatin'],['get','name'],''];
const repurposed=['in',placeDisplayName,['literal',repurposedPoliceNameVariants]];
const operatingFacility=['all',['!',['in',placeDisplayName,['literal',formerPoliceNameVariants]]],['any',repurposed,['!=',['slice',placeDisplayName,-4],'치안센터']]];
const notFeatured=['!', ['any',['in',placeDisplayName,['literal',featuredNames]],
  ['==',['slice',placeDisplayName,0,4],'동작구청']]];
const civicClassFilter=type=>{
 const matches=values=>['any',['in',['get','class'],['literal',values]],['in',['get','subclass'],['literal',values]]];
 if(type==='hospital')return matches(['hospital','clinic','doctor','doctors']);
 if(type==='pharmacy')return matches(['pharmacy']);
 if(type==='police')return matches(['police','police_station','police_substation','police_box']);
 if(type==='fire')return matches(['fire_station','fire_substation']);
  if(type==='school')return matches(CIVIC_POI_TYPES.school);
  if(type==='park')return matches(['park','garden','nature_reserve','playground']);
  if(type==='welfare')return matches(['social_facility','nursing_home','community_centre','community_center','senior_centre','senior_center']);
  if(type==='civic')return ['any',
    ['in',['get','class'],['literal',CIVIC_POI_TYPES.civic.filter(x=>!['police','police_station','police_substation','police_box','fire_station','fire_substation'].includes(x))]],
    ['==',['get','subclass'],'government'],['==',['get','subclass'],'public_building']];
  return ['any',
    ['in',['get','class'],['literal',CIVIC_POI_TYPES.sports]],
    ['in',['get','subclass'],['literal',['sports_centre','swimming_pool','fitness_centre','sports_hall']]]];
};
export const civicFilter=(type,boundary)=>['all',(type==='school'?['any',civicClassFilter(type),repurposed]:['all',civicClassFilter(type),['!',repurposed]]),notFeatured,operatingFacility,['within',boundary],
  ['!=',['coalesce',['get','name:ko'],['get','name:nonlatin'],['get','name'],''],'']];

function buildIcon(type){
  const size=64,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(32,32,28,0,2*Math.PI);ctx.fill();
  ctx.fillStyle=colors[type];ctx.beginPath();ctx.arc(32,32,25,0,2*Math.PI);ctx.fill();
  ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=3.4;ctx.lineCap='round';ctx.lineJoin='round';
  if(type==='school'){
    // Open-book pictogram, not the previous house-shaped school/roof icon.
    ctx.beginPath();ctx.moveTo(31,21);ctx.quadraticCurveTo(23,17,17,23);
    ctx.lineTo(17,43);ctx.quadraticCurveTo(23,38,31,43);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(33,21);ctx.quadraticCurveTo(41,17,47,23);
    ctx.lineTo(47,43);ctx.quadraticCurveTo(41,38,33,43);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(32,21);ctx.lineTo(32,45);ctx.stroke();
  }else if(type==='civic'){
    ctx.beginPath();ctx.moveTo(16,27);ctx.lineTo(32,18);ctx.lineTo(48,27);ctx.closePath();ctx.fill();
    ctx.fillRect(17,44,30,4);ctx.fillRect(19,29,5,14);ctx.fillRect(29,29,5,14);ctx.fillRect(40,29,5,14);
  }else{
    ctx.fillRect(17,29,6,13);ctx.fillRect(41,29,6,13);ctx.fillRect(23,33,18,5);
    ctx.fillRect(13,26,4,19);ctx.fillRect(47,26,4,19);
  }
  return {width:size,height:size,data:ctx.getImageData(0,0,size,size).data};
}
function escapeName(feature){return String(feature?.properties?.['name:ko']||feature?.properties?.['name:nonlatin']||feature?.properties?.name||'').trim();}
export function installCivicFacilities({map,maplibregl,boundaryGeometry,app}={}){
  if(!map?.getStyle||!boundaryGeometry)return {ok:false,reason:'boundary-unavailable'};
  // Sidecar: keep the protected map engine byte-identical. The official layer is independent.
  installSeoulOfficialFacilities({map,maplibregl,getBoundary:()=>boundaryGeometry,app});
  const base=map.getStyle().layers.find(layer=>layer.source&&layer['source-layer']==='poi');
  if(!base)return {ok:false,reason:'poi-vector-source-unavailable'};
  const source=base.source;
  // Keep a single school/civic/sports label system; suppress matching native POI
  // symbols without altering the underlying vector data or transit POIs.
  const types=['hospital','pharmacy','police','fire','school','civic','sports','park','welfare'];
  registerFacilityIcons(map);
  const hidden=[...Object.values(CIVIC_POI_TYPES).flat(),'hospital','clinic','doctor','doctors','pharmacy','restaurant','cafe','fast_food','food','convenience','supermarket','bakery','park','garden','nature_reserve','playground','social_facility','nursing_home','community_centre','community_center','senior_centre','senior_center','public_building','government','sports_hall','swimming_pool'];
  for(const native of map.getStyle().layers){
    if(!['symbol','circle'].includes(native.type)||native.source!==source||native['source-layer']!=='poi'||(native.id.startsWith('dj-')||native.id==='dongjak-park-names'))continue;
    try{
      const original=map.getFilter(native.id);
      const exclude=['!', ['any',['in',['get','class'],['literal',hidden]],['in',['get','subclass'],['literal',hidden]]]];
      map.setFilter(native.id,original?['all',original,exclude,notFeatured]:['all',exclude,notFeatured]);
    }catch(error){console.info('[기본 POI 중복 제거] 레이어별 적용 제외',native.id,error?.message);}
  }
  for(const type of types){
    const iconId=iconName(type==='welfare'?'civic':type);
    const safety=['hospital','pharmacy','police','fire'].includes(type);
    const layerId=`dj-civic-poi-${type}`;
    if(map.getLayer(layerId))continue;
    try{
      const isSchool=type==='school';
      map.addLayer({id:layerId,type:'symbol',source,'source-layer':'poi',
        minzoom:safety?13.8:['school','civic','park','welfare'].includes(type)?14.2:16,
        filter:civicFilter(type,boundaryGeometry),
        layout:{
          'icon-image':iconId,
          'icon-size':['interpolate',['linear'],['zoom'],14.3,.65,16,.78,18,.90],
          'icon-anchor':'center','icon-allow-overlap':false,'icon-ignore-placement':false,'icon-padding':5,
          'icon-optional':false,
          'text-field':type==='park'?'':['step',['zoom'],'',safety?14.8:['school','civic','park','welfare'].includes(type)?15.2:16.2,verifiedFacilityLabelExpression(placeDisplayName)],
          'text-font':['Noto Sans Regular','Open Sans Regular'],
          'text-size':['interpolate',['linear'],['zoom'],14.5,10.3,17,12.2],
          'text-anchor':'top','text-offset':[0,1.25],'text-max-width':15,
          'text-optional':true,'text-allow-overlap':false,'text-padding':3,'symbol-sort-key':safety?0:isSchool?4:3
        },paint:{'text-color':['case',['==',['get','class'],'school'], '#315f54','#34566c'],
          'text-halo-color':'#ffffff','text-halo-width':1.7}});
      map.on('click',layerId,event=>{
        if(hasTransportPoiHit(map,event))return;
        const feat=event.features?.[0];if(!feat||!maplibregl?.Popup)return;
        const name=escapeName(feat);if(!name||(isFormerPoliceFacility(name)||isUnverifiedPoliceFacility(name)))return;
        const tags=feat.properties||{};
        const coords=feat.geometry?.type==='Point'?feat.geometry.coordinates:null;
        const placePosition=Array.isArray(coords)&&coords.length>=2&&coords.every(Number.isFinite)
          ?{lng:coords[0],lat:coords[1]}:{lng:event.lngLat.lng,lat:event.lngLat.lat};
        openPlaceDetails({map,maplibregl,lngLat:event.lngLat,place:{...placePosition,
          name,type:normalizeFacilityCategory(facilityOsmCategory(tags,({hospital:'병원',pharmacy:'약국',police:'경찰서',fire:'소방서',school:'학교',civic:'공공기관',sports:'체육시설',park:'공원',welfare:'복지시설'})[type]),name),
          address:tags['addr:full']||tags.address||'',
          phone:tags['contact:phone']||tags.phone||'',
          website:tags.website||tags['contact:website']||'',
          source:'OpenMapTiles / © OpenStreetMap 기여자'
        }});
      });
      map.on('mouseenter',layerId,()=>{map.getCanvas().style.cursor='pointer';});
      map.on('mouseleave',layerId,()=>{map.getCanvas().style.cursor='';});
    }catch(error){console.warn('[시설 POI 레이어]',type,error?.message||error);}
  }
  // Match actual rendered official identities against currently loaded vector POIs.
  // Do not hide unrelated nearby facilities or use an untyped distance-only mask.
  let officialByName=new Map(),lastDedupSignature='',dedupDirty=true,dedupTimer=0;
  let lastViewportKey='';
  const markDirty=()=>{dedupDirty=true;};
  const scheduleReconcile=()=>{
    if(app?.dataset?.djTransitExterior==='true'||!dedupDirty||dedupTimer||map.isMoving?.())return;
    dedupTimer=setTimeout(()=>{dedupTimer=0;reconcileOfficialDuplicates();},180);
  };
  const identityName=p=>String(normalizeFacilityRecord(p).name||'').normalize('NFKC').toLowerCase().replace(/[\s\-‐‑–’']/g,'');
  const reconcileOfficialDuplicates=()=>{
    if(app?.dataset?.djTransitExterior==='true'||map.isMoving?.()||!dedupDirty)return;
    dedupDirty=false;
    if(!officialByName.size&&!lastDedupSignature)return;
    let features=[];try{features=map.querySourceFeatures(source,{sourceLayer:'poi'})||[];}catch{return;}
    const matches=new Set();
    for(const f of features){
      if(f.id==null||f.geometry?.type!=='Point')continue;
      const [lng,lat]=f.geometry.coordinates;
      const name=escapeName(f);if(!name)continue;
      const category=facilityOsmCategory(f.properties||{});
      const row={name,category,lng,lat};
      if((officialByName.get(identityName(row))||[]).some(p=>sameFacility(p,row)))matches.add(f.id);
    }
    const ids=[...matches].sort((a,b)=>String(a).localeCompare(String(b)));
    const signature=JSON.stringify(ids);
    if(signature===lastDedupSignature)return;
    lastDedupSignature=signature;
    for(const type of types){
      const id='dj-civic-poi-'+type;if(!map.getLayer(id))continue;
      const base=civicFilter(type,boundaryGeometry);
      map.setFilter(id,ids.length?['all',base,['!',['in',['id'],['literal',ids]]]]:base);
    }
  };
  app?.addEventListener('dongjak:official-facilities-ready',e=>{officialByName=new Map();for(const row of Array.isArray(e.detail)?e.detail:[]){const key=identityName(row);if(!officialByName.has(key))officialByName.set(key,[]);officialByName.get(key).push(row);}markDirty();scheduleReconcile();});
  map.on('movestart',()=>{if(dedupTimer){clearTimeout(dedupTimer);dedupTimer=0;}});
  map.on('moveend',()=>{const c=map.getCenter(),key=[c.lng.toFixed(5),c.lat.toFixed(5),map.getZoom().toFixed(2),map.getPitch().toFixed(1),map.getBearing().toFixed(1)].join('/');if(key!==lastViewportKey){lastViewportKey=key;markDirty();}scheduleReconcile();});
  map.on('sourcedata',e=>{if(e.sourceId===source&&e.sourceDataType==='content'&&e.tile){markDirty();scheduleReconcile();}});
  map.on('idle',scheduleReconcile);
  const recolor=()=>{
    const dark=app?.dataset?.theme==='dark';
    for(const type of types){
      const layerId=`dj-civic-poi-${type}`;
      if(map.getLayer(layerId))try{
        map.setPaintProperty(layerId,'text-color',dark?'#e0f0eb':'#315f54');
        map.setPaintProperty(layerId,'text-halo-color',dark?'#172d31':'#ffffff');
      }catch{}
    }
  };
  document.getElementById('theme-toggle')?.addEventListener('click',()=>requestAnimationFrame(recolor));
  const syncGroups=()=>{const groups=new Set((app?.dataset?.dj912PoiGroups??DEFAULT_POI_GROUPS.join(',')).split(','));for(const type of types){const layerId='dj-civic-poi-'+type;const group=['hospital','pharmacy','police','fire'].includes(type)?'safety':'public';if(map.getLayer(layerId))map.setLayoutProperty(layerId,'visibility',groups.has(group)?'visible':'none');}};
  app?.addEventListener('dongjak:poi-groups',syncGroups);syncGroups();recolor();
  return {ok:true,layers:types.map(type=>`dj-civic-poi-${type}`)};
}
