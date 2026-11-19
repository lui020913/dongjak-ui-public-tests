/** Cloudflare Pages fallback for open OSM general places if Seoul D1 is absent.
 * Restrict geographical coverage and query classes to avoid an arbitrary
 * public Overpass proxy. Data stays attributed to OpenStreetMap contributors.
 */
const json=(data,status=200)=>Response.json(data,{status,headers:{
 'Cache-Control':status===200?'public, max-age=180, s-maxage=180':'no-store',
 'X-Content-Type-Options':'nosniff'
}});
export function validateFacilityBounds(raw){
 const values=String(raw||'').split(',').map(Number);
 if(values.length!==4||values.some(v=>!Number.isFinite(v)))return null;
 const [west,south,east,north]=values;
 if(west<126.87||east>127.05||south<37.43||north>37.57||
    west>=east||south>=north||east-west>.07||north-south>.07)return null;
 return {west,south,east,north};
}
export function facilityOverpassQuery(bounds){
 const b=[bounds.south,bounds.west,bounds.north,bounds.east].map(x=>x.toFixed(5)).join(',');
 return `[out:json][timeout:18];(nwr["amenity"~"^(restaurant|cafe|fast_food|pharmacy|clinic|hospital|library|school|kindergarten)$"](${b});nwr["shop"~"^(convenience|supermarket|bakery)$"](${b});nwr["leisure"="park"](${b});nwr["tourism"="attraction"](${b}););out center tags;`;
}
export async function onRequestGet({request}){
 const bounds=validateFacilityBounds(new URL(request.url).searchParams.get('bbox'));
 if(!bounds)return json({ok:false,message:'일반시설 영역이 올바르지 않습니다.'},400);
 const query=facilityOverpassQuery(bounds);
 for(const endpoint of ['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter']){
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),13000);
   try{
     const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(query),signal:controller.signal});
     if(!response.ok)continue;
     const result=await response.json();
     if(!Array.isArray(result.elements))continue;
     return json({ok:true,elements:result.elements,source:'© OpenStreetMap 기여자'});
   }catch{/* try alternate read-only endpoint */}
   finally{clearTimeout(timer);}
 }
 return json({ok:false,message:'OSM 일반시설 자료에 연결하지 못했습니다.'},503);
}
