import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {featuredPlaceCollection,FEATURED_PLACES_LOGOS,FEATURED_PLACE_LOGOS} from '../src/featured-place-labels.js';
import {labelHeightAtPitch,isReadablePointLabelLayer,installReadable3DLabels} from '../src/readable-3d-labels.js';
import {onRequestPost} from '../functions/api/place-insight.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>readFileSync(resolve(root,f),'utf8');

test('supplied official brand logos are shipped as map-native sprites for all five verified places',()=>{
 const features=featuredPlaceCollection().features;
 assert.equal(features.length,5);
 assert.equal(FEATURED_PLACES_LOGOS,'dongjak-featured-place-logos');
 for(const feature of features){
   const logo=FEATURED_PLACE_LOGOS[feature.properties.name];
   assert.ok(logo,`no logo for ${feature.properties.name}`);
   assert.equal(feature.properties.logo,`dj-featured-${logo}`);
   assert.ok(existsSync(resolve(root,`public/logos/featured/${logo}.png`)));
 }
 assert.match(read('src/featured-place-labels.js'),/map\.addImage/);
 assert.match(read('src/featured-place-labels.js'),/'icon-image':\['get','logo'\]/);
});

test('point labels stay on terrain at 3D pitch, while path labels are untouched',()=>{
 assert.equal(labelHeightAtPitch(0),0);
 assert.equal(labelHeightAtPitch(36),0);
 assert.equal(labelHeightAtPitch(50),0);
 assert.equal(isReadablePointLabelLayer({id:'dongjak-admin-dong-labels',type:'symbol',layout:{'text-field':['get','name']}}),true);
 assert.equal(isReadablePointLabelLayer({id:'road-name',type:'symbol',layout:{'text-field':['get','name'],'symbol-placement':'line'}}),false);
 const labels=[{id:'dongjak-admin-dong-labels',type:'symbol',layout:{'text-field':['get','name']}}];
 const watchers=new Map();let pitch=45,updates=0;
 const map={getPitch:()=>pitch,getStyle:()=>({layers:labels}),getLayoutProperty:(id,k)=>labels[0].layout[k],
  setLayoutProperty:(id,k,v)=>{labels[0].layout[k]=v;updates++;},
  on:(name,cb)=>watchers.set(name,cb),off:(name)=>watchers.delete(name)};
 const old=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=cb=>cb();
 try{
  const cleanup=installReadable3DLabels({map});
  assert.equal(labels[0].layout['symbol-height-offset'],0);
  const n=updates;watchers.get('styledata')();assert.equal(updates,n);
  pitch=0;watchers.get('pitchend')();assert.equal(labels[0].layout['symbol-height-offset'],0);
  cleanup();assert.equal(watchers.has('styledata'),false);
 }finally{globalThis.requestAnimationFrame=old;}
});

test('phone dial action absent, and AI explanation remains a secure on-demand server call',()=>{
 const details=read('src/place-details.js');
 assert.doesNotMatch(details,/전화 걸기|tel:\$/);
 assert.match(details,/AI 설명/);
 assert.match(details,/\/api\/place-insight/);
 const vite=read('vite.config.js');
 assert.match(vite,/onRequestPost/);
 assert.match(vite,/\/api\/place-insight/);
 assert.doesNotMatch(vite,/VITE_OPENAI_API_KEY/);
});

test('AI API uses Cloudflare Workers AI binding and returns fact-bounded Korean explanation',async()=>{
 let model,input;
 const request=new Request('https://localhost.test/api/place-insight',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({name:'중앙대학교',type:'대학교',lat:37.504, lng:126.956,address:'동작구 흑석로 84'})});
 const result=await onRequestPost({request,env:{AI:{run:async(nextModel,nextInput)=>{
  model=nextModel;input=nextInput;
  return {response:'확인된 기관 주소를 바탕으로 위치를 안내할 수 있습니다.'};
 }}}});
 assert.equal(result.status,200);assert.match((await result.json()).text,/확인된 기관/);
 assert.equal(model,'@cf/meta/llama-3.3-70b-instruct-fp8-fast');
 assert.match(input.messages[0].content,/근거 없이 추정하지 마세요/);
 assert.match(input.messages[1].content,/중앙대학교/);
});

test('all five official logos load into native map layer and replace generic dots', async()=>{
 const before=globalThis.Image;
 const imageIds=new Set(), sources=new Map(),layers=new Map(), events=[];
 const map={
  addSource:(name,source)=>sources.set(name,source),getSource:name=>sources.get(name),
  addLayer:layer=>layers.set(layer.id,layer),getLayer:id=>layers.get(id),
  addImage:(id,img)=>imageIds.add(id),hasImage:id=>imageIds.has(id),
  setLayoutProperty:(id,key,value)=>{layers.get(id).layout={...(layers.get(id).layout||{}),[key]:value};},
  getStyle:()=>({layers:[...layers.values()]}),
  moveLayer:()=>{},setPaintProperty:()=>{},on:(...args)=>events.push(args),off:()=>{}
 };
 class FakeImage{set src(url){this._src=url;this.onload?.();}}
 globalThis.Image=FakeImage;
 try{
  const {installFeaturedPlaceLabels}=await import('../src/featured-place-labels.js');
  installFeaturedPlaceLabels({map,app:{dataset:{theme:'dark'}}});
  assert.equal(imageIds.size,5);
  const logos=layers.get(FEATURED_PLACES_LOGOS);
  assert.equal(logos.type,'symbol');
  assert.equal(logos.layout['icon-image'][1],'logo');
  assert.equal(layers.get('dongjak-featured-place-dots').layout.visibility,'none');
  assert.ok(events.some(item=>item[0]==='click'&&item[1]===FEATURED_PLACES_LOGOS));
 }finally{globalThis.Image=before;}
});
