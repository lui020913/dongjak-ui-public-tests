import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {applyReviewedGeometry,createRoadDisplayAssets} from '../src/reviewed-road-display-assets.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
const path='/data/sangdo1-analysis-view/slope.geojson';
const g={type:'LineString',coordinates:[[126.95,37.5],[126.951,37.501]]};
const g2={type:'LineString',coordinates:[[126.95001,37.5],[126.951,37.501]]};
const data={type:'FeatureCollection',features:[{type:'Feature',id:1,properties:{score:3,grade:'A',evaluated:true},geometry:g},{type:'Feature',properties:{score:null},geometry:g}]};
const original=JSON.stringify(data),patch={original_sha256:digest(original),original_count:2,changes:[{row:0,geometry:g2}]};
const response=s=>new Response(s,{headers:{'Content-Type':'application/json'}});
const manifest=meta=>({schema:1,graph_sha256:'3f80b417f5b6fe27b0fb7f31c107c0b19f967daf86836cd024d68ea38787607a',operational_enabled:false,tiles:[],overlays:[meta]});
function setup({enabled=true,patchData=patch,source=original,alterMeta={},bad=false}={}){
 const raw=JSON.stringify(patchData);const meta={file:'overlay-slope-geometry.json',sha256:digest(raw),bytes:Buffer.byteLength(raw),original_path:path,original_count:2,changed_count:1,...alterMeta};
 const requests=[];const loader=createRoadDisplayAssets({enabled,fetcher:async url=>{requests.push(url);return url.endsWith('manifest.json')?response(JSON.stringify(manifest(meta))):bad?new Response('missing',{status:404}):response(raw)}});
 return {requests,run:()=>loader.displayResponse(path,response(source)),loader};
}
test('display adapter preserves values, identity and source order',()=>{const result=applyReviewedGeometry(data,patch);assert.deepEqual(result.features[0].geometry,g2);assert.strictEqual(result.features[0].properties,data.features[0].properties);assert.strictEqual(result.features[1],data.features[1]);assert.deepEqual(data.features[0].geometry,g);assert.equal(result.features[0].id,1)});
test('integrity-checked opt-in loads reviewed display geometry',async()=>{const t=setup();const result=await t.run();assert.deepEqual(result.features[0].geometry,g2);assert.deepEqual(result.features[0].properties,data.features[0].properties);assert.equal(t.requests.length,2)});
test('ordinary build and every failed validation retain original',async()=>{for(const opts of [{enabled:false},{alterMeta:{sha256:'0'.repeat(64)}},{bad:true},{patchData:{...patch,original_sha256:'0'.repeat(64)}},{patchData:{...patch,changes:[{row:9,geometry:g2}]}},{patchData:{...patch,changes:[{row:0,geometry:{type:'Point',coordinates:[0,0]}}]}}]){const t=setup(opts);assert.deepEqual(await t.run(),data);if(opts.enabled===false)assert.equal(t.requests.length,0)}});
test('unlisted path never reads review assets',async()=>{const t=setup();assert.deepEqual(await t.loader.displayResponse('/data/pri/lighting_segments.json',response(original)),data);assert.equal(t.requests.length,0)});
