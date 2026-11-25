// Select the nearest returned numbered road address, never a POI name.
export function nearestRoadAddress(features,lat,lon){
 const candidates=(Array.isArray(features)?features:[]).flatMap(f=>{
  const p=f?.properties,coords=f?.geometry?.coordinates;
  if(!p?.street||!p?.housenumber||!Array.isArray(coords)||!Number.isFinite(coords[0])||!Number.isFinite(coords[1]))return [];
  const street=String(p.street).trim(),number=String(p.housenumber).trim();
  if(!street||!/^[0-9]+(?:-[0-9]+)?$/.test(number))return [];
  const d=(coords[1]-lat)**2+((coords[0]-lon)*Math.cos(lat*Math.PI/180))**2;
  return [{d,address:[...new Set([p.city,p.district,street,number].filter(Boolean))].join(' ')}];
 });
 return candidates.sort((a,b)=>a.d-b.d)[0]?.address||null;
}
export async function onRequestGet({request}) {
 const q=new URL(request.url).searchParams,lat=Number(q.get('lat')),lon=Number(q.get('lon'));
 if(!q.has('lat')||!q.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<37.4||lat>37.7||lon<126.78||lon>127.2)return Response.json({address:null},{status:400});
 try{
 const url=new URL('https://photon.komoot.io/reverse');url.search=new URLSearchParams({lat:String(lat),lon:String(lon),lang:'ko',limit:'10'});
 const r=await fetch(url,{signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});if(!r.ok)return Response.json({address:null},{status:502});
 const data=await r.json(),address=nearestRoadAddress(data.features,lat,lon);
 return Response.json({address},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({address:null},{status:503})}
}
