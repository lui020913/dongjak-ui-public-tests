import test from 'node:test';import assert from 'node:assert/strict';import {createBuildingTileQueue,isolateNativeBuildingTiles,NATIVE_BUILDING_SOURCE,NATIVE_BUILDING_STAGES,NATIVE_BUILDING_STAGE_MS,buildingTileUrl} from '../src/native-building-stream.mjs';import {extractBuildingTile,partitionBuildingTile} from '../server/district-road-tile.mjs';
test('building PBF extraction preserves building bytes and excludes roads',()=>{const enc=new TextEncoder(),layer=name=>{const n=enc.encode(name);return [26,n.length+2,10,n.length,...n];};const building=layer('building'),road=layer('transportation');assert.deepEqual([...extractBuildingTile(Uint8Array.from([...road,...building]))],building);});
test('only one building tile runs and canceled queued tiles are not requested',async()=>{const started=[],release=[],timers=[];const queue=createBuildingTileQueue(url=>{started.push(url);return new Promise(r=>release.push(r));},{schedule:f=>timers.push(f)});const abort=new AbortController();const a=queue('a'),b=queue('b',abort.signal).catch(e=>e.name),c=queue('c');await Promise.resolve();assert.deepEqual(started,['a']);abort.abort();assert.equal(await b,'AbortError');release[0]('a');await a;await Promise.resolve();timers.shift()();await Promise.resolve();assert.deepEqual(started,['a','c']);release[1]('c');await c;});
test('only native building geometry changes source; road and names retain original source and layer IDs',()=>{const layers=[{id:'land',type:'fill',source:'openmaptiles','source-layer':'landuse'},{id:'building',type:'fill',source:'openmaptiles','source-layer':'building',paint:{'fill-color':'#fafafa'}},{id:'road',type:'line',source:'openmaptiles','source-layer':'transportation'},{id:'name',type:'symbol',source:'openmaptiles','source-layer':'building'}];const source={tiles:['https://tiles.openfreemap.org/planet/test/{z}/{x}/{y}.pbf?dj-road-mode=reduced'],maxzoom:14},sources=new Map([['openmaptiles',source]]);const map={getStyle:()=>({layers:layers.slice(),sources:{openmaptiles:{type:'vector'}}}),getLayer:id=>layers.find(l=>l.id===id),getSource:id=>sources.get(id),addSource:(id,v)=>sources.set(id,v),removeLayer:id=>layers.splice(layers.findIndex(l=>l.id===id),1),addLayer:(l,before)=>{const i=layers.findIndex(x=>x.id===before);layers.splice(i<0?layers.length:i,0,l);}};assert.equal(isolateNativeBuildingTiles(map),true);assert.deepEqual(layers.map(l=>l.id),['land','building',...Array.from({length:NATIVE_BUILDING_STAGES-1},(_,i)=>'building-building-stage-'+(i+1)),'road','name']);assert.equal(layers[1].source,NATIVE_BUILDING_SOURCE);assert.equal(layers[1].paint['fill-color'],'#fafafa');for(let i=1;i<NATIVE_BUILDING_STAGES;i++)assert.equal(layers[i+1].source,NATIVE_BUILDING_SOURCE+'-'+i);assert.equal(layers.at(-2).source,'openmaptiles');assert.equal(layers.at(-1).source,'openmaptiles');assert.equal(sources.get(NATIVE_BUILDING_SOURCE).tiles[0],buildingTileUrl(source.tiles[0]));});

test('intra-tile stages preserve each encoded feature exactly once and keep layer metadata',()=>{
 const name=[10,8,...new TextEncoder().encode('building')],records=Array.from({length:9},(_,i)=>[18,2,8,i+1]),payload=[...name,...records.flat()],tile=Uint8Array.from([26,payload.length,...payload]);
 const stages=partitionBuildingTile(tile,NATIVE_BUILDING_STAGES);assert.equal(stages.length,5);
 const ids=stages.flatMap(p=>{assert.deepEqual([...p.slice(2,12)],name);const a=[];for(let i=12;i<p.length;i+=4){assert.equal(p[i],18);a.push(p[i+3]);}return a;});
 assert.deepEqual(ids.sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9]);assert.deepEqual(stages.map(p=>(p.length-12)/4),[2,2,2,2,1]);
});

test('protocol parses each stage and serves distinct batches from one fetched tile',async()=>{
 const {registerNativeBuildingProtocol}=await import('../src/native-building-stream.mjs');
 const name=[10,8,...new TextEncoder().encode('building')],records=Array.from({length:9},(_,i)=>[18,2,8,i+1]),payload=[...name,...records.flat()],tile=Uint8Array.from([26,payload.length,...payload]);let fetches=0,handler;
 registerNativeBuildingProtocol({addProtocol:(name,fn)=>handler=fn},{fetcher:async url=>{fetches++;assert.ok(!url.includes('dj-building-stage'));return {ok:true,arrayBuffer:async()=>tile.buffer};}});
 const url='https://tiles.openfreemap.org/planet/test/14/1/2.pbf';
 const batches=await Promise.all(Array.from({length:NATIVE_BUILDING_STAGES},(_,i)=>i).map(stage=>handler({url:buildingTileUrl(url,stage)},new AbortController())));
 assert.equal(fetches,1);assert.equal(new Set(batches.map(b=>[...new Uint8Array(b.data)].join(','))).size,NATIVE_BUILDING_STAGES);
});

test('sparse building tiles render their first features without waiting for empty stages',()=>{const name=[10,8,...new TextEncoder().encode('building')],payload=[...name,18,2,8,1,18,2,8,2],tile=Uint8Array.from([26,payload.length,...payload]);const stages=partitionBuildingTile(tile,NATIVE_BUILDING_STAGES);assert.deepEqual(stages.map(p=>(p.length-12)/4),[1,1,0,0,0]);assert.ok(NATIVE_BUILDING_STAGE_MS*NATIVE_BUILDING_STAGES<=195);});

test('queued abort listeners are released as soon as a job starts or is canceled',async()=>{
 const events=[],release=[],timers=[];
 const controller=new AbortController(),signal=controller.signal;
 const add=signal.addEventListener.bind(signal),remove=signal.removeEventListener.bind(signal);
 signal.addEventListener=(type,fn,opts)=>{events.push(['add',type]);add(type,fn,opts);};
 signal.removeEventListener=(type,fn)=>{events.push(['remove',type]);remove(type,fn);};
 const queue=createBuildingTileQueue((url,s)=>new Promise(r=>release.push(r)),{schedule:fn=>timers.push(fn)});
 const a=queue('a'),b=queue('b',signal);
 assert.deepEqual(events,[['add','abort']]);
 await Promise.resolve();release.shift()('a');await a;await Promise.resolve();timers.shift()();await Promise.resolve();
 assert.deepEqual(events,[['add','abort'],['remove','abort']]);
 release.shift()('b');assert.equal(await b,'b');
});
