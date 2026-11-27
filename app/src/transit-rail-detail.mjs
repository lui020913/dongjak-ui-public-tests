import {VERIFIED_STATIONS} from './fixed-rail-data.js';
// A rail-only itinerary still contains separate boarding legs at each line change.
export function splitRailDetail(detail,stations=VERIFIED_STATIONS){
 if(detail?.kind!=='rail'||detail.legs||!Array.isArray(detail.lines)||!Array.isArray(detail.stops)||detail.lines.length!==detail.stops.length-1||detail.lines.length<2)return detail;
 const legs=[];let start=0;
 for(let i=1;i<=detail.lines.length;i++){
  if(i<detail.lines.length&&detail.lines[i]===detail.lines[start])continue;
  const stops=detail.stops.slice(start,i+1);
  legs.push({kind:'rail',lines:[detail.lines[start]],stops,origin:stops[0],destination:stops.at(-1)});start=i;
 }
 if(legs.length<2||!detail.first||!detail.last||!detail.targets?.length)return detail;
 const point=name=>{const p=stations[name];return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)?{lng:p[0],lat:p[1]}:null;};
 const targets=[...legs.flatMap(leg=>[point(leg.origin),point(leg.destination)]),detail.targets.at(-1),detail.targets.at(-1)];
 if(targets.some(p=>!p))return detail;
 const transfers=legs.slice(1).map(()=>({meters:0,minutes:0,stationTransfer:true}));
 return {...detail,legs,walks:[detail.first,...transfers,detail.last],targets,priLegs:[detail.pri?.first??null,...transfers.map(()=>null),detail.pri?.last??null]};
}
