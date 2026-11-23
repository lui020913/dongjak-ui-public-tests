import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const app=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
 const location=join(dir,entry.name);
 if(entry.isDirectory())return walk(location);
 return entry.isFile()&&/\.(?:js|mjs|css|html)$/.test(entry.name)?[location]:[];
});
const sourceFiles=[...walk(join(app,'src')),join(app,'index.html')];
const source=path=>readFileSync(join(app,path),'utf8');
const staticFile=url=>{
 assert.match(url,/^\/data\/[A-Za-z0-9_./-]+\.(?:geojson|json|csv|txt)$/,'only literal public GIS assets are checked');
 const full=resolve(app,'public','.'+url);
 assert.ok(full.startsWith(join(app,'public','data')+sep),'asset path escapes public/data');
 return full;
};

test('all literal GIS URLs in the runtime source resolve to packaged public files',()=>{
 const missing=[],observed=new Set();
 for(const file of sourceFiles){
  const value=readFileSync(file,'utf8');
  for(const m of value.matchAll(/\/data\/[A-Za-z0-9_./-]+\.(?:geojson|json|csv|txt)(?![A-Za-z0-9_-])/g)){
   const url=m[0];
   observed.add(url);
   if(!existsSync(staticFile(url)))missing.push(relative(app,file)+' -> '+url);
  }
 }
 assert.deepEqual(missing,[],'a source referenced GIS file was deleted or renamed');
 assert.ok(observed.size>=12,'unexpected loss of literal GIS source dependencies');
});

test('PRI, route graph, speed evidence and institutional gap keep their published inputs',()=>{
 const manifest=JSON.parse(source('public/data/pri/manifest.json'));
 assert.equal(manifest.bundle,'/data/pri/lighting_segments.json');
 assert.equal(manifest.patches.length,4);
 assert.equal(new Set(manifest.patches).size,4);
 for(const url of [manifest.bundle,...manifest.patches,
  '/data/road-speed/sangdo1_speed_links.geojson',
  '/data/road-speed/metadata.json',
  '/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson',
  '/data/protection-zone/sangdo1_22_clipped_official_catchment_audit_20261122.json',
  '/data/safety/walk/dongjak_walk_graph.json',
  '/data/safety/walk/dongjak_walk_links.geojson',
  '/data/safety/slope/dongjak_walk_links_with_slope.geojson'
 ]){
  const path=staticFile(url);
  assert.ok(existsSync(path)&&statSync(path).size>0,'missing safety-critical GIS asset: '+url);
 }
 const pri=source('src/pri-map.js');
 const speed=source('src/pri-speed-risk.mjs');
 assert.ok(pri.includes("win.fetch('/data/pri/manifest.json'"));
 assert.ok(pri.includes("'/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson'"));
 assert.ok(speed.includes("'/data/road-speed/sangdo1_speed_links.geojson'"));
 assert.ok(speed.includes("'/data/road-speed/metadata.json'"));
});
