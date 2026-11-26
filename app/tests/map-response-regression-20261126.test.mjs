import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialFeatures,installSeoulOfficialFacilities,buildLayers} from '../src/seoul-official-facilities.js';
import {nativePavedAreaPaint} from '../src/ui-environment.js';
import {LABEL_HALO_MAX_PX} from '../src/map-label-halo.js';
const src=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('theme and idle halo cap use the same value rather than oscillating',()=>{
 assert.equal(LABEL_HALO_MAX_PX,1.1);
 assert.equal((src('ui-environment.js').match(/width:LABEL_HALO_MAX_PX/g)||[]).length,2);
});
test('facility reconciliation is dirty-driven, deferred, and cancels pending work during gestures',()=>{
 const s=src('civic-facility-layer.js');
 assert.match(s,/if\(!dedupDirty\|\|dedupTimer\|\|map\.isMoving/);
 assert.match(s,/map\.on\('idle',scheduleReconcile\)/);
 assert.match(s,/map\.on\('movestart',\(\)=>\{if\(dedupTimer\)/);
 assert.doesNotMatch(s,/map\.on\('idle',reconcileOfficialDuplicates\)/);
});
test('indexed facility dedup retains the existing punctuation and category identity rules',()=>{
 const boundary={type:'Polygon',coordinates:[[[126.9,37.45],[127,37.45],[127,37.55],[126.9,37.55],[126.9,37.45]]]};
 const p={name:'상도-약국',category:'약국',lng:126.95,lat:37.5};
 assert.equal(officialFeatures([p,{...p,name:'상도 약국',lng:126.95003},{...p,name:'상도 약국',category:'병원'}],boundary).features.length,2);
});

test('native transportation areas distinguish pedestrian surfaces while ordinary carriageways remain white',()=>{
 const color=nativePavedAreaPaint();
 assert.equal(color[0],'match');
 assert.ok(color[2].includes('path')&&color[2].includes('pedestrian'));
 assert.equal(color[3],'#e7e9e2');
 assert.equal(color[4],'#ffffff');
 assert.match(src('ui-environment.js'),/entry\.pavedArea\?nativePavedAreaPaint/);
});

test('official POI source commits are deferred until movement stops; unchanged data and paint are not reapplied',()=>{
 const s=src('seoul-official-facilities.js');
 assert.match(s,/if\(!active\|\|map\.isMoving\?\.\(\)\|\|!pendingPublish\)return/);
 assert.match(s,/appliedFacilityData\.get\(existing\)!==data/);
 assert.match(s,/map\.on\('movestart',movementStart\)/);
 assert.match(s,/getPaintProperty\?\.\(POINTS,key\)!==value/);
 assert.match(s,/b\.getWest\(\)>=w&&b\.getSouth\(\)>=s/);
});

test('delayed POI response during a gesture performs zero source writes; settled movement publishes once',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const props=['document','location','fetch'],saved=props.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
 const set=(k,value)=>Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});
 let moving=false,source=null,layer=null,fetches=0,writes=0,styleWrites=0,requestResolve;
 const events=new Map();
 const map={getStyle:()=>({}),hasImage:()=>true,getSource:()=>source,addSource:(_id,v)=>{source={data:v.data,setData(data){this.data=data;writes++;}};},
 getLayer:id=>id==='dj-seoul-official-points'?layer:null,addLayer:v=>{layer=v;},getFilter:()=>layer?.filter,
 setFilter:(_id,v)=>{layer.filter=v;styleWrites++;},getPaintProperty:(_id,key)=>layer?.paint[key],
 setPaintProperty:(_id,key,v)=>{layer.paint[key]=v;styleWrites++;},
 getZoom:()=>16,isMoving:()=>moving,getBounds:()=>({getWest:()=>126.949,getEast:()=>126.952,getSouth:()=>37.499,getNorth:()=>37.502}),
 on:(name,...args)=>{if(args.length===1)events.set(name,args[0]);},off:name=>events.delete(name)};
 const boundary={type:'Polygon',coordinates:[[[126.9,37.45],[127,37.45],[127,37.55],[126.9,37.55],[126.9,37.45]]]};
 let controller;
 try{
  set('document',{getElementById:()=>null,addEventListener(){},removeEventListener(){}});set('location',{origin:'https://example.test'});
  set('fetch',async url=>{fetches++;if(String(url).includes('/api/osm-general-facilities'))return {ok:true,json:async()=>({elements:[]})};if(!requestResolve){await new Promise(resolve=>{requestResolve=resolve;});}return {ok:true,json:async()=>({ok:true,places:[{id:'a',name:'테스트약국',category:'약국',lng:126.95,lat:37.5}],hasMore:false})};});
  controller=installSeoulOfficialFacilities({map,getBoundary:()=>boundary});
  const work=controller.refresh();assert.ok(requestResolve);
  moving=true;events.get('movestart')();requestResolve();await work;
  t.mock.timers.tick(2000);assert.equal(writes,0);
  moving=false;events.get('moveend')();t.mock.timers.tick(349);assert.equal(writes,0);
  t.mock.timers.tick(1);assert.equal(writes,1);assert.equal(source.data.features.length,1);
  const before=fetches;await controller.refresh();assert.equal(fetches,before);
  buildLayers(map,source.data);assert.equal(writes,1);assert.equal(styleWrites,0);
 }finally{controller?.stop();for(const [k,d] of saved){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
