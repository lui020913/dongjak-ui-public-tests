/**
 * Seoul bus stationinfo sometimes returns a non-zero msgHeader and an
 * explicit "no results" message for an empty coordinate search. Treat it as
 * a legitimate empty result ONLY in station proximity/name queries. Never
 * downgrade auth errors or arbitrary upstream errors to empty results.
 */
export function isSeoulBusNoResult(body){
  const header=body?.msgHeader;
  const code=Number(header?.headerCd);
  const message=String(header?.headerMsg||'').trim();
  return Number.isFinite(code) && code!==0 &&
    /(?:결과가\s*없습니다|조회\s*결과가\s*없|데이터가\s*없습니다|해당하는\s*자료가\s*없습니다)/.test(message);
}

// 서울시 공식 API 응답을 사용자 화면에 노출할 최소 필드만 정규화합니다.
export function parseSeoulBusArrival(body){
  const raw=body?.msgBody?.itemList ?? body?.msgBody?.item ?? body?.itemList ?? [];
  const rows=Array.isArray(raw)?raw:raw?[raw]:[];
  return rows.map(x=>({
    route:String(x.rtNm??x.busRouteAbrv??x.busRouteId??'노선 정보 없음'),
    ...( /^\d{5,15}$/.test(String(x.busRouteId??'')) ? {routeId:String(x.busRouteId)} : {}),
    ...(x.routeType!=null ? {routeType:String(x.routeType)} : {}),
    destination:String(x.adirection??x.stNm??''),
    message:String(x.arrmsg1??x.arrmsg2??'도착정보 없음'),
    nextMessage:String(x.arrmsg2??'').trim()
  }));
}
const SUBWAY_NAMES={1001:'1호선',1002:'2호선',1003:'3호선',1004:'4호선',1005:'5호선',1006:'6호선',1007:'7호선',1008:'8호선',1009:'9호선',1094:'신림선',1092:'우이신설선'};
export function parseSeoulSubwayArrival(body){
  const rows=Array.isArray(body?.realtimeArrivalList)?body.realtimeArrivalList:[];
  return rows.map(x=>{
    const line=SUBWAY_NAMES[x.subwayId]||String(x.subwayId||'호선 미확인');
    const direction=[x.updnLine,x.trainLineNm,x.btrainSttus].filter(Boolean).join(' · ');
    const seconds=Number(x.barvlDt);
    let message=String(x.arvlMsg2||'정보 없음');
    if(Number.isFinite(seconds)&&seconds>0 && !/(?:\d+\s*분|\d+\s*초|곧|도착|진입|출발)/.test(message))message=`약 ${Math.ceil(seconds/60)}분 후 · ${message}`;
    return {line,direction,directionType:String(x.updnLine||'').trim(),destination:String(x.bstatnNm||''),message};
  });
}

// 좌표기반 공식 정류소 조회 결과에서 가장 가까운 ARS 정류소를 선택합니다.
// 70m를 넘는 정류소는 자동 연결하지 않아 잘못된 도착예정을 방지합니다.
export function resolveSeoulBusStation(body,lat,lng,name=''){
  const raw=body?.msgBody?.itemList??body?.msgBody?.item??body?.itemList??[];
  const rows=Array.isArray(raw)?raw:(raw?[raw]:[]);
  const target=String(name).replace(/[^가-힣a-zA-Z0-9]/g,'');
  const valid=rows.map(row=>{
    const arsId=String(row.arsId||'').trim();
    const x=Number(row.gpsX??row.tmX);
    const y=Number(row.gpsY??row.tmY);
    let distance=Number(row.dist);
    if(Number.isFinite(x)&&Number.isFinite(y)&&x>100&&x<140&&y>30&&y<45){
      const r=Math.PI/180;
      const a=Math.sin((y-lat)*r/2)**2 + Math.cos(lat*r)*Math.cos(y*r)*Math.sin((x-lng)*r/2)**2;
      distance=6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    }
    const otherName=String(row.stNm??row.stationNm??'').replace(/[^가-힣a-zA-Z0-9]/g,'');
    const matching=target&&otherName&&(target.includes(otherName)||otherName.includes(target));
    return {arsId,distance,score:distance-(matching?8:0)};
  }).filter(x=>/^\d{5}$/.test(x.arsId)&&Number.isFinite(x.distance)&&x.distance<=70).sort((a,b)=>a.score-b.score);
  return valid[0]?.arsId||'';
}


/** 좌표 주변 서울시 공식 정류소를 이름·ARS·GPS 기준으로 정규화합니다. */
export function parseSeoulBusStopsNearby(body,lat,lng,radius=130){
  const raw=body?.msgBody?.itemList??body?.msgBody?.item??body?.itemList??body?.items??[];
  const rows=Array.isArray(raw)?raw:(raw?[raw]:[]);
  const rad=Math.PI/180;
  const output=new Map();
  for(const row of rows){
    const arsId=String(row.arsId??row.arsid??'').trim();
    const name=String(row.stNm??row.stationNm??row.stationName??row.busStopNm??'').trim();
    const x=Number(row.gpsX??row.tmX),y=Number(row.gpsY??row.tmY);
    if(!/^\d{5}$/.test(arsId)||!name||!Number.isFinite(x)||!Number.isFinite(y))continue;
    if(x<126||x>128||y<37||y>38)continue;
    const a=Math.sin((y-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(y*rad)*Math.sin((x-lng)*rad/2)**2;
    const distance=6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    if(!Number.isFinite(distance)||distance>radius)continue;
    if(!output.has(arsId))output.set(arsId,{
      id:`seoul-bus/${arsId}`,kind:'bus',name,arsId,lng:x,lat:y,lines:[],
      source:'seoul-official-bus-stop',distanceMeters:Math.round(distance)
    });
  }
  return [...output.values()].sort((a,b)=>a.distanceMeters-b.distanceMeters);
}


// 서울시 지하철 API는 성공(INFO-000)이더라도 errorMessage 객체를 함께 반환합니다.
// 따라서 errorMessage의 존재 여부가 아니라 응답 코드 자체를 판단해야 합니다.
export function inspectSeoulApiResponse(data){
  const meta=data?.errorMessage;
  const code=String((meta && typeof meta==='object' ? meta.code : '') || data?.RESULT?.CODE || data?.code || '').trim();
  if(code==='INFO-000')return {state:'ok',code};
  if(code==='INFO-200')return {state:'empty',code,message:'이 역에 제공되는 실시간 도착정보가 없습니다.'};
  if(code){
    const known={
      'INFO-100':'실시간 지하철 API 인증키가 유효하지 않습니다. 서울 열린데이터광장의 실시간 지하철 전용 키인지 확인해 주세요.',
      'ERROR-300':'서울시 API의 필수 조회 인자가 누락됐습니다.',
      'ERROR-301':'서울시 API의 응답 형식 설정이 올바르지 않습니다.',
      'ERROR-310':'서울시 API 서비스 이름이 올바르지 않습니다.',
      'ERROR-331':'서울시 API 조회 시작 위치가 올바르지 않습니다.',
      'ERROR-332':'서울시 API 조회 종료 위치가 올바르지 않습니다.',
      'ERROR-337':'서울시 실시간 지하철 API의 일일 호출 한도에 도달했습니다.',
      'ERROR-500':'서울시 API 서버에서 오류가 발생했습니다.',
      'ERROR-600':'서울시 API 데이터베이스 연결 오류입니다.'
    };
    return {state:'error',code,message:known[code]||`서울시 API가 오류 코드 ${code}를 반환했습니다.`};
  }
  if(meta)return {state:'error',code:'UNKNOWN_RESPONSE',message:'서울시 API에서 알 수 없는 응답 오류가 왔습니다.'};
  return {state:'ok',code:''};
}
