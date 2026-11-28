import test from 'node:test';import assert from 'node:assert/strict';import {markStreamArrivals,createStreamArrivalFade,streamOpacity,streamFeatureDiff} from '../src/map-stream-arrivals.mjs';import {viewportKeys,createTransitCellStream} from '../src/transit-stream-grid.mjs';
test('only newly arrived markers fade; existing markers remain opaque',()=>{const fc=ids=>({type:'FeatureCollection',features:ids.map(osmId=>({type:'Feature',properties:{osmId},geometry:{type:'Point',coordinates:[126.94,37.5]}}))});const a=markStreamArrivals(fc(['a','b']));const b=markStreamArrivals(fc(['b','c']),a.ids);assert.deepEqual(b.fresh,['c']);assert.deepEqual(b.collection.features.map(f=>f.properties.streamAlpha),[undefined,undefined]);assert.deepEqual(streamOpacity,['coalesce',['feature-state','streamAlpha'],1]);});
test('visible cells are prioritized independently from surrounding prefetch',()=>{const b={west:126.941,east:126.949,south:37.491,north:37.499};const all=viewportKeys(b,17),visible=viewportKeys(b,17,{},undefined,0);assert.ok(visible.length<all.length);assert.deepEqual(all.slice(0,visible.length),visible);});
test('prefetch completion is not required to publish ready visible cells',async()=>{const pending=new Map(),states=[];const stream=createTransitCellStream({load:k=>new Promise(r=>pending.set(k,r)),onChange:(rows,s)=>states.push({...s,rows})});stream.update(['core','ahead'],['core']);await Promise.resolve();pending.get('core')(['core']);await new Promise(r=>setTimeout(r,70));assert.equal(states.at(-1).criticalPending,0);assert.equal(states.at(-1).pending,1);stream.dispose();});

test('completed fades restore full opacity; source replacement never serializes translucent data',()=>{
 let time=0,sequence=0,loaded=false,data,states=new Map(),events={},timers=new Map();
 const map={getSource:()=>({setData:d=>{data=d;loaded=false;}}),isSourceLoaded:()=>loaded,on:(e,f)=>events[e]=f,setFeatureState:(t,s)=>{assert.equal(typeof t.id,'number');states.set(t.id,s.streamAlpha);},removeFeatureState:t=>states.delete(t.id)};
 const schedule=(f,ms)=>{const id=++sequence;timers.set(id,{f,at:time+ms});return id;},cancel=id=>timers.delete(id);
 const advance=ms=>{const end=time+ms;while(true){const q=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!q)break;time=q[1].at;timers.delete(q[0]);q[1].f();}time=end;};
 const fc=ids=>({type:'FeatureCollection',features:ids.map(osmId=>({type:'Feature',properties:{osmId},geometry:{type:'Point',coordinates:[126.94,37.5]}}))});
 const fade=createStreamArrivalFade(map,'bus',{now:()=>time,schedule,cancel});
 fade.publish(fc(['a']));const a=data.features[0].id;assert.equal(data.features[0].properties.streamAlpha,undefined);loaded=true;events.sourcedata({sourceId:'bus',isSourceLoaded:true});advance(250);assert.equal(states.get(a),1);
 fade.publish(fc(['a','b']));const b=data.features[1].id;assert.equal(data.features[0].id,a);assert.equal(states.get(a),1);advance(900);assert.equal(states.get(b),1);
 fade.publish(fc(['b','c']));const c=data.features[1].id;fade.publish(fc(['b','c','d']));assert.equal(states.get(c),1);advance(900);assert.equal(states.get(data.features[2].id),1);
});

test('incremental bus updates do not rebuild retained geometry or replay fades on reentry',()=>{
 const f=(id,x=1)=>({type:'Feature',id,properties:{osmId:String(id)},geometry:{type:'Point',coordinates:[x,2]}});
 assert.deepEqual(streamFeatureDiff([f(1),f(2)],[f(1),f(3)]),{remove:[2],add:[f(3)],update:[]});
 assert.deepEqual(streamFeatureDiff([f(1)],[f(1,2)]).update,[{id:1,newGeometry:f(1,2).geometry}]);
 const writes=[],states=[],src={setData:d=>writes.push(['full',d]),updateData:d=>writes.push(['diff',d])},map={getSource:()=>src,isSourceLoaded:()=>false,on(){},setFeatureState:(id,s)=>states.push([id.id,s.streamAlpha])};
 const fade=createStreamArrivalFade(map,'bus',{schedule:()=>1,cancel:()=>{}});
 const fc=features=>({type:'FeatureCollection',features});
 fade.publish(fc([f(1),f(2)]));const a=writes[0][1].features[0].id;
 fade.publish(fc([f(1),f(2)]));assert.equal(writes.length,1);
 fade.publish(fc([f(2)]));fade.publish(fc([f(1),f(2)]));assert.equal(writes.length,3);
 assert.equal(states.filter(([id,v])=>id===a&&v===.15).length,1);
});

test('authoritative bus snapshots replace all stale IDs, do not replay opacity changes and skip identical writes',()=>{const writes=[],states=[],src={setData:d=>writes.push(d),updateData:()=>assert.fail('no incremental worker updates for authoritative stops')},map={getSource:()=>src,isSourceLoaded:()=>true,on(){},setFeatureState:(...args)=>states.push(args)};const owner=createStreamArrivalFade(map,'bus',{incremental:false,fade:false});const fc=ids=>({type:'FeatureCollection',features:ids.map(osmId=>({type:'Feature',properties:{osmId},geometry:{type:'Point',coordinates:[126.94,37.5]}}))});owner.publish(fc(['native-copy','20808']));owner.publish(fc(['20808']));owner.publish(fc(['20808']));assert.equal(writes.length,2);assert.deepEqual(writes[1].features.map(f=>f.properties.osmId),['20808']);assert.equal(states.length,0);});
