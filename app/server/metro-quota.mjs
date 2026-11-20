// Shared best-effort quota circuit breaker, keyed by a digest instead of the secret.
// Cache API is regional; this is not a globally distributed request counter.
const blocks=new Map();
const KST=9*3600000,DAY=86400000;
export function nextKstDay(now=Date.now()){return (Math.floor((now+KST)/DAY)+1)*DAY-KST;}
async function quotaKey(request,key){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
 const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 const url=new URL('/api/transport/.internal-metro-quota-v1/'+hash,request.url);
 return {hash,request:new Request(url)};
}
export async function metroQuotaUntil(request,key){
 if(!key)return 0;
 const id=await quotaKey(request,key),now=Date.now();
 const local=blocks.get(id.hash)||0;
 if(local>now)return local;
 if(typeof caches!=='undefined')try{
  const entry=await caches.default.match(id.request);
  const until=Number(await entry?.text());
  if(Number.isFinite(until)&&until>now){blocks.set(id.hash,until);return until;}
 }catch{}
 return 0;
}
export async function markMetroQuota(request,key){
 if(!key)return 0;
 const id=await quotaKey(request,key),until=nextKstDay();
 blocks.set(id.hash,until);
 if(typeof caches!=='undefined')try{
  await caches.default.put(id.request,new Response(String(until),{headers:{'Cache-Control':'public, max-age='+Math.max(1,Math.ceil((until-Date.now())/1000))}}));
 }catch{}
 return until;
}
export const QUOTA_MESSAGE='서울시 실시간 지하철 API의 일일 호출 한도에 도달했습니다.';
export function metroQuotaResponse(until,extra={}){
 return new Response(JSON.stringify({...extra,ok:false,code:'ERROR-337',error:QUOTA_MESSAGE,retryAfterSeconds:Math.max(1,Math.ceil((until-Date.now())/1000))}),{status:429,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Retry-After':String(Math.max(1,Math.ceil((until-Date.now())/1000)))}});
}
