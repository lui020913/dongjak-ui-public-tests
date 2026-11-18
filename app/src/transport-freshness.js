/**
 * Seoul TOPIS realtimeStationArrival source-time validation.
 * recptnDt is the source generation time (Asia/Seoul), NOT the time our
 * Cloudflare/local proxy happened to fetch the response.
 *
 * Keep this shared by the Pages Function and the local transport server.
 * Fail closed for missing/old source times: never display an unverified
 * countdown as though a train is currently running.
 */
export const SUBWAY_MAX_SOURCE_AGE_MS=3*60*1000;
export const SUBWAY_CLOCK_SKEW_MS=45*1000;
export function parseSeoulArrivalTime(input){
  const raw=String(input??'').trim();
  if(!raw)return NaN;
  // Standard Korean local date/time from TOPIS, sometimes separated with T.
  const m=/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})[ T](\d{1,2}):(\d{2}):(\d{2})(?:\.\d+)?$/.exec(raw);
  if(m){
    const [,yy,mo,day,hh,mm,ss]=m.map((v,i)=>i?Number(v):v);
    if(mo<1||mo>12||day<1||day>31||hh>23||mm>59||ss>59)return NaN;
    const check=new Date(Date.UTC(yy,mo-1,day));
    if(check.getUTCFullYear()!==yy||check.getUTCMonth()!==mo-1||check.getUTCDate()!==day)return NaN;
    return Date.UTC(yy,mo-1,day,hh,mm,ss)-9*3600000;
  }
  // Explicit offset forms only: never trust a server-local timezone.
  if(/(?:Z|[+-]\d{2}:\d{2})$/i.test(raw))return Date.parse(raw);
  return NaN;
}
export function seoulHHMM(ms){
  if(!Number.isFinite(ms))return '';
  return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms));
}
/**
 * barvlDt is an ETA estimate, not proof that the entire train-status row has
 * ceased to exist.  Some lines provide a recent train location/status while
 * the ETA is already zero/expired.  Preserve that only as a clearly labelled
 * last report, never as a live arrival countdown.
 */
const TOPIS_ARRIVAL_STATES=Object.freeze({
  '0':'역 진입', '1':'역 도착', '2':'역 출발', '3':'전역 출발',
  '4':'전역 진입', '5':'전역 도착', '99':'운행 중'
});
function lastReportedPosition(row){
  const code=String(row?.arvlCd??'').trim();
  const value=String(row?.arvlMsg2??'').trim();
  const positional=/^(?:전전역|전역|진입|도착|출발|운행\s*중)/.test(value);
  // A free-text numeric ETA that has already passed must not be resurrected.
  if(positional)return value.slice(0,80);
  return TOPIS_ARRIVAL_STATES[code]||'';
}
export function validateSeoulSubwayFeed(body,{nowMs=Date.now(),maxAgeMs=SUBWAY_MAX_SOURCE_AGE_MS}={}){
  const all=Array.isArray(body?.realtimeArrivalList)?body.realtimeArrivalList:[];
  const makeStats=(extra={})=>({rawCount:all.length,freshCount:0,validEtaCount:0,
    expiredEtaCount:0,missingEtaCount:0,recentStatusCount:0,...extra});
  if(!all.length)return {state:'empty',rows:[],sourceAt:'',sourceAgeSeconds:null,
    diagnostics:makeStats(),message:'서울시 API에 현재 도착 예정 열차 정보가 없습니다. 막차 이후이거나 제공 자료가 없을 수 있습니다.'};
  const dated=all.map(row=>({row,sourceMs:parseSeoulArrivalTime(row.recptnDt)}));
  const known=dated.filter(x=>Number.isFinite(x.sourceMs));
  const latest=known.length?Math.max(...known.map(x=>x.sourceMs)):NaN;
  const sourceAt=seoulHHMM(latest);
  const sourceAgeSeconds=Number.isFinite(latest)?Math.max(0,Math.round((nowMs-latest)/1000)):null;
  const fresh=known.filter(x=>{
    const age=nowMs-x.sourceMs;
    return age>=-SUBWAY_CLOCK_SKEW_MS&&age<=maxAgeMs;
  });
  const valid=[],expired=[],noEta=[];
  for(const entry of fresh){
    const raw=entry.row.barvlDt;
    const eta=Number(raw);
    if(raw==null||String(raw).trim()===''||!Number.isFinite(eta)||eta<=0){noEta.push(entry);continue;}
    if(nowMs-entry.sourceMs>eta*1000+30_000)expired.push(entry);
    else valid.push(entry);
  }
  const statusCandidates=[...expired,...noEta].filter(x=>lastReportedPosition(x.row));
  const diagnostics=makeStats({freshCount:fresh.length,validEtaCount:valid.length,
    expiredEtaCount:expired.length,missingEtaCount:noEta.length,
    recentStatusCount:statusCandidates.length});
  const base={sourceAt,sourceAgeSeconds,diagnostics};
  if(valid.length){
    const rows=valid.map(({row,sourceMs})=>{
      const age=Math.max(0,(nowMs-sourceMs)/1000);
      const barvl=Number(row.barvlDt);
      const remainingSeconds=Math.max(0,barvl-Math.floor(age));
      const original=String(row.arvlMsg2||'').trim();
      const message=age>=20
        ? (remainingSeconds>=60?`약 ${Math.ceil(remainingSeconds/60)}분 후`:remainingSeconds>0?'곧 도착':'도착 예정')
        :original;
      return {...row,barvlDt:String(remainingSeconds),arvlMsg2:message||original};
    });
    return {...base,state:'ok',rows,message:'',sourceTimestamp:new Date(latest).toISOString()};
  }
  if(statusCandidates.length){
    // This is a status *last reported* within three minutes, not a verified
    // current position, nor an ETA.  Never preserve an expired numeric ETA.
    const rows=statusCandidates.slice(0,16).map(({row})=>({...row,
      barvlDt:'',djEtaValidity:'last-report',
      arvlMsg2:`최근 수신: ${lastReportedPosition(row)} · 도착시간 미확인` }));
    return {...base,state:'status-only',rows,
      message:'서울시 원본 열차정보는 최근 갱신됐으나 도착예정시간은 검증되지 않았습니다. 아래는 마지막 수신 상태이며 현재 위치나 남은 시간을 의미하지 않습니다.',
      sourceTimestamp:new Date(latest).toISOString()};
  }
  const state=known.length?(fresh.length?'expired':'stale'):'unverified';
  const message=state==='unverified'
    ?'서울시 열차정보의 생성 시각을 확인할 수 없어 도착예정을 숨겼습니다.'
    :state==='expired'
      ?'최근 자료가 수신됐지만 유효한 도착예정시간과 운행 상태를 확인하지 못했습니다.'
      :'서울시 열차정보가 오래되어 도착예정을 숨겼습니다. 운행 종료 또는 원천 정보 갱신 지연일 수 있습니다.';
  return {...base,state,rows:[],message};
}

/**
 * Browser must independently refuse unverifiable subway arrivals. A proxy's
 * checkedAt (time we fetched) is not the provider's recptnDt (data creation).
 * Old deployed proxies without sourceTimestamp are deliberately fail-closed.
 * This does NOT hide an actual late-night train if its provider data is fresh.
 */
export function guardSubwayProxyArrival(body,{nowMs=Date.now()}={}){
  const copy={...body,items:Array.isArray(body?.items)?body.items:[]};
  const stamp=String(copy.sourceTimestamp||'').trim();
  const iso=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(stamp);
  const timestamp=iso?Date.parse(stamp):NaN;
  const age=nowMs-timestamp;
  const fresh=Number.isFinite(timestamp)&&age>=-SUBWAY_CLOCK_SKEW_MS&&age<=SUBWAY_MAX_SOURCE_AGE_MS;
  if((copy.sourceStatus==='ok'||copy.sourceStatus==='status-only')&&fresh)return {...copy,sourceVerified:true};
  // Never replace an explicit upstream error with a claim that trains ended.
  const reason=['ok','status-only'].includes(copy.sourceStatus)||(copy.items.length&&!copy.sourceStatus)
    ? '지하철 도착정보의 원본 생성 시각이 확인되지 않거나 오래되어 실시간 표시를 중단했습니다.'
    :copy.emptyMessage||'현재 검증된 실시간 지하철 도착정보가 없습니다.';
  return {...copy,items:[],sourceStatus:['ok','status-only'].includes(copy.sourceStatus)?'stale':copy.sourceStatus||'unverified',
    emptyMessage:reason,sourceVerified:false};
}
