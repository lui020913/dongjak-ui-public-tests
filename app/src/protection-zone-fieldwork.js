/**
 * Local-only, user-entered field observations. Not official evidence until checked.
 * No server writes, no remote requests and no photo uploads.
 */
export const FIELDWORK_STORAGE_KEY='dongjak_pza_field_observations_v1';
export const FIELDWORK_OPTIONS={
  sidewalk:['미확인','있음','일부 있음','없음'],
  obstacles:['미확인','없음','있음'],
  lighting:['미확인','충분해 보임','부족해 보임','야간 확인 필요'],
  crossing:['미확인','시설 확인','개선 검토 필요','해당 없음'],
  facility_route:['미확인','이용 동선 관찰','이용 동선 미확인'],
  review_status:['미조사','조사 중','현장 확인','추가 검증 필요']
};
const clean=(v,max=700)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const asOption=(key,value)=>FIELDWORK_OPTIONS[key].includes(value)?value:FIELDWORK_OPTIONS[key][0];
export function normalizeFieldObservation(value={}){
  if(!/^R\d{4,}(?:-\d+)?$/.test(String(value.road_id??'')))throw new Error('도로 ID 형식 오류');
  const result={road_id:clean(value.road_id,32),road_name:clean(value.road_name,100)};
  for(const key of Object.keys(FIELDWORK_OPTIONS))result[key]=asOption(key,value[key]);
  result.survey_date=/^\d{4}-\d{2}-\d{2}$/.test(String(value.survey_date??''))?value.survey_date:'';
  result.notes=clean(value.notes,800);
  result.photo_reference=clean(value.photo_reference,180);
  result.updated_at=String(value.updated_at??'');
  return result;
}
export function createFieldworkStore(storage=globalThis.localStorage){
  let cache={};
  try{
    const raw=JSON.parse(storage?.getItem?.(FIELDWORK_STORAGE_KEY)||'{}');
    if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const [id,record] of Object.entries(raw)){
      if(/^R\d{4,}(?:-\d+)?$/.test(id))try{const data=normalizeFieldObservation(record);if(data.road_id===id)cache[id]=data;}catch{}
    }
  }catch{/* Private browsing: retain records in memory until exported. */}
  const all=()=>Object.values(cache).sort((a,b)=>a.road_id.localeCompare(b.road_id,'en'));
  const get=id=>cache[String(id)]?{...cache[String(id)]}:null;
  const write=()=>{
    try{storage?.setItem?.(FIELDWORK_STORAGE_KEY,JSON.stringify(cache));return true;}
    catch{return false;}
  };
  const save=(record)=>{
    const data=normalizeFieldObservation({...record,updated_at:new Date().toISOString()});
    cache[data.road_id]=data;
    return {record:data,persisted:write()};
  };
  const remove=id=>{delete cache[String(id)];return write();};
  return {all,get,save,remove};
}
export const FIELDWORK_COLUMNS=['road_id','road_name','review_status','survey_date','sidewalk','obstacles','lighting','crossing','facility_route','notes','photo_reference','updated_at'];
export function fieldworkToCSV(records){
  const csvCell=value=>{
    let text=String(value??'').replace(/[\r\n\t]+/g,' ');
    // Prevent Excel from executing untrusted field descriptions as formulas.
    if(/^[\s]*[=+\-@]/.test(text))text="'"+text;
    return `"${text.replaceAll('"','""')}"`;
  };
  return '\ufeff'+[FIELDWORK_COLUMNS.join(','),...records.map(r=>FIELDWORK_COLUMNS.map(k=>csvCell(r[k])).join(','))].join('\r\n');
}
export function fieldworkToJSON(records){
  return JSON.stringify({schema:'dongjak-pza-fieldwork-v1',exported_at:new Date().toISOString(),
    disclaimer:'사용자 현장기록이며 공식 조사나 실제 위험도 확정 자료가 아닙니다.',observations:records},null,2);
}
export function downloadFieldwork(text,filename,mime='text/csv;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([text],{type:mime}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
