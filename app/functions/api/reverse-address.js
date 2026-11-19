export async function onRequestGet({request}) {
 const q=new URL(request.url).searchParams,lat=Number(q.get('lat')),lon=Number(q.get('lon'));
 if(!q.has('lat')||!q.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<37.4||lat>37.7||lon<126.78||lon>127.2)return Response.json({address:null},{status:400});
 try{
 const url=new URL('https://photon.komoot.io/reverse');url.search=new URLSearchParams({lat:String(lat),lon:String(lon),lang:'ko',limit:'5'});
 const r=await fetch(url,{signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});if(!r.ok)return Response.json({address:null},{status:502});
 const data=await r.json(),p=data.features?.map(f=>f.properties).find(p=>p?.street&&p?.housenumber);
 const address=p?[p.city,p.district,p.street,p.housenumber].filter(Boolean).join(' '):null;
 return Response.json({address},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({address:null},{status:503})}
}
