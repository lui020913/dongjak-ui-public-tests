// Acquire fixed numbered entrances only. No passage or platform dependency.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {pointInStationDistrict} from '../../app/src/station-district-scope.mjs';
const ring=JSON.parse(await readFile('app/public/data/dongjak_sig_reference.geojson','utf8')).features[0].geometry.coordinates[0];
const bbox=[Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))];
const official='https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0/query';
const number=v=>String(v??'').trim().match(/(?:^|\s|출입구\s*|출구\s*)(\d{1,2}(?:-\d{1,2})?)(?=\s*번|\s*출입구|\s*출구|\s*$)/)?.[1]||'';
const valid=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&pointInStationDistrict(x,y,ring);
async function json(url,options={}){
 const r=await fetch(url,{...options,signal:AbortSignal.timeout(25000),headers:{Accept:'application/json','User-Agent':'DongjakSafetyMap/entrance-snapshot',...(options.headers||{})}});
 if(!r.ok)throw Error('HTTP '+r.status);
 const d=await r.json();if(d.error||d.remark)throw Error(JSON.stringify(d.error||d.remark));return d;
}
const base={where:'1=1',geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',f:'json'};
async function officialExits(){
 const ids=await json(official+'?'+new URLSearchParams({...base,returnIdsOnly:'true'}));
 if(!Array.isArray(ids.objectIds)||!ids.objectIds.length)throw Error('No official IDs');
 console.log('Official entrance IDs:',ids.objectIds.length);
 const rows=[];for(let i=0;i<ids.objectIds.length;i+=250){
  const d=await json(official+'?'+new URLSearchParams({...base,objectIds:ids.objectIds.slice(i,i+250).join(','),outFields:'sub_ent_sn,entrc_no,entrc_nm,stn_cd,stn_nm',returnGeometry:'true'}));
  if(!Array.isArray(d.features))throw Error('Missing official features');
  for(const f of d.features){const a=f.attributes||{},lon=Number(f.geometry?.x),lat=Number(f.geometry?.y),ref=number(a.entrc_no||a.entrc_nm),station=String(a.stn_nm||'').trim();if(valid(lon,lat)&&ref&&station)rows.push({type:'node',id:'mois-'+(a.sub_ent_sn||i+'-'+rows.length),lon,lat,tags:{railway:'subway_entrance',ref,station,source:'MOIS public entrance coordinates'}});}
 }
 console.log('Valid official entrance records:',rows.length);return rows;
}
async function osmExits(){
 const [w,s,e,n]=bbox,b=[s,w,n,e].join(',');
 const q='[out:json][timeout:20];(node["railway"="subway_entrance"]["ref"]('+b+');node["subway"="yes"]["entrance"]["ref"]('+b+'););out body;';
 for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter']){
  try{const d=await json(endpoint+'?'+new URLSearchParams({data:q}));if(!Array.isArray(d.elements))throw Error('Missing elements');return d.elements.filter(e=>e.type==='node'&&valid(e.lon,e.lat)&&number(e.tags?.ref)).map(e=>({type:'node',id:'osm-'+e.id,lon:e.lon,lat:e.lat,tags:{railway:'subway_entrance',ref:number(e.tags.ref),station:e.tags.station||e.tags['station:name']||'',source:'OpenStreetMap'}}));}catch(e){console.warn(endpoint,e.message);}
 }throw Error('No OSM source');
}
const officialResult=await Promise.allSettled([officialExits()]);
const result=[officialResult[0],officialResult[0].status==='fulfilled'&&officialResult[0].value.length>=20?{status:'fulfilled',value:[]}:(await Promise.allSettled([osmExits()]))[0]];
const officialRows=result[0].status==='fulfilled'?result[0].value:[],osmRows=result[1].status==='fulfilled'?result[1].value:[];
for(let i=0;i<result.length;i++)if(result[i].status==='rejected')console.warn('Source unavailable',i,result[i].reason?.message);
const elements=[],seen=new Set();
for(const e of [...officialRows,...osmRows]){const key=e.lon.toFixed(5)+'/'+e.lat.toFixed(5)+'/'+e.tags.ref;if(seen.has(key)||elements.some(x=>x.tags.ref===e.tags.ref&&Math.hypot((x.lon-e.lon)*88300,(x.lat-e.lat)*111320)<8))continue;seen.add(key);elements.push(e);}
if(elements.length<20)throw Error('Insufficient numbered exits: '+elements.length);
const d={schema:1,scope:'Dongjak-gu (SIG_CD 11590), same local district polygon as the map',acquiredAt:new Date().toISOString(),bbox,source:{official:officialRows.length?'MOIS public entrance coordinates':null,osm:osmRows.length?'OpenStreetMap contributors, ODbL':null},counts:{official:officialRows.length,osmExit:osmRows.length,exit:elements.length,way:0},elements};
await mkdir('app/public/data/transport',{recursive:true});await writeFile('app/public/data/transport/dongjak-station-access-v1.json',JSON.stringify(d)+'\n');console.log('Validated numbered entrances:',JSON.stringify(d.counts));
