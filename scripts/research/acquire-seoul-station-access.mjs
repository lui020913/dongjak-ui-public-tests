// One-time data acquisition. Run manually to refresh the committed snapshot, not in the app.
import {writeFile,mkdir} from 'node:fs/promises';
const official='https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0/query';
const bbox=[126.73,37.40,127.20,37.72];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function json(url,options={}){
 let last;
 for(let i=0;i<3;i++){try{const r=await fetch(url,{...options,signal:AbortSignal.timeout(90000),headers:{'User-Agent':'DongjakSafetyMap/static-station-data (public open data acquisition)','Accept':'application/json',...(options.headers||{})}});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();if(d.error||d.remark)throw Error(JSON.stringify(d.error||d.remark));return d;}catch(e){last=e;await sleep(2000*(i+1));}}
 throw last;
}
const clean=v=>String(v??'').trim();
const number=v=>clean(v).match(/(?:^|\s|출입구\s*|출구\s*)(\d{1,2}(?:-\d{1,2})?)(?=\s*번|\s*출입구|\s*출구|\s*$)/)?.[1]||'';
const valid=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=bbox[0]&&x<=bbox[2]&&y>=bbox[1]&&y<=bbox[3];
const elements=[],seen=new Set();
const base={where:'1=1',geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',f:'json'};
let officialCount=0;
try{
 const ids=await json(official+'?'+new URLSearchParams({...base,returnIdsOnly:'true'}));
 if(!Array.isArray(ids.objectIds)||!ids.objectIds.length)throw Error('No official IDs');
 for(let i=0;i<ids.objectIds.length;i+=300){
  const d=await json(official+'?'+new URLSearchParams({...base,objectIds:ids.objectIds.slice(i,i+300).join(','),outFields:'sub_ent_sn,entrc_no,entrc_nm,stn_cd,stn_nm,sub_nm',returnGeometry:'true'}));
  if(!Array.isArray(d.features))throw Error('Missing official features');
  for(const f of d.features){const a=f.attributes||{},x=Number(f.geometry?.x),y=Number(f.geometry?.y),n=number(a.entrc_no||a.entrc_nm),s=clean(a.stn_nm);if(!valid(x,y)||!n||!s)continue;const key=s.replace(/\s|역$/g,'')+'|'+n;if(seen.has(key))continue;seen.add(key);elements.push({type:'node',id:'mois-'+(a.sub_ent_sn||i+'-'+elements.length),lon:x,lat:y,tags:{railway:'subway_entrance',ref:n,station:s,source:'MOIS-2026-04-30'}});officialCount++;}
 }
}catch(e){console.warn('Official source unavailable:',e.message);}
const endpoints=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter'];
const osm=new Map();let cells=0;
for(let iy=0;iy<3;iy++)for(let ix=0;ix<3;ix++){
 const [w,s,e,n]=bbox;const b=[s+(n-s)*iy/3,w+(e-w)*ix/3,s+(n-s)*(iy+1)/3,w+(e-w)*(ix+1)/3].map(x=>x.toFixed(6)).join(',');
 const query='[out:json][timeout:70];(node["railway"="subway_entrance"]('+b+');node["subway"="yes"]["entrance"]('+b+');way["railway"="platform"]["subway"="yes"]('+b+');way["public_transport"="platform"]["subway"="yes"]('+b+');way["highway"="footway"]["tunnel"="yes"]('+b+');way["highway"="footway"]["location"="underground"]('+b+');way["indoor"="corridor"]('+b+');way["highway"="steps"]["level"]('+b+'););out body geom;';
 let d;for(const url of endpoints){try{d=await json(url,{method:'POST',body:new URLSearchParams({data:query})});if(!Array.isArray(d.elements))throw Error('Invalid elements');break;}catch(e){console.warn('OSM cell',iy,ix,url,e.message);d=null;}}
 if(!d)continue;cells++;
 for(const e of d.elements){if(e.type==='node'&&valid(e.lon,e.lat)){const t=e.tags||{};osm.set('n'+e.id,{type:'node',id:e.id,lon:e.lon,lat:e.lat,tags:{railway:t.railway,subway:t.subway,entrance:t.entrance,ref:t.ref||t['exit:ref']||t['entrance:ref'],station:t.station||t['station:name'],source:'OpenStreetMap'}});}else if(e.type==='way'&&e.geometry?.length>=2){const t=e.tags||{};osm.set('w'+e.id,{type:'way',id:e.id,geometry:e.geometry.map(q=>({lon:q.lon,lat:q.lat})),tags:{railway:t.railway,public_transport:t.public_transport,subway:t.subway,highway:t.highway,tunnel:t.tunnel,location:t.location,indoor:t.indoor,level:t.level}});}}
}
const osmExits=[...osm.values()].filter(e=>e.type==='node'),ways=[...osm.values()].filter(e=>e.type==='way');
for(const e of osmExits){if(elements.some(x=>Math.hypot((x.lon-e.lon)*88300,(x.lat-e.lat)*111320)<8))continue;elements.push(e);}
elements.push(...ways);
const exits=elements.filter(e=>e.type==='node').length;
if(officialCount<500||cells!==9||exits<700||ways.length<30)throw Error('Incomplete Seoul snapshot; refuse to commit: '+JSON.stringify({officialCount,cells,exits,ways:ways.length}));
const data={schema:1,acquiredAt:new Date().toISOString(),bbox,source:{official:'MOIS_KR_Subway FeatureServer (government public entrance points)',osm:'OpenStreetMap contributors, ODbL'},counts:{official:officialCount,osmExit:osmExits.length,exit:exits,way:ways.length,osmCells:cells},elements};
const path='app/public/data/transport/seoul-station-access-v1.json';await mkdir('app/public/data/transport',{recursive:true});await writeFile(path,JSON.stringify(data)+'\n');console.log('Station snapshot validated',JSON.stringify(data.counts));
