/** 서울 버스 getRouteByStation JSON 또는 XML 응답 파싱. 인증키를 클라이언트에 노출하지 않음. */
const asRows=x=>Array.isArray(x)?x:(x?[x]:[]);
function getRouteName(row={}){
  return String(row.busRouteNm??row.rtNm??row.busRouteNumber??row.routeNm??'').trim();
}
export function parseBusRouteList(body){
  let rows=[];
  if(typeof body==='string'){
    const trimmed=body.trim();
    if(trimmed.startsWith('{'))return parseBusRouteList(JSON.parse(trimmed));
    if(/<ServiceResult|<cmmMsgHeader|<msgHeader/i.test(trimmed)){
      const code=trimmed.match(/<(?:headerCd|returnCode|errCode)>([^<]*)<\//i)?.[1];
      if(code&& !['0','00','INFO-000'].includes(code.trim())){
        const msg=trimmed.match(/<(?:headerMsg|returnAuthMsg|errMsg)>([^<]*)<\//i)?.[1]||'버스 경유 노선 API 오류';
        throw new Error(msg.slice(0,160));
      }
    }
    rows=[...trimmed.matchAll(/<itemList\b[^>]*>([\s\S]*?)<\/itemList>/gi)].map(m=>{
      const r={};
      for(const [,tag,value] of m[1].matchAll(/<([A-Za-z][\w:-]*)\b[^>]*>([^<]*)<\/\1>/g))r[tag]=value;
      return r;
    });
  }else{
    const code=String(body?.msgHeader?.headerCd??'0');
    if(code!=='0')throw new Error(String(body?.msgHeader?.headerMsg||`버스 API 오류 ${code}`));
    rows=asRows(body?.msgBody?.itemList??body?.msgBody?.item??body?.itemList);
  }
  return [...new Set(rows.map(getRouteName).filter(name=>name.length>0 && name.length<25))]
    .sort((a,b)=>a.localeCompare(b,'ko',{numeric:true}));
}
