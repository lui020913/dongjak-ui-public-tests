// Seoul T-DATA BIS: measured arrivals, never estimated from ETA.
export const SOURCE='서울시 교통빅데이터플랫폼 · 배차 정류장별 이력';
export const ENDPOINT='https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/BisTbisClCaralcSttn/1.0';
export function validDate(s){
 if(!/^\d{8}$/.test(s))return false;
 const d=new Date(s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T00:00:00Z');
 return Number.isFinite(+d)&&d.toISOString().slice(0,10).replace(/-/g,'')===s;
}
export function normalizeArrivals(rows,{routeId,date,stationId,seq}){
 const out=new Map();
 for(const r of rows){
  if(String(r.routeId??r.route_id)!==routeId||String(r.stdrDe??r.stdr_de)!==date||String(r.sttnId??r.sttn_id)!==stationId||Number(r.sttnSn??r.sttn_sn)!==Number(seq))continue;
  const stamp=String(r.arvlDt??r.arvl_dt??'').replace(/[-: T]/g,'');
  if(!/^\d{8}(?:[01]\d|2[0-3])[0-5]\d[0-5]\d$/.test(stamp)||!validDate(stamp.slice(0,8)))continue;
  const run=String(r.runSn??r.run_sn??'');
  const plan=String(r.planId??r.plan_id??'');
  out.set([stamp,run,plan].join('|'),{date:stamp.slice(0,8),time:stamp.slice(8,10)+':'+stamp.slice(10,12)+':'+stamp.slice(12),run});
 }
 return [...out.values()].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
// Unknown upstream envelopes fail closed instead of pretending to be empty.
export function extractRows(body){
 if(Array.isArray(body))return body;
 for(const v of [body?.data,body?.rows,body?.row,body?.result,body?.list,body?.response?.body?.items,body?.items,body?.data?.rows,body?.data?.list,body?.result?.data]){
  if(Array.isArray(v))return v;
 }
 if(body&&typeof body==='object'&&('routeId' in body||'route_id' in body))return [body];
 throw new Error('HISTORY_FORMAT');
}
export async function fetchArrivalHistory(query,key,{fetcher=globalThis.fetch,pageSize=5000,maxPages=10,timeout=24000}={}){
 const all=[];const signatures=new Set();let complete=false;
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{
  let startRow=1;
  for(let i=0;i<maxPages&&startRow<=9999;i++){
   // Official T-DATA supports route/date and a four-digit startRow, not
   // station filters. Read larger route-day pages and filter exact stop/seq.
   // The last accessible request can cover records beyond row 9999.
   const requested=Math.min(10000,Math.max(1,pageSize));
   const url=new URL(ENDPOINT);url.search=new URLSearchParams({apikey:key,startRow:String(startRow),rowCnt:String(requested),stdrDe:query.date,routeId:query.routeId});
   let res;
   try{res=await fetcher(url,{signal:ctrl.signal,headers:{Accept:'application/json'},redirect:'manual'});
     if([301,302,303,307,308].includes(res.status)){
       const target=new URL(res.headers.get('Location')||'',url);
       if(target.origin!==url.origin||target.pathname!==url.pathname&&target.pathname!==url.pathname+'/')throw new Error('HISTORY_REDIRECT');
       target.search=url.search;res=await fetcher(target,{signal:ctrl.signal,headers:{Accept:'application/json'},redirect:'manual'});
     }
   }catch(e){throw new Error(e?.message==='HISTORY_REDIRECT'?'HISTORY_REDIRECT':ctrl.signal.aborted?'HISTORY_TIMEOUT':'HISTORY_CONNECTION');}
   if(!res.ok)throw new Error(res.status===401||res.status===403?'HISTORY_AUTH':res.status===429?'HISTORY_QUOTA':res.status===404?'HISTORY_ENDPOINT':res.status===400?'HISTORY_REQUEST':res.status>=300&&res.status<400?'HISTORY_REDIRECT':'HISTORY_UPSTREAM');
   let body;try{body=await res.json();}catch{throw new Error('HISTORY_FORMAT');}
   const status=Number(body?.responseCode??body?.statusCode??0);
   if(status===401||status===403)throw new Error('HISTORY_AUTH');
   if(status===429)throw new Error('HISTORY_QUOTA');
   if(status>=400)throw new Error('HISTORY_UPSTREAM');
   const rows=extractRows(body);
   if(!rows.length){complete=true;break;}
   const signature=JSON.stringify([rows.length,rows[0],rows.at(-1)]);
   if(signatures.has(signature))break;
   signatures.add(signature);all.push(...normalizeArrivals(rows,query));
   if(rows.length<requested){complete=true;break;}
   startRow+=rows.length;
  }
 }finally{clearTimeout(timer);}
 const arrivals=[...new Map(all.map(a=>[JSON.stringify(a),a])).values()].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 return {status:complete?(arrivals.length?'ok':'unavailable'):'partial',source:SOURCE,arrivals,complete,notice:complete?'월 1회 갱신되는 실제 도착 이력입니다. 최근 날짜는 아직 제공되지 않을 수 있습니다.':'조회 범위 일부만 확인했습니다. 전체 도착 이력으로 해석하지 마세요.'};
}
