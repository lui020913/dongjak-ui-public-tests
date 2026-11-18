import {SOURCES,PAGE_SIZE,parseSeoulResponse,normalizeSeoulPlace} from '../../functions/lib/seoul-facility-core.mjs';

const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const utc=()=>new Date().toISOString();
const chunk=(xs,n)=>{const blocks=[];for(let i=0;i<xs.length;i+=n)blocks.push(xs.slice(i,i+n));return blocks;};
function safeError(e){return String(e?.message||e||'unknown').replace(/\b[a-f\d]{32,}\b/ig,'[redacted]').slice(0,200);}
export async function onePage(key,def,start,limit=PAGE_SIZE){
 const url=`http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/${def.service}/${start}/${start+limit-1}/`;
 // Do not expose the URL or raw upstream error: the URL contains the Seoul API key.
 // A timeout can also occur while reading res.json(), not only during fetch().
 const maxAttempts=3;
 for(let attempt=1;attempt<=maxAttempts;attempt++){
   try{
     const res=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
     if(!res.ok){
       if((res.status===429||res.status>=500)&&attempt<maxAttempts){
         await new Promise(resolve=>setTimeout(resolve,250*attempt));
         continue;
       }
       throw new Error('서울시 API HTTP '+res.status+' (page '+start+')');
     }
     const body=await res.json();
     return parseSeoulResponse(body,def.service);
   }catch(error){
     const msg=String(error?.message||error||'');
     const retryable=error?.name==='TimeoutError'||error?.name==='AbortError'||
       error instanceof TypeError||/timeout|timed out|abort/i.test(msg);
     if(!retryable)throw error;
     if(attempt===maxAttempts)throw new Error('서울시 API 응답 시간 초과 또는 네트워크 오류 (page '+start+', '+attempt+'회 시도)');
     await new Promise(resolve=>setTimeout(resolve,250*attempt));
   }
 }
}
export async function syncFacilitySource(env,def){
 if(!env.SEOUL_OPEN_API_KEY||!env.SEOUL_FACILITIES_DB)throw new Error('SEOUL_OPEN_API_KEY 또는 SEOUL_FACILITIES_DB 설정이 없습니다.');
 const db=env.SEOUL_FACILITIES_DB,run=crypto.randomUUID(),time=utc();let received=0,saved=0,total=null;const savedIds=new Set();let stage='initialization';
 try{
   // Entire dataset: do not publish an incomplete snapshot as if it were complete.
   // Sequential paging respects upstream rate limits and Worker subrequest budgets.
   for(let start=1;start<=Math.max(1,total??1);start+=PAGE_SIZE){
     stage='fetch page '+start;
     const page=await onePage(env.SEOUL_OPEN_API_KEY,def,start);
     if(total===null)total=page.total;
     received+=page.rows.length;
     const unique=new Map();for(const raw of page.rows){const place=normalizeSeoulPlace(raw,def);if(place)unique.set(place.id,place);}
     stage='D1 upsert page '+start;
     for(const group of chunk([...unique.values()],40)){
       await db.batch(group.map(p=>db.prepare(`INSERT INTO seoul_facilities
       (id,source_id,name,category,lng,lat,address,phone,website,source,updated,run_id)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,category=excluded.category,lng=excluded.lng,lat=excluded.lat,
       address=excluded.address,phone=excluded.phone,website=excluded.website,
       source=excluded.source,updated=excluded.updated,run_id=excluded.run_id`)
       .bind(p.id,def.id,p.name,p.category,p.lng,p.lat,p.address,p.phone,p.website,p.source,p.updated,run)));
       saved+=group.length;
       for(const place of group)savedIds.add(place.id);
     }
     if(page.rows.length===0 && start<=total)throw new Error('불완전한 서울시 API 페이지: '+start);
     if(total>100000)throw new Error('데이터셋 크기 제한 초과');
   }
   if(received<total)throw new Error(`부분 수집 방지: ${received}/${total}`);
   stage='finalize D1';
   await db.batch([
     db.prepare('DELETE FROM seoul_facilities WHERE source_id=? AND run_id<>?').bind(def.id,run),
     db.prepare(`INSERT INTO seoul_facility_sync(source_id,last_success,last_attempt,row_count,received_count,status,detail)
       VALUES(?,?,?,?,?,'ok','') ON CONFLICT(source_id) DO UPDATE SET
       last_success=excluded.last_success,last_attempt=excluded.last_attempt,
       row_count=excluded.row_count,received_count=excluded.received_count,status='ok',detail=''`)
       .bind(def.id,utc(),time,savedIds.size,received)
   ]);
   return {source:def.id,received,upserted:saved,stored:savedIds.size,expected:total,status:'ok'};
 }catch(e){
   // Partial upserts are retained; stale rows remain until a successful full sync.
   const detail=(stage+': '+safeError(e)).slice(0,200);
   await db.prepare(`INSERT INTO seoul_facility_sync(source_id,last_attempt,status,detail)
     VALUES(?,?,'error',?) ON CONFLICT(source_id) DO UPDATE SET last_attempt=excluded.last_attempt,status='error',detail=excluded.detail`)
     .bind(def.id,time,detail).run();
   throw new Error(def.id+': '+detail);
 }
}
async function syncAll(env){
 const result=[];
 for(const def of SOURCES){try{result.push(await syncFacilitySource(env,def));}
 catch(error){result.push({source:def.id,status:'error',message:safeError(error)});}}
 return result;
}
export default {
 async scheduled(_controller,env,ctx){ctx.waitUntil(syncAll(env).then(result=>console.log('[서울 시설 갱신]',JSON.stringify(result))).catch(e=>console.error('[서울 시설 갱신 실패]',safeError(e))));},
 async fetch(request,env){
   // Optional diagnostic endpoint, explicitly avoids triggering costly syncs via the public Internet.
   const url=new URL(request.url);
   if(url.pathname==='/health')return json({ok:true,worker:'seoul-facility-sync',keyConfigured:!!env.SEOUL_OPEN_API_KEY,dbConfigured:!!env.SEOUL_FACILITIES_DB});
   if(url.pathname==='/admin/sync' && request.method==='POST'){
     const supplied=request.headers.get('x-dongjak-sync-token')||'';
     if(!env.SEOUL_SYNC_TOKEN||supplied.length<32||supplied!==env.SEOUL_SYNC_TOKEN)return json({message:'Unauthorized'},401);
     const source=url.searchParams.get('source')||'';
     const def=SOURCES.find(x=>x.id===source);
     if(!def)return json({message:'source 값을 pharmacy / animal_pharmacy / restaurant / cafe 중 선택하세요.'},400);
     try{return json(await syncFacilitySource(env,def));}
     catch(e){return json({message:safeError(e)},502);}
   }
   return json({message:'Not Found'},404);
 }
};
