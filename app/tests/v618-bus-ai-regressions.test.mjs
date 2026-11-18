import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suppressNativeBusStopGlyphs} from '../src/transport-map.js';
import {onRequestGet,onRequestPost} from '../functions/api/place-insight.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('bus icons use one custom blue marker while POI coords remain queryable',()=>{
 const code=read('src/transport-map.js');
 assert.match(code,/suppressNativeBusStopGlyphs\(map\)/);
 assert.match(code,/id:'dj-transport-bus-pictogram'/);
 assert.match(code,/querySourceFeatures\(poiLayer\.source/);
 const paint=new Map();
 const map={getStyle:()=>({layers:[{id:'poi_transit',type:'symbol','source-layer':'poi',source:'base'},
  {id:'other-symbol',type:'symbol','source-layer':'place',source:'base'}]}),
  getPaintProperty:()=>1,setPaintProperty:(id,prop,val)=>paint.set(id+':'+prop,val)};
 assert.equal(suppressNativeBusStopGlyphs(map),1);
 assert.equal(paint.size,2);
 assert.equal(paint.has('other-symbol:icon-opacity'),false);
 assert.deepEqual(paint.get('poi_transit:icon-opacity')[0],'case');
});
test('API reports deploy version for distinguishing stale Pages deployments',async()=>{
 const data=await (await onRequestGet({env:{AI:{run:async()=>({response:'ok'})}}})).json();
 assert.equal(data.version,'6.1.1');
 assert.match(data.model,/llama-3\.3/);
 assert.match(data.backupModel,/gemma-4/);
});
test('Empty responses from both models return explicit failure, never fabricated description',async()=>{
 const called=[];
 const env={AI:{run:async(model)=>{called.push(model);return {response:''};}}};
 const req=new Request('https://example.pages.dev/api/place-insight',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({name:'노량진2치안센터',type:'공공기관',lat:37.50,lng:126.95})});
 const r=await onRequestPost({request:req,env});const json=await r.json();
 assert.equal(r.status,502);assert.equal(json.code,'empty_ai_response');
 assert.equal(json.version,'6.1.1');assert.equal(called.length,2);
});
