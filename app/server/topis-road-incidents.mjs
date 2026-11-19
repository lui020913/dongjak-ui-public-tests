/** 서울시 TOPIS AccInfo(XML) -> Dongjak GeoJSON. No API key or network access in this module. */
const toText = value => String(value ?? '');
export function xmlDecode(text) {
  return toText(text).replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (m, n, s) => {
    if(n){const value=n[0]?.toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return value>0&&value<=0x10ffff?String.fromCodePoint(value):'';}
    return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[s.toLowerCase()]||m;
  });
}
function field(block, name) {
  const match=block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));
  if(!match)return '';
  return xmlDecode(match[1].trim().replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/,'$1'));
}
export function parseAccInfoXml(xml) {
  if(typeof xml!=='string'||xml.length>3_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('TOPIS_XML_INVALID');
  const code=field(xml,'CODE');
  const message=field(xml,'MESSAGE');
  if(code&&code!=='INFO-000'&&code!=='INFO-200')throw new Error(`TOPIS_${code}`);
  const rows=[...xml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/gi)].map(([,block])=>({
    id:field(block,'ACC_ID'),date:field(block,'OCCR_DATE'),time:field(block,'OCCR_TIME'),
    expectedClearDate:field(block,'EXP_CLR_DATE'),expectedClearTime:field(block,'EXP_CLR_TIME'),
    typeCode:field(block,'ACC_TYPE'),detailCode:field(block,'ACC_DTYPE'),linkId:field(block,'LINK_ID'),
    x:Number(field(block,'GRS80TM_X')),y:Number(field(block,'GRS80TM_Y')),
    description:field(block,'ACC_INFO')
  }));
  if(!code&&!rows.length&&!/<AccInfo\b/i.test(xml))throw new Error('TOPIS_XML_UNEXPECTED_RESPONSE');
  return {rows,total:Number(field(xml,'list_total_count')||rows.length),code:code||'INFO-000',message};
}
/** Inverse Korean GRS80 Central Belt TM projection, false-northing 500000 (EPSG:5181) or 600000 (EPSG:5186). */
export function inverseGrs80Tm(x, y, falseNorthing) {
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  const a=6378137, invF=298.257222101, f=1/invF, e2=f*(2-f), ep2=e2/(1-e2), k0=1;
  const lat0=38*Math.PI/180, lon0=127*Math.PI/180, x0=200000;
  const meridian=lat=>a*((1-e2/4-3*e2**2/64-5*e2**3/256)*lat-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*lat)
    +(15*e2**2/256+45*e2**3/1024)*Math.sin(4*lat)-(35*e2**3/3072)*Math.sin(6*lat));
  const M=meridian(lat0)+(y-falseNorthing)/k0;
  const mu=M/(a*(1-e2/4-3*e2**2/64-5*e2**3/256));
  const e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const fp=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)
    +(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
  const sin=Math.sin(fp),cos=Math.cos(fp),t=Math.tan(fp),C=ep2*cos*cos,T=t*t;
  const N=a/Math.sqrt(1-e2*sin*sin),R=a*(1-e2)/(1-e2*sin*sin)**1.5,D=(x-x0)/(N*k0);
  const lat=fp-(N*t/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ep2)*D**4/24+(61+90*T+298*C+45*T*T-252*ep2-3*C*C)*D**6/720);
  const lon=lon0+(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C*C+8*ep2+24*T*T)*D**5/120)/cos;
  return [lon*180/Math.PI,lat*180/Math.PI];
}
// Return null when the coordinate's datum/zone cannot be safely resolved.
export function toSeoulPoint(x, y) {
  if(x>126&&x<128&&y>37&&y<39)return [x,y];
  for(const falseNorthing of [500000,600000]){
    const point=inverseGrs80Tm(x,y,falseNorthing);
    if(point&&point[0]>=126.7&&point[0]<=127.3&&point[1]>=37.3&&point[1]<=37.75)return point;
  }
  return null;
}
const INCIDENT_BBOX=[126.88,37.46,127.02,37.54]; // margin only; app applies its precise district boundary
export function incidentsToGeoJSON(rows, receivedAt=new Date().toISOString()) {
  const features=[],ignored=[];const seen=new Set();
  for(const r of rows){
    const point=toSeoulPoint(r.x,r.y);
    if(!point){ignored.push({id:r.id,reason:'coordinate_unverified'});continue;}
    if(point[0]<INCIDENT_BBOX[0]||point[0]>INCIDENT_BBOX[2]||point[1]<INCIDENT_BBOX[1]||point[1]>INCIDENT_BBOX[3])continue;
    const id=r.id||`${r.date}|${r.time}|${r.linkId}|${r.x}|${r.y}`;
    if(seen.has(id))continue;seen.add(id);
    features.push({type:'Feature',geometry:{type:'Point',coordinates:point},properties:{
      incident_id:id,type_code:r.typeCode||null,detail_type_code:r.detailCode||null,
      occurrence_date:r.date||null,occurrence_time:r.time||null,
      expected_clear_date:r.expectedClearDate||null,expected_clear_time:r.expectedClearTime||null,
      road_link_id:r.linkId||null,description:r.description||'도로 교통 돌발정보',
      fetched_at:receivedAt,source:'서울시 TOPIS AccInfo',pedestrian_closure_verified:false
    }});
  }
  return {type:'FeatureCollection',features,meta:{fetched_at:receivedAt,source:'서울시 TOPIS AccInfo',
    scope:'동작구 및 인접 지역 (정확한 경계는 지도에서 적용)',pedestrian_status:'미확인',
    unmatched_coordinates:ignored.length,source_record_count:rows.length}};
}
