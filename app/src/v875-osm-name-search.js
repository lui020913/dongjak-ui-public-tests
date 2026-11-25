import {normalizeFacilityName,normalizeFacilityCategory,facilitySearchTerms} from './facility-display-names.js';
/** Bounded named-POI fallback when an explicit search cannot find a cafe/shop.
 * This is NOT a listing of verified businesses. Public OSM coverage varies. */
const BOUNDS=[126.87,37.435,127.07,37.565];
export const searchAliases=Object.freeze({스타벅스:'스타벅스|Starbucks',투썸:'투썸|Twosome',이디야:'이디야|EDIYA'});
export function normalizeNamedOsm(data,term,limit=20){
  const elements=Array.isArray(data?.elements)?data.elements:[];
  const wanted=String(term||'').trim().toLocaleLowerCase();
  const aliases=[...new Set([...(searchAliases[wanted]?.split('|')||[]),...facilitySearchTerms(wanted)])].map(x=>x.toLowerCase());
  const seen=new Set(),out=[];
  for(const item of elements){
    const tags=item.tags||{};
    const rawName=String(tags['name:ko']||tags.name||'').trim();
    const resolved=normalizeFacilityCategory(tags.amenity||tags.shop||tags.leisure||tags.tourism||'일반시설',rawName);
    const category=/[가-힣]/.test(resolved)||resolved==='AED'||resolved==='ATM'?resolved:normalizeFacilityCategory('일반시설',rawName);
    const name=normalizeFacilityName(rawName,category);
    const match=[name,tags.name,tags['name:ko'],tags.brand].some(x=>aliases.some(a=>String(x||'').toLowerCase().includes(a)));
    const lng=Number(item.center?.lon??item.lon),lat=Number(item.center?.lat??item.lat);
    if(!name||!match||!Number.isFinite(lng)||!Number.isFinite(lat))continue;
    if(lng<BOUNDS[0]||lng>BOUNDS[2]||lat<BOUNDS[1]||lat>BOUNDS[3])continue;
    const id=`${name}|${lng.toFixed(5)}|${lat.toFixed(5)}`;if(seen.has(id))continue;seen.add(id);
    out.push({name,category,
      lng,lat,address:String(tags['addr:full']||tags['addr:street']||'').slice(0,150),
      source:'© OpenStreetMap 기여자 · 영업 여부 미확인'});
    if(out.length>=limit)break;
  }
  return out;
}
export async function searchNamedOsm(term,{signal,fetcher=fetch}={}){
  const query=String(term||'').trim();
  if(query.length<2||query.length>40)return [];
  const url=`/api/osm-name-search?q=${encodeURIComponent(query)}`;
  const response=await fetcher(url,{signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`OSM 장소 검색 실패 (${response.status})`);
  return normalizeNamedOsm(await response.json(),query);
}
