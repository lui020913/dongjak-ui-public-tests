/** Seoul published adult smart-card base fares, checked 2026-11-26.
 * https://sftc.seoul.go.kr/seoul/mulga/main/contents.do?menuNo=200021
 * https://sftc.seoul.go.kr/seoul/mulga/main/contents.do?menuNo=200022
 * Official route types: https://t-data.seoul.go.kr/dataprovide/trafficdataviewopenapi.do?data_id=1053
 * Base fare only, not a charge quote; no age, discount, extra distance, or
 * actual transfer validity inference. Unknown/out-of-scope services fail closed.
 */
export const TRANSIT_FARE_SOURCE='https://news.seoul.go.kr/traffic/traffic_price';
const busFares={'2':1200,'3':1500,'4':1500,'5':1400,'6':3000};
const knownRail=new Set(['1','2','4','7','9','신림']);
export function transitBaseFare(plan){
 const legs=plan?.legs||[plan];
 if(!legs.length)return null;
 const fares=legs.map(leg=>{
  if(leg?.kind==='rail')return Array.isArray(leg.lines)&&leg.lines.length&&leg.lines.every(l=>knownRail.has(String(l)))?1550:null;
  if(leg?.kind!=='bus')return null;
  const type=String(leg.routeType??'');
  if(/^N\d/i.test(String(leg.route||'')))return type==='3'||type==='4'?2500:null;
  return busFares[type]??null;
 });
 if(fares.some(f=>!Number.isFinite(f)))return null;
 return {won:Math.max(...fares),conditional:legs.length>1||plan.kind==='rail',basis:'성인 교통카드 일반 기본운임',verifiedOn:'2026-11-26'};
}
export function transitFareText(plan){
 const fare=transitBaseFare(plan);
 return fare?'기본운임 '+fare.won.toLocaleString('ko-KR')+'원':'기본운임 미확인';
}
