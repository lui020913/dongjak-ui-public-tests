import {validateMatchedRoad,decodeMatchedPolyline} from '../../../src/transit-road-match.mjs';
export async function onRequestPost({request}){
 try{
  const raw=await request.text();if(raw.length>90000)return new Response('Too large',{status:413});
  const {coords}=JSON.parse(raw);
  if(!Array.isArray(coords)||coords.length<2||coords.length>1200||!coords.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=126.6&&p[0]<=127.4&&p[1]>=37.2&&p[1]<=37.9))return new Response('Invalid trace',{status:400});
  const payload={shape:coords.map(([lon,lat])=>({lat,lon})),costing:'bus',shape_match:'map_snap',trace_options:{search_radius:25,gps_accuracy:10}};
  const result=await fetch('https://valhalla1.openstreetmap.de/trace_route',{method:'POST',headers:{'Content-Type':'application/json','X-Client-Id':'dongjak-safety-prototype'},body:JSON.stringify(payload),signal:AbortSignal.timeout(4500)});
  if(!result.ok)return new Response('Unavailable',{status:502});
  const d=await result.json(),matched=d.trip?.legs?.flatMap(l=>decodeMatchedPolyline(l.shape))||[];
  if(!validateMatchedRoad(coords,matched))return new Response('Trace mismatch',{status:422});
  return Response.json({coordinates:matched},{headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});
 }catch{return new Response('Unavailable',{status:502});}
}
export const onRequestOptions=()=>new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
