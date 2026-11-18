import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet,onRequestPost} from '../functions/api/place-insight.js';
import {safetyFeatures} from '../src/safety-layers.js';
const src=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const url='https://example.pages.dev/api/place-insight';
function req(data,headers={}){return new Request(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(data)});}
const place={name:'상도1동 근처 횡단보도',type:'횡단보도',lat:37.5051,lng:126.9523,source:'OpenStreetMap'};
const model='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const fallback='@cf/google/gemma-4-26b-a4b-it';
const binding=run=>({AI:{run}});
test('Workers AI binding enables server without OpenAI key; operator can explicitly disable it',async()=>{
 const ok=await (await onRequestGet({env:binding(async()=>({response:'확인'}))})).json();
 assert.equal(ok.enabled,true);assert.equal(ok.provider,'cloudflare-workers-ai');
 assert.equal(ok.version,'6.1.1');assert.equal(ok.model,model);assert.equal(ok.backupModel,fallback);
 assert.equal((await (await onRequestGet({env:{OPENAI_API_KEY:'no-longer-used'}})).json()).enabled,false);
 const disabled={...binding(async()=>({response:'확인'})),AI_PLACE_ENABLED:'false'};
 assert.equal((await (await onRequestGet({env:disabled})).json()).enabled,false);
 assert.equal((await onRequestPost({request:req(place),env:disabled})).status,503);
});
test('invalid input and cross-site requests do not call Workers AI',async()=>{
 let calls=0;const env=binding(async()=>{calls++;return {response:'안내'};});
 let r=await onRequestPost({request:req(place,{origin:'https://evil.example'}),env});assert.equal(r.status,403);
 r=await onRequestPost({request:req({...place,lat:0}),env});assert.equal(r.status,400);
 r=await onRequestPost({request:new Request(url,{method:'POST',headers:{'content-type':'text/plain'},body:'hello'}),env});assert.equal(r.status,415);
 assert.equal(calls,0);
});
test('Workers AI model receives only redacted-size facts with evidence-bounded Korean system instructions',async()=>{
 let called;
 const env=binding(async(model,input)=>{called={model,input};return {response:'공개지도에 횡단보도 위치가 등록되어 있습니다. 현장 설치 여부를 확인해 주세요.'};});
 const result=await onRequestPost({request:req(place),env});
 assert.equal(result.status,200);const data=await result.json();assert.match(data.text,/횡단보도/);
 assert.equal(called.model,model);assert.ok(called.input.max_tokens>=256);
 assert.equal(called.input.chat_template_kwargs,undefined);
 assert.match(called.input.messages[0].content,/근거 없이 추정하지 마세요/);
 assert.match(called.input.messages[1].content,/상도1동/);
 assert.doesNotMatch(src('functions/api/place-insight.js'),/api\.openai\.com|Bearer \$\{env\.OPENAI_API_KEY\}/);
 const wrangler=src('wrangler.toml');
 assert.match(wrangler,/\[env\.production\.ai\]/);
 assert.match(wrangler,/binding\s*=\s*"AI"/);
});
test('Workers AI supports OpenAI-compatible choice response and returns bounded failure info',async()=>{
 const success=binding(async()=>({choices:[{message:{content:'현황은 현장에서 확인해야 합니다.'}}]}));
 const result=await onRequestPost({request:req(place),env:success});
 assert.equal((await result.json()).text,'현황은 현장에서 확인해야 합니다.');
 const fail=binding(async()=>{throw Object.assign(new Error('limit exceeded: private details'),{status:429});});
 const error=await onRequestPost({request:req(place),env:fail});
 assert.equal(error.status,429);assert.doesNotMatch((await error.text()),/private details/);
});
test('safety and crossing source POIs carry fact fields into shared AI details UI',()=>{
 const items=[{id:123,type:'node',lat:37.5,lon:126.95,tags:{name:'중앙약국',amenity:'pharmacy','addr:full':'상도로 1','contact:phone':'02-111-1234'}},
 {id:124,type:'node',lat:37.502,lon:126.955,tags:{highway:'crossing',crossing:'traffic_signals'}}];
 const safety=safetyFeatures(items,()=>true,'safety');assert.equal(safety.features.length,1);
 assert.equal(safety.features[0].properties.address,'상도로 1');
 assert.equal(safety.features[0].properties.phone,'02-111-1234');
 const crossings=safetyFeatures(items,()=>true,'crossing');assert.equal(crossings.features.length,1);
 assert.equal(crossings.features[0].properties.crossing_signal,'OSM 신호 시설 태그 있음');
 assert.match(src('src/safety-layers.js'),/openPlaceDetails/);
 assert.match(src('vite.config.js'),/onRequestGet/);
});
test('fresh visitors start light while saved preferences remain possible',()=>{
 assert.match(src('index.html'),/if\(!chosen\)chosen='light';/);
 assert.match(src('src/ui-environment.js'),/return 'light';/);
 assert.match(src('src/ui-environment.js'),/safeStorageSet\(THEME_KEY/);
});

test('Empty primary model switches to a distinct Gemma 4 model with thinking disabled',async()=>{
 const calls=[];
 const env=binding(async(nextModel,input)=>{
   calls.push({model:nextModel,input});
   if(calls.length===1)return {choices:[{message:{content:null,reasoning_content:'private thought'},finish_reason:'length'}]};
   return {choices:[{message:{content:[{type:'text',text:'동작구청은 공개지도에 등록된 공공기관입니다. 실제 이용 안내는 공식 기관에서 확인해 주세요.'}]},finish_reason:'stop'}]};
 });
 const result=await onRequestPost({request:req(place),env});
 assert.equal(result.status,200);
 const data=await result.json();
 assert.equal(calls.length,2);
 assert.deepEqual(calls.map(c=>c.model),[model,fallback]);
 assert.equal(calls[1].input.chat_template_kwargs.enable_thinking,false);
 assert.match(data.text,/동작구청/);
 assert.equal(data.model,fallback);assert.equal(data.version,'6.1.1');
 assert.doesNotMatch(data.text,/private thought/);
});
test('An inference error on the primary model falls back, except for quota and rate limiting',async()=>{
 const calls=[];
 const env=binding(async(model)=>{calls.push(model);
   if(calls.length===1)throw Object.assign(new Error('inference unavailable'),{status:502});
   return {response:'공개지도에 등록된 시설입니다. 운영 상태는 별도로 확인해 주세요.'};
 });
 const result=await onRequestPost({request:req(place),env});
 assert.equal(result.status,200);
 assert.equal(calls.length,2);
 assert.match((await result.json()).text,/등록된 시설/);
});
test('Two empty completions return a diagnostic error, never thought text or fake AI facts',async()=>{
 let calls=0;
 const env=binding(async()=>{calls++;return {choices:[{message:{content:'',reasoning_content:'private_thought'},finish_reason:'length'}]};});
 const result=await onRequestPost({request:req(place),env});
 const data=await result.json();
 assert.equal(result.status,502);
 assert.equal(data.code,'empty_ai_response');
 assert.equal(calls,2);
 assert.doesNotMatch(JSON.stringify(data),/private_thought/);
});
