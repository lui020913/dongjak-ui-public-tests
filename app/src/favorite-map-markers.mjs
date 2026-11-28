import {placeKey} from './v815-place-store.js';
export const FAVORITE_SOURCE='dj-saved-place-stars',FAVORITE_LAYER=FAVORITE_SOURCE+'-icon';
export const FAVORITE_MARKER_COLOR='#0D8875';
const IMAGE='dj-favorite-star-teal';
export function favoriteMapGeojson(places=[]){
 const seen=new Set(),features=[];
 for(const p of places){const key=placeKey(p);if(!key||seen.has(key))continue;seen.add(key);
  features.push({type:'Feature',geometry:{type:'Point',coordinates:[Number(p.lng),Number(p.lat)]},properties:{key,name:p.name||'저장한 장소'}});
 }
 return {type:'FeatureCollection',features};
}
function starImage(){
 const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;const c=canvas.getContext('2d');
 c.beginPath();c.arc(40,40,35,0,Math.PI*2);c.fillStyle=FAVORITE_MARKER_COLOR;c.fill();c.strokeStyle='#fff';c.lineWidth=6;c.stroke();
 c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?10:21,x=40+Math.cos(a)*r,y=40+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fillStyle='#fff';c.fill();
 return c.getImageData(0,0,80,80);
}
export function installFavoriteMapMarkers({map,getPlaces,onOpen,canOpen=()=>true,events=globalThis.window,image=starImage}){
 let last='',lookup=new Map(),pending=false;
 function refresh(){
  if(!map.getStyle?.()||map.isStyleLoaded?.()===false){if(!pending){pending=true;map.once?.('idle',()=>{pending=false;refresh();});}return;}
  const places=getPlaces()||[],data=favoriteMapGeojson(places),sig=JSON.stringify(data);lookup=new Map(places.map(p=>[placeKey(p),p]));
  if(!map.hasImage(IMAGE))map.addImage(IMAGE,image(),{pixelRatio:2});
  if(!map.getSource(FAVORITE_SOURCE)){map.addSource(FAVORITE_SOURCE,{type:'geojson',data});last=sig;}
  else if(sig!==last){map.getSource(FAVORITE_SOURCE).setData(data);last=sig;}
  if(!map.getLayer(FAVORITE_LAYER))map.addLayer({id:FAVORITE_LAYER,type:'symbol',source:FAVORITE_SOURCE,minzoom:13.2,layout:{'icon-image':IMAGE,'icon-size':['interpolate',['linear'],['zoom'],13.2,.55,17,.85,20,.95],'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center','icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport'}});
 }
 // One source, one image, no DOM marker allocation or pan/zoom rebuild.
 function click(e){if(!canOpen())return;const p=lookup.get(e.features?.[0]?.properties?.key);if(!p)return;e.originalEvent?.stopPropagation?.();onOpen(p);}
 map.on('click',FAVORITE_LAYER,click);
 map.on('load',refresh);map.on('style.load',refresh);
 map.on('idle',()=>{const layers=map.getStyle?.()?.layers;if(layers?.length&&map.getLayer(FAVORITE_LAYER)&&layers.at(-1)?.id!==FAVORITE_LAYER)map.moveLayer?.(FAVORITE_LAYER);});
 events?.addEventListener('dongjak:saved-places-change',refresh);
 events?.addEventListener('storage',refresh);
 refresh();
 return {refresh};
}
