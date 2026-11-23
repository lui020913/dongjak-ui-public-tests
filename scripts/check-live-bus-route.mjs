import assert from 'node:assert/strict';
// A transient Seoul bus-path upstream 502 must not fail an unrelated UI release.
// Still require real geometry from one known route; no simulated success or bypass.
const ids=['100100553','100100112'];
const transientStatuses=new Set([502,503,504]);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let success=false;
let lastFailure='';
for(const id of ids){
 for(let attempt=1;attempt<=3;attempt++){
  const url=new URL('/api/transport/bus/route-path',process.argv[2]);
  url.searchParams.set('routeId',id);
  let response;
  try{response=await fetch(url,{signal:AbortSignal.timeout(25000),cache:'no-store'});}
  catch(error){
   lastFailure='NETWORK_OR_TIMEOUT';
   if(attempt<3){console.log('BUS_ROUTE_LIVE: transient network error, retry '+attempt+'/3');await delay(attempt*600);continue;}
   break;
  }
  let data;
  try{data=await response.json();}catch{throw Error('BUS_ROUTE_LIVE: HTTP '+response.status+' non-JSON response');}
  if(!response.ok){
   const code=String(data?.code||'UNKNOWN').replace(/[^A-Z_]/g,'').slice(0,80);
   if(code==='ROUTE_PATH_UNAVAILABLE'){
    console.log('BUS_ROUTE_LIVE: '+id+' unavailable; check next known ID');
    lastFailure=code;break;
   }
   if(transientStatuses.has(response.status)&&code==='ROUTE_PATH_UPSTREAM'){
    lastFailure=code;
    if(attempt<3){console.log('BUS_ROUTE_LIVE: upstream HTTP '+response.status+' retry '+attempt+'/3');await delay(attempt*600);continue;}
    console.log('BUS_ROUTE_LIVE: '+id+' upstream unavailable after retries; try other route');
    break;
   }
   throw Error('BUS_ROUTE_LIVE: HTTP '+response.status+' '+code);
  }
  assert.equal(data.routeId,id);
  assert.ok(Array.isArray(data.coordinates)&&data.coordinates.length>=10,'BUS_ROUTE_LIVE: route coordinates missing');
  assert.ok(data.coordinates.every(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=33&&p[1]<=39),'BUS_ROUTE_LIVE: invalid coordinates');
  console.log('BUS_ROUTE_LIVE: '+id+', '+data.coordinates.length+' official coordinates');
  success=true;break;
 }
 if(success)break;
}
assert.ok(success,'BUS_ROUTE_LIVE: neither known route returned official geometry; last='+lastFailure);
