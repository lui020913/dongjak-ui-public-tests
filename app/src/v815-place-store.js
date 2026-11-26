import {normalizeFacilityName,normalizeFacilityCategory} from './facility-display-names.js';
/** Local-first favorites. Guest data stays in this browser; an optional account
 * sync module uploads only explicit favorites/groups after authentication. */
const BOOKMARK_KEY='dj-map-v815-bookmarks';
const RECENT_KEY='dj-map-v815-recent';
const QUERY_KEY='dj-map-v815-recent-queries';
const GROUPS_KEY='dj-map-v824-custom-groups';
export const PLACE_FOLDERS=Object.freeze(['즐겨찾기','집','학교','직장','기타']);
const normalize=s=>String(s??'').trim().slice(0,100);
const isFiniteCoordinate=p=>Number.isFinite(Number(p?.lng))&&Number.isFinite(Number(p?.lat))&&Number(p.lng)>125&&Number(p.lng)<128&&Number(p.lat)>36&&Number(p.lat)<39;
function read(key){
  try{const parsed=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(parsed)?parsed:[];}catch{return [];}
}
function write(key,list){
  try{localStorage.setItem(key,JSON.stringify(list));return true;}catch{return false;}
}
function notify(origin='local'){
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('dongjak:saved-places-change',{detail:{origin}}));
}
function validGroupName(value){
  const group=normalize(value).slice(0,32);
  return group&&!/[\u0000-\u001f<>]/u.test(group)?group:'';
}
export function getPlaceFolders(){
  const extra=read(GROUPS_KEY).map(validGroupName).filter(Boolean);
  return [...PLACE_FOLDERS,...new Set(extra.filter(x=>!PLACE_FOLDERS.includes(x)))].slice(0,30);
}
const validFolder=value=>getPlaceFolders().includes(value)?value:'즐겨찾기';
export function createPlaceFolder(name){
  const group=validGroupName(name),folders=getPlaceFolders();
  if(!group||folders.includes(group)||folders.length>=30)return null;
  if(!write(GROUPS_KEY,[...folders.filter(x=>!PLACE_FOLDERS.includes(x)),group]))return null;
  notify();return group;
}
export function renamePlaceFolder(from,to){
  const folders=getPlaceFolders(),target=validGroupName(to);
  if(PLACE_FOLDERS.includes(from)||!folders.includes(from)||!target||(folders.includes(target)&&target!==from))return false;
  if(from===target)return true;
  const items=savedPlaces().map(p=>p.folder===from?{...p,folder:target}:p);
  if(!write(GROUPS_KEY,folders.filter(x=>!PLACE_FOLDERS.includes(x)).map(x=>x===from?target:x)))return false;
  if(!write(BOOKMARK_KEY,items))return false;
  notify();return true;
}
export function deletePlaceFolder(name){
  if(PLACE_FOLDERS.includes(name)||!getPlaceFolders().includes(name))return false;
  const items=savedPlaces().map(p=>p.folder===name?{...p,folder:'즐겨찾기'}:p);
  if(!write(GROUPS_KEY,getPlaceFolders().filter(x=>!PLACE_FOLDERS.includes(x)&&x!==name)))return false;
  if(!write(BOOKMARK_KEY,items))return false;
  notify();return true;
}
/** Transit identities cannot rely on a rounded coordinate alone: entrances,
 * directions and nearby platforms may share coordinates. */
export function placeKey(place){
  if(!isFiniteCoordinate(place))return '';
  const kind=String(place?.kind||'').toLowerCase();
  if(kind==='bus'){
    const ars=String(place?.arsId||'').replace(/\D/g,'');
    if(ars)return `bus:${ars}`;
    return `bus-coordinate:${Number(place.lng).toFixed(5)},${Number(place.lat).toFixed(5)}:${normalize(place.name).toLowerCase()}`;
  }
  if(kind==='subway'){
    const name=normalize(place?.name).replace(/역$/,'').replace(/\s+/g,'').toLowerCase();
    return name?`subway:${name}`:`subway-coordinate:${Number(place.lng).toFixed(5)},${Number(place.lat).toFixed(5)}`;
  }
  return `${Number(place.lng).toFixed(5)},${Number(place.lat).toFixed(5)}`;
}
export function cleanPlace(place){
  if(!placeKey(place))return null;
  const kind=['bus','subway'].includes(place.kind)?place.kind:'place';
  const name=normalize(kind==='place'?normalizeFacilityName(place.name,place.category||place.type||''):place.name)||'저장한 장소';
  const p={name,address:normalize(place.address),category:normalize(kind==='place'?normalizeFacilityCategory(place.category||place.type||place.kind||'장소',place.name):place.category||place.type||place.kind||'장소'),folder:validFolder(place.folder),lng:Number(place.lng),lat:Number(place.lat)};
  if(kind==='place'){
    const raw=normalize(place.registeredName||place.name);if(raw&&raw!==name)p.registeredName=raw;
  }
  if(kind==='bus'){
    p.kind='bus';
    const ars=String(place.arsId||'').replace(/\D/g,'').slice(0,12);if(ars)p.arsId=ars;
    p.direction=normalize(place.direction).slice(0,80);
    if(place.median===true)p.median=true;
  }
  if(kind==='subway'){
    p.kind='subway';
    p.lines=Array.isArray(place.lines)?[...new Set(place.lines.map(x=>normalize(x).slice(0,16)).filter(Boolean))].slice(0,12):[];
    p.selectedLine=normalize(place.selectedLine).slice(0,16);
  }
  return p;
}
export function savedPlaces(){return read(BOOKMARK_KEY).map(cleanPlace).filter(Boolean).slice(0,100);}
export function isPlaceSaved(place){return savedPlaces().some(x=>placeKey(x)===placeKey(place));}
export function addSavedPlace(place,folder){
  const p=cleanPlace({...place,folder:folder??place.folder});if(!p)return {ok:false,saved:false};
  const list=savedPlaces(),id=placeKey(p);
  const old=list.findIndex(x=>placeKey(x)===id);
  if(old>=0)list[old]={...list[old],...p,folder:folder?validFolder(folder):list[old].folder};
  else list.unshift(p);
  const ok=write(BOOKMARK_KEY,list.slice(0,100));if(ok)notify();
  return {ok,saved:ok};
}
export function toggleSavedPlace(place){
  const p=cleanPlace(place);if(!p)return {ok:false,saved:false};
  const list=savedPlaces(),id=placeKey(p),old=list.findIndex(x=>placeKey(x)===id);
  const added=old<0;if(added)list.unshift(p);else list.splice(old,1);
  const ok=write(BOOKMARK_KEY,list.slice(0,100));if(ok)notify();
  return {ok,saved:added&&ok};
}
export function removeSavedPlace(place){
  const id=placeKey(place);if(!id)return false;
  const list=savedPlaces(),rest=list.filter(x=>placeKey(x)!==id);
  if(rest.length===list.length)return false;
  const ok=write(BOOKMARK_KEY,rest);if(ok)notify();return ok;
}
export function setSavedPlaceFolder(place,folder){
  const id=placeKey(place);if(!id)return false;
  const list=savedPlaces();const match=list.find(x=>placeKey(x)===id);if(!match)return false;
  match.folder=validFolder(folder);const ok=write(BOOKMARK_KEY,list);
  if(ok)notify();return ok;
}
export function favoritesSnapshot(){return {version:1,groups:getPlaceFolders().filter(x=>!PLACE_FOLDERS.includes(x)),places:savedPlaces()};}
export function sanitizeFavoritesSnapshot(snapshot){
  const groups=Array.isArray(snapshot?.groups)?snapshot.groups.map(validGroupName).filter(x=>x&&!PLACE_FOLDERS.includes(x)):[];
  const extra=[...new Set(groups)].slice(0,25);
  const allowed=new Set([...PLACE_FOLDERS,...extra]);
  const places=Array.isArray(snapshot?.places)?snapshot.places:[];
  const seen=new Set(),normalized=[];
  for(const raw of places.slice(0,150)){
    if(!raw||typeof raw!=='object')continue;
    const p=cleanPlace({...raw,folder:'즐겨찾기'});if(!p)continue;
    p.folder=allowed.has(raw.folder)?raw.folder:'즐겨찾기';
    const key=placeKey(p);if(seen.has(key))continue;seen.add(key);normalized.push(p);
    if(normalized.length>=100)break;
  }
  return {version:1,groups:extra,places:normalized};
}
/** Restore from cloud after authentication without generating another upload. */
export function replaceFavoritesSnapshot(snapshot,{origin='cloud'}={}){
  const cleaned=sanitizeFavoritesSnapshot(snapshot);
  if(!write(GROUPS_KEY,cleaned.groups)||!write(BOOKMARK_KEY,cleaned.places))return false;
  notify(origin);return true;
}
export function mergeFavoritesSnapshots(server,local){
  const a=sanitizeFavoritesSnapshot(server),b=sanitizeFavoritesSnapshot(local);
  const groups=[...new Set([...a.groups,...b.groups])].slice(0,25);
  const places=[...a.places];
  for(const p of b.places){const i=places.findIndex(x=>placeKey(x)===placeKey(p));if(i<0)places.push(p);else places[i]=p;}
  return sanitizeFavoritesSnapshot({groups,places});
}
const historyText=s=>String(s??'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase();
function recentDistance(a,b){
  const north=(a.lat-b.lat)*111195,east=(a.lng-b.lng)*111195*Math.cos((a.lat+b.lat)*Math.PI/360);
  return Math.hypot(north,east);
}
export function sameRecentPlace(a,b){
  const ak=a.kind||'place',bk=b.kind||'place';
  if(ak!==bk)return false;
  // Do not merge bus stops with different ARS IDs or opposite directions.
  if(ak==='bus'||ak==='subway')return placeKey(a)===placeKey(b);
  const name=historyText(a.name);
  if(!name||name!==historyText(b.name))return false;
  const addressA=historyText(a.address),addressB=historyText(b.address);
  if(addressA&&addressB&&addressA!==addressB)return recentDistance(a,b)<=5;
  if(addressA&&addressA===addressB)return true;
  // Different providers often pin the same park/school at different entrances.
  // Preserve distinct same-named branches farther apart; do not change favorites.
  return recentDistance(a,b)<=100;
}
function uniqueRecentPlaces(raw){
  const list=[];
  for(const item of raw){
    const p=cleanPlace(item);if(!p||list.some(x=>sameRecentPlace(x,p)))continue;
    list.push(p);if(list.length>=12)break;
  }
  return list;
}
export function recentPlaces(){
  const raw=read(RECENT_KEY),list=uniqueRecentPlaces(raw);
  if(JSON.stringify(raw)!==JSON.stringify(list))write(RECENT_KEY,list);
  return list;
}
export function recordRecentPlace(place){
  const p=cleanPlace(place);if(!p)return false;
  const ok=write(RECENT_KEY,uniqueRecentPlaces([p,...recentPlaces()]));if(ok)notifyRecent();return ok;
}
function notifyRecent(){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('dongjak:recent-places-change'));}
function uniqueRecentQueries(raw){
  const seen=new Set(),list=[];
  for(const item of raw){
    if(typeof item!=='string')continue;
    const q=item.normalize('NFKC').trim().replace(/\s+/gu,' ').slice(0,80),key=historyText(q);
    if(q.length<2||seen.has(key))continue;
    seen.add(key);list.push(q);if(list.length>=12)break;
  }
  return list;
}
export function recentSearchQueries(){
  const raw=read(QUERY_KEY),list=uniqueRecentQueries(raw);
  if(JSON.stringify(raw)!==JSON.stringify(list))write(QUERY_KEY,list);
  return list;
}
export function recordSearchQuery(query){const q=normalize(query).slice(0,80);if(q.length<2)return false;const ok=write(QUERY_KEY,uniqueRecentQueries([q,...recentSearchQueries()]));if(ok)notifyRecent();return ok;}
export function clearRecentPlaces(){const a=write(RECENT_KEY,[]),b=write(QUERY_KEY,[]);if(a||b)notifyRecent();return a&&b;}
export function placeShareUrl(place,base){
  const p=cleanPlace(place);if(!p)return '';
  const url=new URL(base||(typeof location!=='undefined'?location.href:'https://example.org/'));
  url.searchParams.set('dj_place',`${p.lng.toFixed(6)},${p.lat.toFixed(6)}`);
  url.searchParams.set('dj_name',p.name.slice(0,60));url.hash='';return url.href;
}
export function parseSharedPlace(urlText){
  try{
    const url=new URL(urlText);const raw=url.searchParams.get('dj_place');if(!raw)return null;
    const [lng,lat]=raw.split(',').map(Number);
    return cleanPlace({lng,lat,name:url.searchParams.get('dj_name')||'공유 장소'});
  }catch{return null;}
}
export function multiStopShareUrl(points=[],base){
  const clean=points.map(cleanPlace);if(clean.length<2||clean.length>7||clean.some(p=>!p))return '';
  const url=new URL(base||(typeof location!=='undefined'?location.href:'https://example.org/'));
  url.searchParams.set('dj_route',clean.map(p=>`${p.lng.toFixed(5)},${p.lat.toFixed(5)},${encodeURIComponent(p.name.slice(0,24))}`).join('|'));
  url.hash='';return url.href;
}
export function parseSharedRoute(urlText){
  try{
    const raw=new URL(urlText).searchParams.get('dj_route');if(!raw||raw.length>900)return null;
    const points=raw.split('|');if(points.length<2||points.length>7)return null;
    const parsed=points.map(piece=>{const [x,y,...tail]=piece.split(',');return cleanPlace({lng:Number(x),lat:Number(y),name:decodeURIComponent(tail.join(','))});});
    return parsed.every(Boolean)?parsed:null;
  }catch{return null;}
}
export async function shareMapUrl(url,title='동작 보행지도'){
  if(!url)return false;
  if(typeof navigator!=='undefined'&&navigator.share){
    try{await navigator.share({title,url});return true;}catch(error){if(error?.name==='AbortError')return false;}
  }
  try{await navigator.clipboard.writeText(url);return true;}catch{}
  if(typeof window!=='undefined')window.prompt?.('주소를 복사해 공유하세요.',url);
  return true;
}
