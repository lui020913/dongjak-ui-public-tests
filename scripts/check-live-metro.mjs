import {isMetroDailyQuota} from '../app/src/features/liveTransit/quota-state.js';
import {buildDongjakMetroLines} from '../app/src/features/liveTransit/integrate.js';
import {metroToFeatures} from '../app/src/features/liveTransit/normalize.js';
const base=process.argv[2],url=new URL('/api/transport/live-vehicles',base);url.searchParams.set('modes','metro');
// Compare the publicly documented test key with the actual deployed station-arrival endpoint.
// Sample responses are diagnostic only; never used to populate the map.
function classifyPublicResponse(text){
 let v;try{v=JSON.parse(text)}catch{return {type:text.trim().startsWith('<')?'xml-or-html':'text',size:text.length,code:text.match(/\b(?:INFO|ERROR)-\d{3}\b/)?.[0]??null};}
 const keys=['realtimePositionList','realtimeArrivalList','errorMessage','RESULT','result','data','response','error','message','status','code','items','success','ok','detail','statusCode','totalCount'];
 return {type:v===null?'null':Array.isArray(v)?'array':typeof v,size:text.length,keys:keys.filter(k=>v!=null&&Object.hasOwn(v,k)),code:text.match(/\b(?:INFO|ERROR)-\d{3}\b/)?.[0]??null,rows:(v?.realtimePositionList??v?.realtimeArrivalList??v?.items??[]).length,stationStatus:v?.sourceStatus??null,stationAge:v?.sourceAgeSeconds??null,errorCategory:typeof v?.code==='string'&&/^[A-Z_0-9-]{1,80}$/.test(v.code)?v.code:null};
}
if(process.env.METRO_DEEP_DIAGNOSTIC==='1'){
 const sampleBase='http://swopenapi.seoul.go.kr/api/subway/sample/';
 const checks=[['official-sample-position',sampleBase+'json/realtimePosition/0/5/'+encodeURIComponent('7호선')],['official-sample-arrival',sampleBase+'json/realtimeStationArrival/0/5/'+encodeURIComponent('상도')],['configured-station-arrival',new URL('/api/transport/subway?station='+encodeURIComponent('상도'),base)]];
 await Promise.all(checks.map(async([name,target])=>{try{const res=await fetch(target,{signal:AbortSignal.timeout(15000)});console.log('METRO_SOURCE_COMPARE',name,JSON.stringify({http:res.status,...classifyPublicResponse(await res.text())}));}catch(e){console.log('METRO_SOURCE_COMPARE',name,JSON.stringify({error:e?.name??'network'}));}}));
}
const response=await fetch(url,{signal:AbortSignal.timeout(30000)});const data=await response.json();
const lines=buildDongjakMetroLines(),rows=Array.isArray(data.metro)?data.metro:[],now=Date.now(),ages=rows.map(x=>(now-Date.parse(x.observedAt))/1000).filter(Number.isFinite).sort((a,b)=>a-b);
const relevant=rows.filter(x=>lines[x.line]?.up.some(y=>y.name===String(x.station).replace(/역$/,'')));
const frames=metroToFeatures(rows,lines,now,180000);
console.log('LIVE_METRO_DIAGNOSTIC',JSON.stringify({http:response.status,ok:data.ok,warnings:data.warnings,metroDiagnostics:data.metroDiagnostics,availability:data.availability,rows:rows.length,byLine:Object.fromEntries(Object.keys(lines).map(line=>[line,rows.filter(x=>x.line===line).length])),localStationRows:relevant.length,localAgesSeconds:relevant.map(x=>Math.round((now-Date.parse(x.observedAt))/1000)),fresh:rows.filter(x=>{const age=(now-Date.parse(x.observedAt))/1000;return age>=-10&&age<=90;}).length,ageRange:ages.length?[ages[0],ages[Math.floor(ages.length/2)],ages.at(-1)]:[],mapped:frames.length,localStationNames:[...new Set(relevant.map(x=>x.station))]}));
if(isMetroDailyQuota(response.status,data)){
 console.log('LIVE_METRO_LIMITED: official daily quota exhausted (HTTP 429 / ERROR-337); functional UI verification remains required.');
}else{
if(!response.ok||!data.ok)throw Error('Live provider returned unsuccessful response');
const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
if(!frames.length&&hour>=6&&hour<23)throw Error('No valid current trains mapped using official station geometry during service hours');
}
