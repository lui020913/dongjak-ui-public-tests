/** Seoul S-DoT hourly environmental observations. Source: sDoTEnv, OA-22833. */
const numeric=(value,min=-Infinity,max=Infinity)=>{
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null;
};
export function parseSdotResponse(json){
  const root=json?.sDoTEnv;
  if(!root||typeof root!=='object'){
    const error=json?.RESULT||json?.result;
    throw new Error(`SDOT_API_${String(error?.CODE||'UNEXPECTED').replace(/[^\w-]/g,'').slice(0,30)}`);
  }
  const code=String(root.RESULT?.CODE||'INFO-000');
  if(code!=='INFO-000'&&code!=='INFO-200')throw new Error(`SDOT_API_${code.replace(/[^\w-]/g,'')}`);
  const total=Number(root.list_total_count);
  if(!Number.isInteger(total)||total<0)throw new Error('SDOT_COUNT_INVALID');
  return {total,rows:Array.isArray(root.row)?root.row:[],code};
}
export function timestampMillis(value){
  const s=String(value||'').trim();
  // Seoul local time, explicitly pin the offset rather than relying on server timezone.
  const m=s.match(/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})[ T_]?(\d{2}):?(\d{2})(?::?(\d{2}))?/);
  if(!m)return null;
  const [,year,month,day,hour,min,sec='00']=m;
  if(+month<1||+month>12||+day<1||+day>31||+hour>23||+min>59||+sec>59)return null;
  const millis=Date.parse(`${year}-${month}-${day}T${hour}:${min}:${sec}+09:00`);
  return Number.isFinite(millis)?millis:null;
}
export function summarizeDongjakSdot(rawRows,{now=new Date(),sourceComplete=true}={}){
  const latest=new Map(),nowMs=+now;
  for(const row of rawRows){
    if(!row||typeof row!=='object')continue;
    const district=String(row.AUTONOMOUS_DISTRICT||'').replace(/\s/g,'');
    if(!(/^(서울특별시)?동작구$/.test(district)||/^Dongjak-gu$/i.test(district)))continue;
    const serial=String(row.SERIAL||'').trim();if(!serial||serial.length>100)continue;
    const millis=timestampMillis(row.SENSING_TIME);
    if(!Number.isFinite(millis)||millis>nowMs+15*60_000||millis<nowMs-48*3600_000)continue;
    const dataNo=Number(row.DATA_NO||1);
    const observation={serial,sensing_time:String(row.SENSING_TIME||''),sample_time:new Date(millis).toISOString(),
      data_no:dataNo===2?2:1,
      temperature_c:numeric(row.AVG_TEMP,-40,65),humidity_pct:numeric(row.AVG_HUMI,0,100),
      wind_mps:numeric(row.AVG_WIND_SPEED,0,100),illumination_lux:numeric(row.AVG_INTE_ILLU,0,200000),
      uv:numeric(row.AVG_ULTRA_RAYS,0,100),district: '동작구',neighborhood:String(row.ADMINISTRATIVE_DISTRICT||'').slice(0,60)};
    if(Object.values(observation).filter(x=>typeof x==='number').length===1)continue;
    const current=latest.get(serial);
    if(!current||millis>current._timestamp||(millis===current._timestamp&&observation.data_no>current.data_no))latest.set(serial,{...observation,_timestamp:millis});
  }
  const observations=[...latest.values()].sort((a,b)=>a.serial.localeCompare(b.serial)).map(({_timestamp,...record})=>record);
  const ages=observations.map(x=>nowMs-Date.parse(x.sample_time));
  const freshest=ages.length?Math.min(...ages):null;
  const lastTime=observations.length?new Date(Math.max(...observations.map(x=>Date.parse(x.sample_time)))).toISOString():null;
  const recent=observations.filter(x=>nowMs-Date.parse(x.sample_time)<=4*3600_000);
  const means=field=>{const vals=recent.map(x=>x[field]).filter(Number.isFinite);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10:null;};
  return {observations,summary:{sensor_count:observations.length,recent_sensor_count:recent.length,
    recent_mean_temp_c:means('temperature_c'),recent_mean_humidity_pct:means('humidity_pct'),
    latest_sample_at:lastTime,stale:!lastTime||freshest>4*3600_000,source_complete:sourceComplete},
    source:'서울특별시 S-DoT sDoTEnv',notice:'센서 위치별 관측값이며 동작구 전체 기온 또는 체감온도를 대표하지 않습니다. 미세먼지 정보는 제공되지 않습니다.'};
}
