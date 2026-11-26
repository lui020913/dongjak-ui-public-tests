import {hasTransportPoiHit} from './poi-click-identity.js';
import {nightOwnsLayerOrder} from './v913-night-poi-isolation.js';
import {openPlaceDetails} from './place-details.js';
/** Context labels near Dongjak-gu; place coordinates are explicit map anchors. */
export const NEARBY_PLACE_LABELS=[
  {name:'여의도',lng:126.928,lat:37.524,kind:'district'},
  // Kept in the shared catalog for older data consumers; its rendered label
  // is supplied by the independent, collision-proof Nodeulseom symbol layer.
  {name:'노들섬',lng:126.958661,lat:37.517557,kind:'island'}
];
const NODEULSEOM={name:'노들섬',lng:126.958661,lat:37.517557,kind:'island'};
const nodeulseomInstalled=new WeakSet();
const nodeulseomInteractive=new WeakSet();

export function installNearbyPlaceLabels(map,{maplibregl}={}){
  if(!map)return;
  if(!map.getSource?.('dj-nearby-place-labels')){
    map.addSource('dj-nearby-place-labels',{type:'geojson',data:{type:'FeatureCollection',features:NEARBY_PLACE_LABELS.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{name:p.name,kind:p.kind}}))}});
  }
  if(!map.getLayer?.('dj-nearby-place-names')){
    map.addLayer({id:'dj-nearby-place-names',type:'symbol',source:'dj-nearby-place-labels',minzoom:11.1,maxzoom:15.3,
      filter:['==',['get','kind'],'district'],
      layout:{'text-field':['get','name'],
        'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Semibold','Open Sans Regular'],
        'text-size':['interpolate',['linear'],['zoom'],11.1,13.5,14.5,15],
        'text-max-width':12,'text-allow-overlap':false,'text-padding':12,
        'text-variable-anchor':['top','bottom','left','right']},
      paint:{'text-color':'#536e74','text-halo-color':'rgba(247,250,249,0.95)','text-halo-width':2.0}});
  }
  installNodeulseomDetailLabel(map);
  installNodeulseomInteraction(map,{maplibregl});
  // Theme/style replacement can remove custom layers. Restore the independent
  // Nodeulseom source and symbol layer after every MapLibre style reload.
  if(!nodeulseomInstalled.has(map)){
    nodeulseomInstalled.add(map);
    map.on?.('style.load',()=>installNearbyPlaceLabels(map,{maplibregl}));
  }
}


/** Persisted OSM/municipal reference point, separate from optional POI tiles. */
function installNodeulseomInteraction(map,{maplibregl}={}){
  if(!maplibregl?.Popup||nodeulseomInteractive.has(map))return;
  nodeulseomInteractive.add(map);
  let lastPick=0;
  const pick=event=>{
    if(hasTransportPoiHit(map,event))return;
    const timestamp=Date.now();if(timestamp-lastPick<260)return;
    lastPick=timestamp;
    event.originalEvent?.stopPropagation?.();
    openPlaceDetails({map,maplibregl,place:{...NODEULSEOM,type:'문화·생활시설'}});
  };
  for(const layer of ['dj-nodeulseom-detail-pin','dj-nodeulseom-detail-name','dj-nodeulseom-label-image','dj-nodeulseom-detail-dot']){
    map.on?.('click',layer,pick);
    map.on?.('mouseenter',layer,()=>{try{map.getCanvas().style.cursor='pointer';}catch{}});
    map.on?.('mouseleave',layer,()=>{try{map.getCanvas().style.cursor='';}catch{}});
  }
}

// Nodeulseom is an independent geographic source so collisions or filtering on
// nearby district labels cannot suppress the island name at any zoom level.
function ensureNodeulseomMapIcon(map){
  const id='dj-nodeulseom-pin';
  if(map.hasImage?.(id))return true;
  if(typeof document==='undefined'||!map.addImage)return false;
  const size=64,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext?.('2d');if(!ctx)return false;
  ctx.beginPath();ctx.arc(32,27,23,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
  ctx.beginPath();ctx.arc(32,27,19,0,Math.PI*2);ctx.fillStyle='#16866f';ctx.fill();
  ctx.fillStyle='#ffffff';ctx.beginPath();
  ctx.moveTo(15,32);ctx.lineTo(23,24);ctx.lineTo(29,29);ctx.lineTo(37,20);
  ctx.lineTo(49,32);ctx.lineTo(49,36);ctx.lineTo(15,36);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=2.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(20,40);ctx.quadraticCurveTo(32,45,44,40);ctx.stroke();
  ctx.beginPath();ctx.moveTo(32,4);ctx.lineTo(32,1);ctx.stroke();
  try{map.addImage(id,{width:size,height:size,data:ctx.getImageData(0,0,size,size).data},{pixelRatio:2});return true;}
  catch(error){console.warn('[노들섬 아이콘] 지도 이미지 등록 실패:',error);return false;}
}

/** MapLibre-managed canvas glyph fallback: a geographic symbol, not a laggy DOM marker. */
function ensureNodeulseomRasterText(map){
  const id='dj-nodeulseom-name-glyph';
  if(map.hasImage?.(id))return true;
  if(typeof document==='undefined'||!map.addImage)return false;
  const canvas=document.createElement('canvas');canvas.width=188*2;canvas.height=51*2;
  const ctx=canvas.getContext?.('2d');
  if(!ctx||typeof ctx.scale!=='function'||typeof ctx.roundRect!=='function')return false;
  ctx.scale(2,2);
  ctx.fillStyle='rgba(255,255,255,0.95)';
  ctx.strokeStyle='#c8ded5';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(1,1,186,49,14);ctx.fill();ctx.stroke();
  ctx.font='bold 25px "Apple SD Gothic Neo",Pretendard,system-ui,sans-serif';
  ctx.fillStyle='#185e55';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('노들섬',94,26);
  try{map.addImage(id,{width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data},{pixelRatio:2});return true;}
  catch(error){console.warn('[노들섬 문자 레이어]',error);return false;}
}

export function installNodeulseomDetailLabel(map){
  if(!map)return;
  if(!map.getSource?.('dj-nodeulseom-detail-source')){
    map.addSource('dj-nodeulseom-detail-source',{type:'geojson',data:{
      type:'FeatureCollection',
      features:[{type:'Feature',geometry:{type:'Point',coordinates:[NODEULSEOM.lng,NODEULSEOM.lat]},properties:{name:NODEULSEOM.name}}]
    }});
  }
  const hasIcon=ensureNodeulseomMapIcon(map);
  const hasLabel=ensureNodeulseomRasterText(map);
  // A built-in circle layer still renders if the custom canvas image fails.
  const dotId='dj-nodeulseom-detail-dot';
  if(!map.getLayer?.(dotId))map.addLayer({id:dotId,type:'circle',source:'dj-nodeulseom-detail-source',minzoom:9.8,
    paint:{'circle-radius':['interpolate',['linear'],['zoom'],10,6,15,9,18,12],
      'circle-color':'#18836e','circle-stroke-color':'#ffffff','circle-stroke-width':2.5,
      'circle-opacity':hasIcon?.55:1,'circle-stroke-opacity':hasIcon?.7:1}});
  const pinId='dj-nodeulseom-detail-pin';
  // The icon and the name deliberately use separate symbol layers. A missing
  // sprite, icon collision or icon-placement issue can no longer suppress the
  // actual place name requested by the user.
  if(hasIcon&&!map.getLayer?.(pinId)){
    map.addLayer({id:pinId,type:'symbol',source:'dj-nodeulseom-detail-source',minzoom:9.8,maxzoom:24,
      layout:{'icon-image':'dj-nodeulseom-pin',
        'icon-size':['interpolate',['linear'],['zoom'],10.5,.5,14,.62,18,.76],
        'icon-anchor':'bottom','icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport',
        'icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':9999}});
  }
  const nameId='dj-nodeulseom-detail-name';
  if(!map.getLayer?.(nameId)){
    map.addLayer({id:nameId,type:'symbol',source:'dj-nodeulseom-detail-source',minzoom:9.8,maxzoom:24,
      layout:{'text-field':['get','name'],
        'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Semibold','Open Sans Regular'],
        'text-size':['interpolate',['linear'],['zoom'],10.5,13,14,15,18,18],
        'text-offset':[0,1.7],'text-max-width':8,'text-padding':0,
        'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport','text-keep-upright':true,
        'text-allow-overlap':true,'text-ignore-placement':true,'text-anchor':'top','symbol-sort-key':10000},
      paint:{'text-color':'#245d65','text-halo-color':'#ffffff','text-halo-width':3.2,'text-halo-blur':0.15}});
  }
  // Canvas text is drawn by the map renderer at geographic coordinates. This
  // remains visible even when the vector tile font stack lacks Korean glyphs.
  const fallbackId='dj-nodeulseom-label-image';
  if(hasLabel&&!map.getLayer?.(fallbackId)){
    map.addLayer({id:fallbackId,type:'symbol',source:'dj-nodeulseom-detail-source',minzoom:9.8,maxzoom:24,
      layout:{'icon-image':'dj-nodeulseom-name-glyph','icon-anchor':'top',
        'icon-offset':[0,1.0],'icon-allow-overlap':true,
        'icon-ignore-placement':true,'icon-pitch-alignment':'viewport',
        'icon-rotation-alignment':'viewport','symbol-sort-key':10001},
      paint:{'icon-opacity':1}});
  }
  try{
    if(nightOwnsLayerOrder(map))return;
    map.setLayoutProperty?.(dotId,'visibility',hasLabel?'none':'visible');
    if(hasIcon)map.setLayoutProperty?.(pinId,'visibility','visible');
    map.setLayoutProperty?.(nameId,'visibility',hasLabel?'none':'visible');
    if(hasLabel)map.setLayoutProperty?.(fallbackId,'visibility','visible');
    // Keep the icon directly beneath the independently rendered name.
    map.moveLayer?.(dotId);
    if(hasIcon)map.moveLayer?.(pinId);
    map.moveLayer?.(nameId);
    if(hasLabel)map.moveLayer?.(fallbackId);
  }catch{}
}
