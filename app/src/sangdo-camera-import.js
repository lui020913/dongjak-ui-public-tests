/**
 * Local-file importer for verified camera coordinates. Never geocode a street
 * name or invent a position. Importing does NOT certify that a camera is active.
 */
const COORDINATE_BOUNDS={west:126.87,east:127.05,south:37.465,north:37.555};
const safeText=value=>String(value??'').trim().slice(0,250);
const pick=(row,keys)=>{
  for(const key of keys){
    if(row[key]!==undefined&&row[key]!==null&&String(row[key]).trim())return row[key];
  }
  return '';
};
export function csvRows(text){
  const input=String(text??'').replace(/^\uFEFF/,'');
  const rows=[];let cells=[],cell='',quoted=false;
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(ch==='"'){
      if(quoted&&input[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(!quoted&&(ch===','||ch==='\n'||ch==='\r')){
      if(ch===','){cells.push(cell);cell='';}
      else {
        if(ch==='\r'&&input[i+1]==='\n')i++;
        cells.push(cell);cell='';
        if(cells.some(v=>v.trim()))rows.push(cells);
        cells=[];
      }
    }else cell+=ch;
  }
  if(quoted)throw new Error('CSV 따옴표가 닫히지 않았습니다.');
  cells.push(cell);if(cells.some(v=>v.trim()))rows.push(cells);
  if(!rows.length)return [];
  const headers=rows[0].map(h=>h.trim().replace(/^\uFEFF/,''));
  return rows.slice(1).map(values=>Object.fromEntries(headers.map((header,i)=>[header,values[i]??''])));
}
export function normalizedCameraPoints(input){
  const features=[];
  const sourceRows=Array.isArray(input)?input:(input?.type==='FeatureCollection'&&Array.isArray(input.features)?input.features:null);
  if(!sourceRows)throw new Error('단속카메라 CSV 또는 Point GeoJSON 자료가 아닙니다.');
  const lonKeys=['경도','경도(WGS84)','WGS84경도','longitude','Longitude','lon','lng','LNG','X'];
  const latKeys=['위도','위도(WGS84)','WGS84위도','latitude','Latitude','lat','LAT','Y'];
  const seen=new Set();
  for(const source of sourceRows){
    if(source?.type==='Feature'&&source?.geometry?.type!=='Point')continue;
    const row=source?.type==='Feature'?source.properties||{}:source;
    if(!row||typeof row!=='object')continue;
    const point=source?.geometry?.type==='Point'?source.geometry.coordinates:null;
    const lng=Number(point?.[0]??pick(row,lonKeys));
    const lat=Number(point?.[1]??pick(row,latKeys));
    if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
    if(!(lng>=COORDINATE_BOUNDS.west&&lng<=COORDINATE_BOUNDS.east&&lat>=COORDINATE_BOUNDS.south&&lat<=COORDINATE_BOUNDS.north))continue;
    const region=safeText(pick(row,['시군구명','시군구','시군구 명','district','District']));
    const roadAddress=safeText(pick(row,['소재지도로명주소','도로명주소','주소','address','Address']));
    const lotAddress=safeText(pick(row,['소재지지번주소','지번주소']));
    if(region&&!region.includes('동작구'))continue;
    if(!region&&(roadAddress||lotAddress)&&!(roadAddress+lotAddress).includes('동작구'))continue;
    const name=safeText(pick(row,['설치장소','설치장소명','장소명','설치위치','name','Name']))||'무인교통단속카메라';
    const kind=safeText(pick(row,['단속구분','단속유형','단속종류','type','Type']));
    const speed=safeText(pick(row,['제한속도','제한속도(km/h)','최고제한속도','speed','speedLimit']));
    const managed=safeText(pick(row,['관리기관명','관리기관','manager']));
    const checked=safeText(pick(row,['데이터기준일자','기준일자','기준일','확인일','updated']));
    const id=safeText(pick(row,['무인교통단속카메라관리번호','카메라관리번호','관리번호','id']));
    const dedup=id?`id:${id}`:`point:${lng.toFixed(7)}:${lat.toFixed(7)}:${name}:${kind}`;
    if(seen.has(dedup))continue;
    seen.add(dedup);
    features.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{name,kind,speed,address:roadAddress||lotAddress,managed,checked,id}});
  }
  return {type:'FeatureCollection',features};
}
export function cameraImportPreview(contents,filename=''){
  const ext=filename.toLowerCase().split('.').pop();
  const parsed=ext==='geojson'||ext==='json'||contents.trimStart().startsWith('{')?JSON.parse(contents):csvRows(contents);
  return normalizedCameraPoints(parsed);
}
