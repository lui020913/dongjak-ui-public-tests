/**
 * Verified-location station accessibility ingest.
 * Exit coordinates: MOIS 2026 public ArcGIS FeatureServer.
 * Elevator coordinates: Seoul Open Data tbTraficElvtr (requires separate portal key).
 * Only labels equipment when the source explicitly identifies the equipment.
 */
export const ACCESS_BBOX=[126.885,37.462,127.023,37.538]; // W,S,E,N: 동작구와 인근 경계역
const EMPTY={type:'FeatureCollection',features:[]};
const clean=(s)=>String(s??'').trim().slice(0,100);
export function isDongjakVicinity(lon,lat){
  return Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=ACCESS_BBOX[0]&&lon<=ACCESS_BBOX[2]&&lat>=ACCESS_BBOX[1]&&lat<=ACCESS_BBOX[3];
}
export function parseMetroExits(data){
  const features=[];
  const seen=new Set();
  for(const f of data?.features||[]){
    const c=f?.geometry?.coordinates||[];
    let lon=Number(c[0]),lat=Number(c[1]);
    // ArcGIS JSON may encode point geometry in x/y instead of GeoJSON coordinates.
    if(!Number.isFinite(lon)||!Number.isFinite(lat)){
      lon=Number(f?.geometry?.x);lat=Number(f?.geometry?.y);
    }
    if(!isDongjakVicinity(lon,lat))continue;
    const p=f.properties||f.attributes||{};
    const station=clean(p.stn_nm||p.STN_NM||p.station||'');
    const rawNumber=clean(p.entrc_no||p.ENTRC_NO||p.entrc_nm||p.ENTRC_NM||p.ref||'');
    const number=rawNumber.match(/(?:^|\s|출입구\s*|출구\s*)(\d{1,2}(?:-\d{1,2})?)(?=\s*번|\s*출입구|\s*출구|\s*$)/i)?.[1]||'';
    const label=number?`${number}번 출구`:'출입구';
    const id=clean(p.sub_ent_sn||p.SUB_ENT_SN||'');
    const key=id||`${lon.toFixed(6)},${lat.toFixed(6)},${number}`;
    if(seen.has(key))continue;seen.add(key);
    features.push({type:'Feature',properties:{type:'exit',station,number,label,
      // Entrances dataset has NO stairs/escalator/elevator classification.
      equipment:'unknown',source:'MOIS-2026-04-30'},geometry:{type:'Point',coordinates:[lon,lat]}});
  }
  return {type:'FeatureCollection',features};
}
export function wktPoint(wkt){
  const m=String(wkt||'').match(/POINT\s*(?:Z\s*)?\(\s*([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)/i);
  if(!m)return null;
  const a=Number(m[1]),b=Number(m[2]);
  return isDongjakVicinity(a,b)?[a,b]:isDongjakVicinity(b,a)?[b,a]:null;
}
export function parseSeoulElevators(data){
  const rows=data?.tbTraficElvtr?.row;
  if(!Array.isArray(rows))return EMPTY;
  const features=[],seen=new Set();
  for(const row of rows){
    const xy=wktPoint(row.NODE_WKT||row.node_wkt)
      || (()=>{const lng=Number(row.LNG||row.LON||row.LONGITUDE||row.X_COORD||row.X),
        lat=Number(row.LAT||row.LATITUDE||row.Y_COORD||row.Y);return isDongjakVicinity(lng,lat)?[lng,lat]:null;})();
    if(!xy)continue;
    const station=clean(row.SBWY_STN_NM||row.STN_NM||row.STATION_NM||row.STATION||'');
    const name=clean(row.NODE_NM||row.ELVTR_NM||row.FCLT_NM||'엘리베이터');
    const key=`${xy.join(',')}/${name}`;
    if(seen.has(key))continue;seen.add(key);
    features.push({type:'Feature',properties:{type:'elevator',station,label:'엘리베이터',number:'',equipment:'elevator',
      name,source:'Seoul-OpenData-tbTraficElvtr',verifiedAt:'2020-baseline',operating:'unknown'},
      geometry:{type:'Point',coordinates:xy}});
  }
  return {type:'FeatureCollection',features};
}
export function mergeAccessibilityCollections(...collections){
  const features=[];const seen=new Set();
  for(const collection of collections)for(const f of collection?.features||[]){
    if(!['exit','elevator','escalator','stairs'].includes(f?.properties?.type))continue;
    if(f?.geometry?.type!=='Point')continue;
    const [lon,lat]=f.geometry.coordinates||[];
    if(!isDongjakVicinity(Number(lon),Number(lat)))continue;
    const key=`${f.properties.type}/${Number(lon).toFixed(6)}/${Number(lat).toFixed(6)}/${f.properties.number||''}`;
    if(seen.has(key))continue;seen.add(key);features.push(f);
  }
  return {type:'FeatureCollection',features};
}

/** Only field-audited equipment with explicit type/coordinate/source may be displayed. */
export function parseFieldVerified(data){
  const features=[];
  for(const f of data?.features||[]){
    const p=f?.properties||{},xy=f?.geometry?.coordinates;
    if(!['stairs','escalator','elevator'].includes(p.type)||p.verified!==true)continue;
    if(!String(p.source||'').trim()||!String(p.observedAt||'').trim())continue;
    if(f.geometry?.type!=='Point'||!Array.isArray(xy)||!isDongjakVicinity(Number(xy[0]),Number(xy[1])))continue;
    const station=clean(p.station),number=clean(p.number),type=p.type;
    features.push({type:'Feature',geometry:{type:'Point',coordinates:xy.map(Number)},
      properties:{type,station,number,label:type==='stairs'?'계단':type==='escalator'?'에스컬레이터':'엘리베이터',
        name:clean(p.name),source:clean(p.source),observedAt:clean(p.observedAt),verified:true,
        operating:'unknown'}});
  }
  return {type:'FeatureCollection',features};
}
