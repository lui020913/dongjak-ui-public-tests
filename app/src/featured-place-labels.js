import {nightOwnsLayerOrder} from './v913-night-poi-isolation.js';
import {promoteReadable3DLabelLayers} from './readable-3d-labels.js';
/**
 * Five trusted, named places drawn by MapLibre itself (not floating DOM labels).
 * They stay attached to the map while moving, rotating, and pitching.
 * No public API or district-boundary request is needed for the five points.
 */
import {IMPORTANT_PLACES} from './important-place-click.js';
import {openPlaceDetails} from './place-details.js';

export const FEATURED_PLACES_SOURCE = 'dongjak-featured-places';
export const FEATURED_PLACES_DOTS = 'dongjak-featured-place-dots';
export const FEATURED_PLACES_LABELS = 'dongjak-featured-place-names';
export const FEATURED_PLACES_LOGOS = 'dongjak-featured-place-logos';
// Existing user-provided official artwork under public/logos/ is reused; only resized tiles are generated.
export const FEATURED_PLACE_LOGOS = Object.freeze({
  '중앙대학교':'chungang','숭실대학교':'soongsil','총신대학교':'chongshin',
  '동작구청':'dongjak','국립서울현충원':'memorial'
});
export function logoIdForPlace(name){return `dj-featured-${FEATURED_PLACE_LOGOS[name]||'unknown'}`;}

export const FEATURED_LOGO_SCALE = Object.freeze({
  // 88px files are registered with pixelRatio:2, hence CSS size is 44px * icon-size.
  mobile: Object.freeze({far:0.46, mid:0.53, near:0.61}), // roughly 20–27 CSS px
  desktop: Object.freeze({far:0.68, mid:0.78, near:0.88}) // roughly 30–39 CSS px
});

// A narrow browser should use compact sizes, while a landscape phone remains mobile.
export function featuredLogoViewportMode({width=1440,coarsePointer=false}={}){
  return width<=700||(coarsePointer&&width<=1100)?'mobile':'desktop';
}

export function featuredLogoSizeExpression(mode='desktop'){
  const scale=FEATURED_LOGO_SCALE[mode]||FEATURED_LOGO_SCALE.desktop;
  return ['interpolate',['linear'],['zoom'],12.5,scale.far,15,scale.mid,18,scale.near];
}

function currentFeaturedLogoMode(){
  if(typeof window==='undefined')return 'desktop';
  const coarsePointer=Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
  return featuredLogoViewportMode({width:window.innerWidth||1440,coarsePointer});
}


/** Render each already-bundled landmark logo into a genuinely circular image.
 * This clips the square alpha corners; a circle behind the old square PNG alone
 * cannot create a circular icon. All image bytes remain local to the app. */
function visibleLogoBounds(image){
  const w=image.naturalWidth||image.width||1,h=image.naturalHeight||image.height||1;
  try{
    const probe=document.createElement('canvas');probe.width=w;probe.height=h;
    const pctx=probe.getContext('2d',{willReadFrequently:true});
    if(!pctx)return {x:0,y:0,width:w,height:h};
    pctx.drawImage(image,0,0,w,h);
    const pixels=pctx.getImageData(0,0,w,h).data;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      if(pixels[i+3]<18)continue;
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    if(maxX<minX||maxY<minY)return {x:0,y:0,width:w,height:h};
    return {x:minX,y:minY,width:Math.max(1,maxX-minX+1),height:Math.max(1,maxY-minY+1)};
  }catch{return {x:0,y:0,width:w,height:h};}
}
export function makeCircularFeaturedLogo(image,{size=112,fit='cover',scaleFactor=1}={}){
  const canvas=document.createElement('canvas');
  canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('원형 로고 캔버스를 만들 수 없습니다');
  const center=size/2, radius=size/2-4;
  const ringInset=2.2;
  const drawDiameter=(radius-ringInset)*2;
  ctx.save();
  ctx.beginPath();ctx.arc(center,center,radius,0,2*Math.PI);ctx.clip();
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);
  const bounds=visibleLogoBounds(image);
  const scale=(fit==='contain'?Math.min(drawDiameter/bounds.width,drawDiameter/bounds.height):Math.max(drawDiameter/bounds.width,drawDiameter/bounds.height))*scaleFactor;
  const drawW=bounds.width*scale,drawH=bounds.height*scale;
  ctx.drawImage(image,bounds.x,bounds.y,bounds.width,bounds.height,(size-drawW)/2,(size-drawH)/2,drawW,drawH);
  ctx.restore();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=4.8;
  ctx.beginPath();ctx.arc(center,center,radius-1.4,0,2*Math.PI);ctx.stroke();
  ctx.strokeStyle='rgba(19,82,71,.36)';ctx.lineWidth=1.8;
  ctx.beginPath();ctx.arc(center,center,radius-3.6,0,2*Math.PI);ctx.stroke();
  return {width:size,height:size,data:ctx.getImageData(0,0,size,size).data};
}

export function featuredPlaceCollection(){
  return {type:'FeatureCollection',features:IMPORTANT_PLACES.map((place,index)=>({
    type:'Feature',id:index+1,
    geometry:{type:'Point',coordinates:place.name==='숭실대학교'?[place.lng+0.00045,place.lat]:[place.lng,place.lat]},
    properties:{name:place.name,type:place.type,address:place.address,priority:index,logo:logoIdForPlace(place.name)}
  }))};
}

export function featuredPlaceStyle(theme='light'){
  const dark=theme==='dark';
  return {
    text:dark?'#ebf7f3':'#26352f',
    halo:dark?'#172a30':'#f6f9f7',
    dot:dark?'#7cd2b7':'#147d68',
    dotOutline:dark?'#173137':'#ffffff'
  };
}

export function installFeaturedPlaceLabels({map,maplibregl,app}={}){
  if(!map?.addSource||!map?.addLayer)return ()=>{};
  const sourceId=FEATURED_PLACES_SOURCE;
  const dotId=FEATURED_PLACES_DOTS;
  const nameId=FEATURED_PLACES_LABELS;
  try{
    if(!map.getSource?.(sourceId))map.addSource(sourceId,{type:'geojson',data:featuredPlaceCollection()});
    const palette=featuredPlaceStyle(app?.dataset?.theme);
    if(!map.getLayer?.(dotId))map.addLayer({
      id:dotId,type:'circle',source:sourceId,minzoom:12.5,
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],12.5,3.5,16,5],
        'circle-color':palette.dot,'circle-opacity':0.98,
        'circle-stroke-color':palette.dotOutline,'circle-stroke-width':1.8}
    });
    if(!map.getLayer?.(nameId))map.addLayer({
      id:nameId,type:'symbol',source:sourceId,minzoom:12.5,
      filter:['!=',['get','name'],'숭실대학교'],
      layout:{
        'text-field':['get','name'],
        'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Regular'],
        'text-size':['interpolate',['linear'],['zoom'],12.5,11,15,13,18,14.5],
        'text-variable-anchor':['bottom','top','right','left'],
        'text-radial-offset':1.55,'text-padding':7,
        'text-max-width':14,
        'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport',
        // There are only five: never suppress a requested name because a road or POI collides.
        'text-allow-overlap':true,'text-ignore-placement':false,'symbol-height-offset':0,
        'text-optional':false,'symbol-sort-key':1
      },
      paint:{'text-color':palette.text,'text-halo-color':palette.halo,
        'text-halo-width':2.7,'text-halo-blur':0.12}
    });
  }catch(error){console.warn('[주요시설명] 지도 레이어 설치 실패',error);return ()=>{};}

  function applyTheme(){
    const palette=featuredPlaceStyle(app?.dataset?.theme);
    if(!map.getLayer?.(nameId))return;
    try{
      map.setPaintProperty(nameId,'text-color',palette.text);
      map.setPaintProperty(nameId,'text-halo-color',palette.halo);
      if(map.getLayer(FEATURED_PLACES_LOGOS)){
        map.setPaintProperty(FEATURED_PLACES_LOGOS,'text-color',palette.text);
        map.setPaintProperty(FEATURED_PLACES_LOGOS,'text-halo-color',palette.halo);
      }
      map.setPaintProperty(dotId,'circle-color',palette.dot);
      map.setPaintProperty(dotId,'circle-stroke-color',palette.dotOutline);
    }catch(error){console.info('[주요시설명] 테마 반영 생략',error?.message);}
  }
  function bringToFront(){
    if(nightOwnsLayerOrder(map))return;
    if(!map.getLayer?.(nameId))return;
    promoteReadable3DLabelLayers(map);
    const theme=app?.dataset?.theme||'light';
    if(theme!==lastTheme){lastTheme=theme;applyTheme();}
  }
  let lastTheme=app?.dataset?.theme||'light';
  function openFeature(evt){
    const properties=evt.features?.[0]?.properties||{};
    const place=IMPORTANT_PLACES.find(p=>p.name===properties.name);
    if(!place)return;
    evt.originalEvent?.stopPropagation?.();
    openPlaceDetails({map,maplibregl,place:{...place,source:'대표 좌표 · 지도 내 위치 (시설 출입구는 아님)'}});
  }
  const hover=()=>{const canvas=map.getCanvas?.();if(canvas)canvas.style.cursor='pointer';};
  const leave=()=>{const canvas=map.getCanvas?.();if(canvas)canvas.style.cursor='';};
  for(const layer of [dotId,nameId]){
    map.on?.('click',layer,openFeature);
    map.on?.('mouseenter',layer,hover);
    map.on?.('mouseleave',layer,leave);
  }

  // Keep icons in MapLibre's own rendering tree. DOM/logo overlays used to leak
  // under the header and disappear on tilt. PNG assets are local, no OSM request.
  let disposed=false, logoLayerInstalled=false;
  let lastLogoMode=null;
  function applyResponsiveLogoSizing(){
    if(disposed||!map.getLayer?.(FEATURED_PLACES_LOGOS))return;
    const mode=currentFeaturedLogoMode();
    if(mode===lastLogoMode)return;
    try{
      map.setLayoutProperty?.(FEATURED_PLACES_LOGOS,'icon-size',featuredLogoSizeExpression(mode));
      // A variable-anchor label can choose another side near the screen edge.
      map.setLayoutProperty?.(nameId,'text-radial-offset',mode==='mobile'?1.45:1.7);
      lastLogoMode=mode;
    }catch(error){console.warn('[대표시설 로고] 반응형 크기 적용 실패',error);}
  }
  const imgNames=['chungang','soongsil','chongshin','dongjak','memorial'];
  function loadOfficialLogos(){
    if(typeof Image==='undefined'||!map.addImage||!map.addLayer)return;
    let loaded=0,failed=false;
    for(const name of imgNames){
      const image=new Image();
      image.onload=()=>{
        if(disposed)return;
        try{
          if(!map.hasImage?.(`dj-featured-${name}`)){
            let logo=image;
            try{logo=makeCircularFeaturedLogo(image,name==='dongjak'?{fit:'contain',scaleFactor:0.78}:{fit:'cover'});}
            catch(error){console.info('[원형 로고] 캔버스 사용 불가: 원본 이미지 대체',name,error?.message);}
            map.addImage(`dj-featured-${name}`,logo,{pixelRatio:2});
          }
          loaded++;
          if(loaded===imgNames.length&&!failed&&!logoLayerInstalled){
            map.addLayer({id:FEATURED_PLACES_LOGOS,type:'symbol',source:sourceId,minzoom:12.5,
              layout:{'icon-image':['get','logo'],'icon-size':featuredLogoSizeExpression(currentFeaturedLogoMode()),
                'icon-allow-overlap':true,'icon-ignore-placement':true,
                // Image and name share the same feature/anchor. Never use a pixel
                // icon-offset here: MapLibre scales that offset as zoom changes.
                'icon-offset':[0,0],
                'text-field':['case',['==',['get','name'],'숭실대학교'],['get','name'],''],
                'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Regular'],
                'text-size':['interpolate',['linear'],['zoom'],12.5,11,15,13,18,14.5],
                // The SSU label is centered above its own icon, both at one lng/lat.
                'text-anchor':'bottom','text-offset':[0,-1.45],
                'text-allow-overlap':true,'text-ignore-placement':true,
                'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport',
                'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport',
                'symbol-height-offset':0},
              paint:{'icon-opacity':1,
                'text-color':featuredPlaceStyle(app?.dataset?.theme).text,
                'text-halo-color':featuredPlaceStyle(app?.dataset?.theme).halo,
                'text-halo-width':2.7,'text-halo-blur':0.12}});
            logoLayerInstalled=true;
            lastLogoMode=null;
            applyResponsiveLogoSizing();
            if(map.getLayer?.(dotId))map.setLayoutProperty?.(dotId,'visibility','none');
            map.on?.('click',FEATURED_PLACES_LOGOS,openFeature);
            map.on?.('mouseenter',FEATURED_PLACES_LOGOS,hover);
            map.on?.('mouseleave',FEATURED_PLACES_LOGOS,leave);
            bringToFront();
          }
        }catch(e){console.warn('[대표시설 로고] 로딩 실패',e);}
      };
      image.onerror=()=>{failed=true;console.warn('[대표시설 로고] 파일 없음:',name);};
      image.src=`${import.meta.env?.BASE_URL||'/'}logos/featured/${name}.png`;
    }
  }
  loadOfficialLogos();

  map.on?.('idle',bringToFront);
  map.on?.('resize',applyResponsiveLogoSizing);
  if(typeof window!=='undefined')window.addEventListener?.('resize',applyResponsiveLogoSizing); 
  // map's 3D layers and transport symbols are added asynchronously: reorder after each load.
  bringToFront();
  return ()=>{
    disposed=true;map.off?.('idle',bringToFront);
    map.off?.('resize',applyResponsiveLogoSizing);
    if(typeof window!=='undefined')window.removeEventListener?.('resize',applyResponsiveLogoSizing);
    if(logoLayerInstalled){map.off?.('click',FEATURED_PLACES_LOGOS,openFeature);map.off?.('mouseenter',FEATURED_PLACES_LOGOS,hover);map.off?.('mouseleave',FEATURED_PLACES_LOGOS,leave);}
    for(const layer of [dotId,nameId]){
      map.off?.('click',layer,openFeature);map.off?.('mouseenter',layer,hover);map.off?.('mouseleave',layer,leave);
    }
  };
}
