import {busDirectionLabel,busDirectionNames} from './bus-search-directions.mjs';
import {VERIFIED_STATIONS,FIXED_RAIL_STATION_ORDER} from './fixed-rail-data.js';
import {normalizeKoreanSearch,koreanSearchScore} from './korean-search.js';

export function routeStationMatches(query){
  return Object.entries(VERIFIED_STATIONS).flatMap(([name,[lng,lat]])=>{
    const title=name+'역';
    if(koreanSearchScore(query,title)<55)return [];
    const lines=Object.entries(FIXED_RAIL_STATION_ORDER).filter(([,names])=>names.includes(name))
      .map(([line])=>line==='신림'?'신림선':line+'호선');
    return [{name:title,label:title,lng,lat,kind:'subway',category:'지하철·철도역',lines,source:'verified-station'}];
  });
}
function typeOf(p){
  return p.kind==='bus'||/버스정류장/.test(p.category||'')?'bus':
    p.kind==='subway'||/지하철|철도역/.test(p.category||'')?'subway':'place';
}
export function mergeRouteSearchResults(query,...groups){
  const term=normalizeKoreanSearch(query),rows=[];
  for(const p of groups.flat()){
    if(!p?.name||!Number.isFinite(p.lng)||!Number.isFinite(p.lat))continue;
    const kind=typeOf(p),name=normalizeKoreanSearch(p.name);
    const duplicate=rows.find(x=>x.kind===kind&&(
      kind==='bus'&&p.arsId&&x.arsId?x.arsId===p.arsId:
      normalizeKoreanSearch(x.name)===name&&Math.abs(x.lng-p.lng)<.00015&&Math.abs(x.lat-p.lat)<.00015));
    if(duplicate){
      duplicate.directions=busDirectionNames([duplicate.direction,p.direction,...(duplicate.directions||[]),...(p.directions||[])]);
      duplicate.address||=p.address;
      duplicate.lines=[...new Set([...(duplicate.lines||[]),...(p.lines||[])])];
      continue;
    }
    rows.push({...p,kind});
  }
  const score=p=>Math.max(koreanSearchScore(term,p.name),koreanSearchScore(term,p.address||''))+(p.kind==='subway'&&normalizeKoreanSearch(p.name).replace(/역$/,'')===term.replace(/역$/,'')?12:0);
  return rows.sort((a,b)=>Number(a.kind==='bus')-Number(b.kind==='bus')||score(b)-score(a)).slice(0,40);
}
export function routeResultSubtitle(place){
  if(typeOf(place)==='bus'){
    return ['버스정류장',busDirectionLabel(place)].join(' · ');
  }
  const address=String(place.address||'').replace(/(?:^|\s*·\s*)ARS\s*\d+/gi,'').trim();
  return [...new Set([place.category||'장소',...(place.lines||[]),address].filter(Boolean))].join(' · ');
}
