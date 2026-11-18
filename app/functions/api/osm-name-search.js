/** Limited read-only Overpass name lookup for real OSM places only. */
const reply=(body,status=200)=>Response.json(body,{status,headers:{
  'Cache-Control':status===200?'public,max-age=300,s-maxage=300':'no-store',
  'X-Content-Type-Options':'nosniff'
}});
export function nameQuery(raw){
  const q=String(raw||'').trim();
  if(q.length<2||q.length>40||/[<>"'\\\n\r;[\]{}]/.test(q))return null;
  const known={스타벅스:'스타벅스|Starbucks',투썸:'투썸|Twosome',이디야:'이디야|EDIYA'};
  const safe=known[q]||q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  // Bounding region extends only slightly outside Dongjak for nearby transit.
  const bbox='37.435,126.87,37.565,127.07';
  return `[out:json][timeout:9];(nwr["name"~"${safe}",i](${bbox});nwr["name:ko"~"${safe}",i](${bbox});nwr["brand"~"${safe}",i](${bbox}););out center tags 45;`;
}
export async function onRequestGet({request}){
  const query=nameQuery(new URL(request.url).searchParams.get('q'));
  if(!query)return reply({ok:false,error:'검색어를 확인해 주세요.'},400);
  for(const endpoint of ['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter']){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9500);
    try{
      const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(query),signal:controller.signal});
      if(!r.ok)continue;const data=await r.json();
      if(Array.isArray(data.elements))return reply({ok:true,source:'© OpenStreetMap 기여자',elements:data.elements.slice(0,80)});
    }catch{}finally{clearTimeout(timer);}
  }
  return reply({ok:false,message:'OSM 공개검색 서버가 응답하지 않습니다.'},503);
}
