import {normalizeFacilityName,normalizeFacilityCategory} from './facility-display-names.js';
import {normalizeKoreanSearch,koreanSearchScore} from './korean-search.js';
import {IMPORTANT_PLACES} from './important-place-click.js';
import {DONGJAK_UNIVERSITIES} from './education-layer.js';
// v17.4 경량 장소 검색: 명시적으로 검색을 누를 때에만 Photon 공개 검색을 호출합니다.
// 공용 데모 서비스이므로 발표·시연 규모만 가정하고, 대규모 운영은 정식 검색 API로 교체해야 합니다.
const PHOTON_ENDPOINT = 'https://photon.komoot.io/api';
const SEOUL_BBOX = '126.78,37.40,127.20,37.70';

export function buildPlaceSearchUrl(rawQuery) {
  const query = String(rawQuery || '').trim();
  if (query.length < 2 || query.length > 80) throw new Error('장소명이나 주소를 2~80자로 입력해 주세요.');
  const url = new URL(PHOTON_ENDPOINT);
  url.search = new URLSearchParams({q: query, bbox: SEOUL_BBOX, lon: '126.9494', lat: '37.4987', zoom: '13', lang: 'ko', limit: '8'});
  return url.toString();
}

export function normalizePlaceSearchResults(payload) {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const seen = new Set();
  const results = [];
  for (const feature of features) {
    const coords = feature?.geometry?.type === 'Point' ? feature.geometry.coordinates : [];
    const lng = Number(coords?.[0]);
    const lat = Number(coords?.[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < 126.78 || lng > 127.20 || lat < 37.4 || lat > 37.7) continue;
    const p = feature?.properties || {};
    const types={convenience:'편의점',supermarket:'마트',cafe:'카페',restaurant:'음식점',fast_food:'패스트푸드',bakery:'제과점'};
    const rawName=String(p.name || p.street || p.district || p.city || '').trim();
    const name = normalizeFacilityName(rawName,types[String(p.osm_value||'').toLowerCase()]||'');
    if (!name) continue;
    const address = [...new Set([p.street, p.housenumber, p.district, p.city, p.county, p.state]
      .map(s => String(s || '').trim()).filter(Boolean))].join(' · ');
    const marker = `${name}:${lng.toFixed(5)}:${lat.toFixed(5)}`;
    if (seen.has(marker)) continue;
    seen.add(marker);
    const osmValue = String(p.osm_value || '').toLowerCase();
    const osmKey = String(p.osm_key || '').toLowerCase();
    const category = osmKey === 'railway' || ['subway', 'station', 'halt'].includes(osmValue)
      ? '지하철·철도역'
      : osmValue.includes('bus') ? '버스정류장' : normalizeFacilityCategory(types[osmValue]||osmValue||'장소',rawName);
    results.push({name, address, lng, lat, category:/[가-힣]/.test(category)||category==='AED'||category==='ATM'?category:'장소', label: name});
  }
  return results.slice(0, 8);
}

// Local verified landmarks cover common destinations when a public geocoder is unavailable.
// Representative coordinates are NOT entrances or addresses with rooftop-level precision.
export function searchLocalPlaces(query){
  const q=normalizeKoreanSearch(query);
  if(q.length<2)return [];
  const aliases={중앙대:'중앙대학교',숭실대:'숭실대학교',총신대:'총신대학교',서울현충원:'국립서울현충원',구청:'동작구청'};
  const term=aliases[q]||q;
  const seen=new Set();
  return [...IMPORTANT_PLACES,...DONGJAK_UNIVERSITIES].filter(p=>{
    const title=normalizeKoreanSearch(p.name);
    return title.includes(q)||title.includes(term)||koreanSearchScore(query,p.name)>=55;
  }).filter(p=>{
    const key=`${p.name}:${Number(p.lng).toFixed(4)}`;
    if(seen.has(key))return false;seen.add(key);return true;
  }).map(p=>({name:p.name,address:p.address||'',lng:p.lng,lat:p.lat,
    kind:'point',category:p.type||p.kind||'일반 장소',label:p.name,source:'verified-local'})).slice(0,8);
}
const upstreamEndpoints=[q=>buildPlaceSearchUrl(q), q=>`/api/place-search?q=${encodeURIComponent(q)}`];
async function queryEndpoint(url,{signal,timeoutMs=2800}={}){
  const timeout=new AbortController();
  let timeoutId;
  const abort=()=>timeout.abort();
  if(signal?.aborted)throw new DOMException('검색 취소','AbortError');
  signal?.addEventListener('abort',abort,{once:true});
  try{
    timeoutId=setTimeout(()=>timeout.abort(),timeoutMs);
    const response=await fetch(url,{signal:timeout.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(response.status===429?'장소 검색 요청이 많습니다. 잠시 후 다시 시도해 주세요.':`장소 검색 오류 (${response.status})`);
    return normalizePlaceSearchResults(await response.json());
  }finally{clearTimeout(timeoutId);signal?.removeEventListener('abort',abort);}
}
/** Places, parks, public facilities and addresses: local results survive network errors. */
export async function searchPlaces(query,{signal,includeRemote=false}={}){
  const q=String(query||'').trim();
  buildPlaceSearchUrl(q); // same validation used by both endpoints
  const local=searchLocalPlaces(q);
  // Local named places should appear immediately, even when mobile connections are slow.
  if(local.length&&!includeRemote)return local;
  let lastError;
  for(const endpoint of upstreamEndpoints){
    if(signal?.aborted)throw new DOMException('검색 취소','AbortError');
    try{
      const found=await queryEndpoint(endpoint(q),{signal});
      if(found.length)return [...local,...found];
    }catch(error){
      if(signal?.aborted)throw new DOMException('검색 취소','AbortError');
      lastError=error;
    }
  }
  if(lastError&&!local.length)throw lastError;
  return local;
}
