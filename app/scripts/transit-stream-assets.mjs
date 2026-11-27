import {readFileSync} from 'node:fs';
import {cellKey,GRID_WIDTH,GRID_HEIGHT} from '../src/transit-stream-grid.mjs';
import {officialStaticBusPlaces} from '../src/static-bus-stops.js';
const aliases={'경부선':'1호선','경원선':'1호선','경인선':'1호선','장항선':'1호선','경의선':'경의중앙선','중앙선':'경의중앙선','용산선':'경의중앙선','분당선':'수인분당선','수인선':'수인분당선','일산선':'3호선','과천선':'4호선','안산선':'4호선'};
export function makeTransitAssets(bus,csv){
 const out=new Map();
 for(const k of ['rail','bus'])for(let x=0;x<GRID_WIDTH;x++)for(let y=0;y<GRID_HEIGHT;y++)out.set(k+'_'+x+'_'+y,[]);
 const add=(kind,row)=>out.get(kind+'_'+cellKey(row.lng,row.lat))?.push(row);
 for(const p of officialStaticBusPlaces(bus))add('bus',p);
 const seen=new Set();
 for(const raw of csv.replace(/^\uFEFF/,'').split(/\r?\n/).slice(1)){
  const c=raw.split(','),name=c[0],lat=Number(c[7]),lng=Number(c[8]);
  if(!name||!Number.isFinite(lng)||!Number.isFinite(lat)||!c[7]||!c[8])continue;
  const id='rail/'+name+'/'+lng.toFixed(5)+'/'+lat.toFixed(5);
  if(seen.has(id))continue;seen.add(id);
  const lines=[...new Set(String(c[2]||c[1]).split('·').map(x=>aliases[x]||x).filter(Boolean))];
  add('rail',{id,kind:'subway',name,lng,lat,lines,source:'historical-station-master'});
 }
 return out;
}
export function transitStreamAssetsPlugin(){
 let assets;
 const get=()=>assets??=makeTransitAssets(JSON.parse(readFileSync(new URL('../public/data/transport/seoul-bus-stops.json',import.meta.url),'utf8')),readFileSync(new URL('../data-source/seoul-station-coordinates.csv',import.meta.url),'utf8'));
 const prefix='data/transit-stream/v1/';
 const manifest=()=>[...get()].filter(([,rows])=>rows.length>0).map(([key])=>key);
 const serve=server=>server.middlewares.use('/'+prefix,(req,res,next)=>{
  if(/^\/?index\.json(?:\?.*)?$/.test(req.url||'')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(manifest()));return;}
  const key=req.url?.match(/^\/?((?:rail|bus)_\d+_\d+)\.json(?:\?.*)?$/)?.[1];
  if(!key||!get().has(key))return next();
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(get().get(key)));
 });
 return {name:'transit-cell-assets',configureServer:serve,configurePreviewServer:serve,generateBundle(){this.emitFile({type:'asset',fileName:prefix+'index.json',source:JSON.stringify(manifest())});for(const [key,rows] of get())if(rows.length)this.emitFile({type:'asset',fileName:prefix+key+'.json',source:JSON.stringify(rows)});}};
}
