/** Small-traffic demonstration proxy for public Photon place search; no tokens/secrets. */
export async function onRequestGet({request}){
  const query=new URL(request.url).searchParams.get('q')?.trim()||'';
  if(query.length<2||query.length>80)return Response.json({message:'2~80자 장소명 입력이 필요합니다.'},{status:400});
  const remote=new URL('https://photon.komoot.io/api/');
  remote.search=new URLSearchParams({q:query,bbox:'126.78,37.40,127.20,37.70',lon:'126.9494',lat:'37.4987',zoom:'13',lang:'ko',limit:'8'});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetch(remote,{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)return Response.json({message:'공개 장소 검색 서비스에 연결할 수 없습니다.'},{status:response.status===429?429:502});
    const body=await response.json();
    return Response.json({type:'FeatureCollection',features:Array.isArray(body.features)?body.features.slice(0,8):[]},
      {headers:{'Cache-Control':'private, max-age=0'}});
  }catch{return Response.json({message:'장소 검색 서버가 응답하지 않습니다.'},{status:503});}
  finally{clearTimeout(timer);}
}
