import assert from 'node:assert/strict';
// Validate genuine route coordinates. Transient Seoul upstream 5xx errors may
// clear on a short retry; they must NEVER count as successful validation.
const ids=['100100553','100100112'];
const transient=new Set([500,502,503,504]);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let success=false,diagnostic='no known route produced geometry';
for(const id of ids){
 const url=new URL('/api/transport/bus/route-path',process.argv[2]);
 url.searchParams.set('routeId',id);
 for(let attempt=1;attempt<=3;attempt++){
  let response,data;
  try {
   response=await fetch(url,{signal:AbortSignal.timeout(25000),cache:'no-store'});
   data=await response.json();
  } catch(error){
   diagnostic='request/JSON failed for '+id+': '+String(error?.name||'unknown');
   if(attempt<3){console.warn('BUS_ROUTE_LIVE: retry '+id+' after transient request failure ('+attempt+'/3)');await pause(1000*attempt);continue;}
   break;
  }
  if(!response.ok){
   const code=String(data?.code||'UNKNOWN').replace(/[^A-Z_]/g,'').slice(0,80);
   if(code==='ROUTE_PATH_UNAVAILABLE'){
    diagnostic='known route '+id+' unavailable';console.log('BUS_ROUTE_LIVE: '+id+' unavailable; check next known ID');break;
   }
   diagnostic='HTTP '+response.status+' '+code+' for '+id;
   if(transient.has(response.status)&&attempt<3){
    console.warn('BUS_ROUTE_LIVE: transient upstream response '+response.status+' for '+id+'; retry '+attempt+'/3');
    await pause(1000*attempt);continue;
   }
   break;
  }
  assert.equal(data.routeId,id);
  assert.ok(Array.isArray(data.coordinates)&&data.coordinates.length>=10,'BUS_ROUTE_LIVE: route coordinates missing');
  assert.ok(data.coordinates.every(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=33&&p[1]<=39),'BUS_ROUTE_LIVE: invalid coordinates');
  console.log('BUS_ROUTE_LIVE: '+id+', '+data.coordinates.length+' official coordinates');
  success=true;break;
 }
 if(success)break;
}
assert.ok(success,'BUS_ROUTE_LIVE: neither known route returned official geometry ('+diagnostic+')');
