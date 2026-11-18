/**
 * 서울시 공식 ARS 정류장 데이터로 '(중)' 중앙차로 승강장 양쪽을 분리합니다.
 * 정류장 이름만 보고 두 좌표를 임의로 생성하지 않습니다.
 * 상행·하행은 버스 노선에 따라 다를 수 있어, 공식 제공 방향(adirection)을 우선 표기합니다.
 */
export function isMedianBusStopName(name=''){
  return /[\(（]\s*(중|중앙)\s*[\)）]|중앙\s*(버스)?\s*(정류장|차로)/.test(String(name));
}
export function medianStopBaseName(name=''){
  return String(name).replace(/[\(（]\s*(중|중앙)\s*[\)）]/g,'')
    .replace(/중앙\s*(버스)?\s*(정류장|차로)/g,'')
    .replace(/[\s.·\-]/g,'').trim();
}
const metersBetween=(a,b)=>{
  const lat=(a[1]+b[1])*Math.PI/360;
  return Math.hypot((a[0]-b[0])*111320*Math.cos(lat),(a[1]-b[1])*111320);
};
function rowsFromSeoul(body){
  const raw=body?.msgBody?.itemList??body?.msgBody?.item??body?.itemList??body?.items??[];
  return Array.isArray(raw)?raw:raw?[raw]:[];
}
export function normalizeMedianBusStops(body,{name='',lng,lat,radius=125}={}){
  if(!Number.isFinite(lng)||!Number.isFinite(lat)||!isMedianBusStopName(name))return [];
  const wanted=medianStopBaseName(name);
  if(!wanted)return [];
  const results=new Map();
  for(const row of rowsFromSeoul(body)){
    const arsId=String(row.arsId||'').trim();
    const nameOfficial=String(row.stNm??row.stnNm??row.stationNm??'').trim();
    const x=Number(row.gpsX??row.tmX),y=Number(row.gpsY??row.tmY);
    if(!/^\d{5}$/.test(arsId)||!Number.isFinite(x)||!Number.isFinite(y))continue;
    if(x<126||x>128||y<37||y>38)continue;
    if(metersBetween([lng,lat],[x,y])>radius)continue;
    const found=medianStopBaseName(nameOfficial);
    // 공식 데이터에서 '(중)'이 생략되는 경우도 있으므로 같은 기본 정류장명만 연결.
    if(!found || found!==wanted)continue;
    const direction=String(row.adirection??row.direction??'').trim().slice(0,55);
    results.set(arsId,{
      id:`seoul-bus/${arsId}`,kind:'bus',median:true,arsId,name:nameOfficial||name,
      lng:x,lat:y,lines:[],direction,source:'seoul-official-bus-stop'
    });
  }
  // 데이터에서 같은 정류장 좌표가 중복 수록된 경우 임의로 이동시키지 않습니다.
  // 각기 다른 ARS가 실제 서로 다른 위치인 경우에만 두 개의 지점으로 표시합니다.
  const distinct=[];
  for(const item of results.values()){
    if(!distinct.some(existing=>metersBetween([existing.lng,existing.lat],[item.lng,item.lat])<3))distinct.push(item);
  }
  return distinct.sort((a,b)=>a.arsId.localeCompare(b.arsId));
}
export function busStopDisplayName(stop){
  const name=String(stop?.name||'버스정류장');
  if(!stop?.median)return name;
  const direction=String(stop.direction||'').trim();
  const directionLabel=direction?(direction.includes('방면')?direction:`${direction} 방면`):`ARS ${stop.arsId||'미확인'}`;
  return `${name} · ${directionLabel}`;
}
