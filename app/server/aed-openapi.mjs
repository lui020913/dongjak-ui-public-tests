/** National Medical Center AED XML -> conservative, public GeoJSON data only.
 * No geocoding or invented coordinates. API key must remain on Cloudflare server.
 */
export const DEFAULT_AED_ENDPOINT='https://apis.data.go.kr/B552657/AEDInfoInqireService/getEgytAedManageInfoInqire';
export function decodeXmlEntities(str=''){
  return String(str).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&#(?:x([0-9a-fA-F]+)|([0-9]+));/g,(_m,hex,dec)=>{
      const n=parseInt(hex||dec,hex?16:10);
      return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
    }).replace(/&(amp|lt|gt|quot|apos);/g,(_m,name)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[name]);
}
const text=(value)=>decodeXmlEntities(String(value??'').trim()).replace(/<[^>]*>/g,'').trim();
export function xmlTag(xml,name){
  const match=String(xml??'').match(new RegExp(`<(?:(?:[a-zA-Z0-9_-]+):)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:(?:[a-zA-Z0-9_-]+):)?${name}\\s*>`,'i'));
  return match?text(match[1]):'';
}
export function parseAedXml(xml){
  if(typeof xml!=='string'||!xml.trim())throw new Error('AED 응답이 비어 있습니다.');
  if(/<html[\s>]|<script[\s>]/i.test(xml))throw new Error('AED API가 XML이 아닌 페이지를 반환했습니다.');
  const code=xmlTag(xml,'resultCode');
  const message=xmlTag(xml,'resultMsg')||xmlTag(xml,'resultMessage');
  if(code&&!['00','0','NORMAL_SERVICE'].includes(code))throw new Error(`AED API 응답 오류: ${message||code}`);
  const matches=[...xml.matchAll(/<(?:[\w-]+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?item\s*>/gi)];
  const rows=matches.map(m=>{
    const values={};for(const t of m[1].matchAll(/<([\w:-]+)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/g)){
      values[t[1].split(':').pop()]=text(t[2]);
    }return values;
  });
  const total=Number(xmlTag(xml,'totalCount'));
  return {rows,total:Number.isFinite(total)&&total>=0?total:rows.length,code,message};
}
const pick=(p,...keys)=>{for(const key of keys){
  const v=p[key]??p[Object.keys(p).find(k=>k.toLowerCase()===key.toLowerCase())];
  if(v!=null&&String(v).trim())return String(v).trim();
}return '';};
const validPhone=value=>/^0\d{1,3}[-\s]?\d{3,4}[-\s]?\d{4}$/.test(value)?value:'';
const numeric=value=>{const n=Number(String(value??'').trim());return Number.isFinite(n)?n:NaN;};
export function normalizeAedRow(r){
  let lng=numeric(pick(r,'wgs84Lon','wgs84Longitude','longitude','longtitude','lon','lng','xPos','posX','coordX'));
  let lat=numeric(pick(r,'wgs84Lat','wgs84Latitude','latitude','lat','yPos','posY','coordY'));
  if(lat>120&&lng>30&&lng<50){[lng,lat]=[lat,lng];}
  if(!Number.isFinite(lng)||!Number.isFinite(lat)||lng<126.7||lng>127.3||lat<37.2||lat>37.9)return null;
  const name=pick(r,'org','orgName','orgNm','institutionName','insttNm','buildName','name','dutyName')||'자동심장충격기 설치기관';
  const address=pick(r,'buildAddress','address','addr','dutyAddr','roadAddress','addr1');
  const detail=pick(r,'buildPlace','place','loc','installPlace','installationLocation','placeDetail','addressDetail','addr2');
  const city=pick(r,'sido','sidoNm','Q0');
  const district=pick(r,'gugun','gugunNm','sigungu','sggNm','Q1');
  const locality=`${city} ${district} ${address}`;
  if(locality.trim()&&!/동작구/.test(locality)&&/(?:강남구|서초구|관악구|영등포구|용산구|구로구|양천구|강서구|금천구|성동구|광진구)/.test(locality))return null;
  const serial=pick(r,'serialNumber','serial','serialNo','equipmentNo','aedNo','aenum','mgtNo','rnum');
  const phone=validPhone(pick(r,'orgTel','orgTelno','institutionTel','installTel','insttTel','telno','dutyTel1'));
  const hours=pick(r,'useTime','openingHours','businessHours','availableTime','openTime','operationTime');
  return {type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{
    id:serial||`${lng.toFixed(6)}-${lat.toFixed(6)}-${name}`,name,address,location_detail:detail,
    phone,hours:hours||'',hours_verified:false,source:'국립중앙의료원 전국 자동심장충격기(AED) 정보 조회 서비스',
    operational_status:'unverified',source_type:'national_medical_center_api'
  }};
}
export function aedRowsToGeoJSON(rows,{retrievedAt=new Date().toISOString(),sourceTotal=rows.length,complete=true}={}){
  const seen=new Set(),features=[];let missingCoordinates=0,duplicates=0;
  for(const raw of rows){const f=normalizeAedRow(raw);
    if(!f){missingCoordinates++;continue;}
    const identity=f.properties.id;
    if(seen.has(identity)){duplicates++;continue;}
    seen.add(identity);features.push(f);
  }
  return {type:'FeatureCollection',features,meta:{status:'ok',retrieved_at:retrievedAt,source_total:sourceTotal,
    retrieved_rows:rows.length,coordinate_valid_count:features.length,excluded_missing_or_outside:missingCoordinates,
    deduplicated:duplicates,source_complete:complete,operational_status:'unverified',hours_are_not_realtime:true,
    source:'국립중앙의료원 · 공공데이터포털 15000652'}};
}
