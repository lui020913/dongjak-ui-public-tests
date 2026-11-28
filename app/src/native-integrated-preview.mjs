import {Capacitor,registerPlugin} from '@capacitor/core';
const PROD='https://dongjak-walk-safety-preview.pages.dev';
const native=registerPlugin('NativeIntegratedPreview');
const relative=value=>typeof value==='string'&&value.startsWith('/')?PROD+value:value;
export function normalizeNativeSnapshot(input){
 const style=JSON.parse(JSON.stringify(input));
 const sources=style.sources||{};
 // A Native renderer does not need the five separate JS partition sources.
 // Merge disjoint stages back into the same unpartitioned native vector tile.
 for(const id of Object.keys(sources))if(/^dj-native-building-stream-[1-4]$/.test(id))delete sources[id];
 style.layers=(style.layers||[]).filter(layer=>!/^dj-native-building-stream-[1-4]$/.test(layer.source||''));
 for(const [id,source] of Object.entries(sources)){
  if(typeof source.url==='string')source.url=relative(source.url);
  if(typeof source.data==='string')source.data=relative(source.data);
  if(Array.isArray(source.tiles))source.tiles=source.tiles.map(tile=>{
   if(tile.startsWith('dj-local-terrain://'))return tile.replace('dj-local-terrain://','https://s3.amazonaws.com/elevation-tiles-prod/terrarium/');
   if(tile.startsWith('dj-building://'))return tile.slice('dj-building://'.length).replace(/[?&]dj-building-stage=\d+/g,'');
   if(tile.startsWith('dj-reduced://'))return tile.slice('dj-reduced://'.length);
   const mode=/[?&]dj-road-mode=(reduced|full)/.exec(tile);
   if(mode){const raw=tile.replace(/[?&]dj-road-mode=(?:reduced|full)/g,'');if(mode[1]==='reduced'&&raw.startsWith('https://tiles.openfreemap.org/'))return PROD+'/api/basemap/tile/'+raw.slice('https://tiles.openfreemap.org/'.length);return raw;}
   return relative(tile);
  });
 }
 if(typeof style.glyphs==='string')style.glyphs=relative(style.glyphs);
 if(typeof style.sprite==='string')style.sprite=relative(style.sprite);
 // Default Mercator needs no projection member in the Android style format.
 if(style.projection?.type==='mercator')delete style.projection;
 delete style.center;delete style.zoom;delete style.bearing;delete style.pitch;
 return style;
}
function customImages(map){
 const result=[];
 for(const id of map.listImages?.()||[]){
  try{
   const image=map.getImage?.(id),data=image?.data;
   // Runtime markers are small. Do not resend entire base sprite sheets.
   if(!data?.data||!data.width||!data.height||data.width*data.height>262144)continue;
   const canvas=document.createElement('canvas');canvas.width=data.width;canvas.height=data.height;
   const ctx=canvas.getContext('2d');const raw=new Uint8ClampedArray(data.data);
   if(raw.length!==data.width*data.height*4)continue;
   ctx.putImageData(new ImageData(raw,data.width,data.height),0,0);
   result.push({id,png:canvas.toDataURL('image/png').split(',')[1],sdf:Boolean(image.sdf)});
  }catch{}
 }
 return result;
}
export function installNativeIntegratedPreview({map,app}){
 if(Capacitor.getPlatform()!=='android'||!Capacitor.isPluginAvailable('NativeIntegratedPreview'))return;
 let requested=true,active=false,dirty=true,timer=null,busy=false,last='',generation=0,queuedCamera=false,cameraBusy=false;
 const tag=document.createElement('button');tag.type='button';tag.textContent='Native 실험 준비 중';
 tag.setAttribute('aria-label','Native 실험 렌더러 전환');
 Object.assign(tag.style,{position:'fixed',top:'calc(env(safe-area-inset-top) + 112px)',left:'50%',transform:'translateX(-50%)',zIndex:'2100',padding:'5px 9px',borderRadius:'12px',background:'#fff',color:'#173b30',border:'1px solid #c7d8d1',fontSize:'11px',fontWeight:'700'});
 document.body.append(tag);
 const css=document.createElement('style');css.textContent='html.dj-native-preview,html.dj-native-preview body,html.dj-native-preview #app,html.dj-native-preview #map,html.dj-native-preview #map .maplibregl-canvas-container{background:transparent!important}html.dj-native-preview #map canvas.maplibregl-canvas{opacity:0!important}';document.head.append(css);
 const camera=()=>{const p=map.getCenter();return {lng:p.lng,lat:p.lat,zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()};};
 const revealWeb=()=>{active=false;document.documentElement.classList.remove('dj-native-preview');};
 const hide=()=>{generation++;revealWeb();last='';void native.hide().catch(()=>{});};
 function schedule(){if(!requested||timer!==null)return;timer=setTimeout(()=>{timer=null;void flush();},900);}
 async function flush(){
  if(!requested||busy||!dirty||map.isMoving?.()||!map.isStyleLoaded?.()){if(requested&&dirty)schedule();return;}
  const token=generation;dirty=false;busy=true;
  try{
   const style=JSON.stringify(normalizeNativeSnapshot(map.getStyle()));
   if(style===last&&active)return;
   revealWeb();tag.textContent='Native 레이어 동기화 중';
   await native.show({style,images:customImages(map),...camera()});
   if(token!==generation||!requested)return;
   last=style;active=true;document.documentElement.classList.add('dj-native-preview');
   tag.textContent='Native 실험 · GL 전환';await native.camera(camera());
  }catch(error){if(token===generation){requested=false;hide();tag.textContent='GL 복귀 · Native 재시도';console.warn('[Native experiment]',error);}}
  finally{busy=false;if(requested&&dirty)schedule();}
 }
 function move(){
  if(!requested||(!active&&!busy)||queuedCamera)return;
  queuedCamera=true;requestAnimationFrame(async()=>{queuedCamera=false;if(!requested||cameraBusy)return;cameraBusy=true;try{await native.camera(camera());}catch{}finally{cameraBusy=false;}});
 }
 const mark=()=>{dirty=true;};
 map.on('styledata',mark);map.on('sourcedata',mark);map.on('idle',schedule);map.on('move',move);
 map.on('moveend',()=>{move();schedule();});
 tag.addEventListener('click',()=>{requested=!requested;if(!requested){hide();tag.textContent='GL · Native 실험';}else{dirty=true;tag.textContent='Native 실험 준비 중';schedule();}});
 // Keep GL functional and preserve all current application UI behavior.
 // This is a compatibility mirror, not a single-renderer FPS benchmark.
 schedule();
}
