import assert from 'node:assert/strict';
const url=new URL('/api/transport/bus/route-path',process.argv[2]);const id='100100553';url.searchParams.set('routeId',id);
const response=await fetch(url,{signal:AbortSignal.timeout(25000),cache:'no-store'});
let data;try{data=await response.json();}catch{throw Error('BUS_ROUTE_LIVE: HTTP '+response.status+' non-JSON response');}
if(!response.ok)throw Error('BUS_ROUTE_LIVE: HTTP '+response.status+' '+String(data?.code||'UNKNOWN').replace(/[^A-Z_]/g,'').slice(0,80));
assert.equal(data.routeId,id);assert.ok(Array.isArray(data.coordinates)&&data.coordinates.length>=10,'BUS_ROUTE_LIVE: route coordinates missing');
assert.ok(data.coordinates.every(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=33&&p[1]<=39),'BUS_ROUTE_LIVE: invalid coordinates');
console.log('BUS_ROUTE_LIVE: Seoul 350, '+data.coordinates.length+' official coordinates');
