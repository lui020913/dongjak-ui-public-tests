// Request a separate vector data product, not a style visibility filter.
const TILE=/^https:\/\/tiles\.openfreemap\.org\/(planet|backup_planet)\/[A-Za-z0-9_-]+\/\d+\/\d+\/\d+\.pbf$/;
export function exteriorTileRequest(url,type,active,apiBase=''){
 if(type!=='Tile')return {url};
 let parsed;try{parsed=new URL(url);}catch{return {url};}
 const mode=parsed.searchParams.get('dj-road-mode');
 if(mode)parsed.searchParams.delete('dj-road-mode');
 const raw=parsed.origin+parsed.pathname;
 if(!TILE.test(raw))return {url};
 if((mode?mode==='full':active))return {url:parsed.href};
 return {url:apiBase+'/api/basemap/tile'+parsed.pathname};
}
export function installExteriorRoadScope(map){
 let active=false,source=null,original=null;
 const apply=()=>{
  const next=map.getSource('openmaptiles');if(!next||typeof next.setTiles!=='function')return;
  if(next!==source){source=next;original=Array.isArray(next.tiles)?next.tiles.slice():null;}
  if(!original?.length&&Array.isArray(next.tiles))original=next.tiles.slice();
  if(!original?.length)return;
  const mode=active?'full':'reduced';
  const desired=original.map(url=>url+(url.includes('?')?'&':'?')+'dj-road-mode='+mode);
  if(JSON.stringify(next.tiles)!==JSON.stringify(desired))next.setTiles(desired);
 };
 map.on('style.load',()=>{source=null;original=null;apply();});
 // TileJSON may finish after style.load. Do not touch filters or paint.
 map.on('idle',()=>{if(!original?.length)apply();});
 return {update(geometry,next){if(!geometry)return;const changed=active!==Boolean(next);active=Boolean(next);if(changed||!original?.length)apply();}};
}
