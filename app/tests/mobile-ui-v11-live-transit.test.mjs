import test from 'node:test';import assert from 'node:assert/strict';
import {pointBetweenDisplayedStations,snapToDisplayedRail,projectOnLine,haversineMeters,setDisplayedRailPaths,getDisplayedRailPaths} from '../src/features/liveTransit/geometry.js';
import {metroToFeatures,payloadToCollection,LINE_COLORS} from '../src/features/liveTransit/normalize.js';
import {trainFacing,attachLiveTransitOverlay,preserveMetroEvents,LIVE_METRO_LAYER,LIVE_BUS_LAYER,LIVE_SOURCE} from '../src/features/liveTransit/index.js';
import {createVehiclePopupTracker,buildDongjakMetroLines} from '../src/features/liveTransit/integrate.js';
const A=[126.94,37.51],B=[126.946,37.516],C=[126.952,37.51];
const paths=[[A,B],[B,C]], rendered=new Map([['9호선',paths]]);
const routes={'9호선':{stations:[{name:'A',lngLat:A},{name:'C',lngLat:C}],geometry:{coordinates:[A,C]},segmentTimeSeconds:100}};
const NOW=Date.parse('2026-11-19T05:45:00Z');
const metro=(over={})=>({id:'metro:9:9120:0',line:'9호선',trainNo:'9120',station:'A',destination:'C',direction:'0',status:'2',observedAt:new Date(NOW-50000).toISOString(),...over});
const ons=(p,segments=paths)=>segments.some(s=>projectOnLine(s,p).errorMeters<.04);
const feature=(p={})=>({type:'Feature',properties:{id:'selected',mode:'metro',line:'9호선',vehicleLabel:'9120',color:LINE_COLORS['9호선'],destination:'중앙보훈병원',station:'샛강',nextStation:'노량진',status:'2',observedAt:new Date(NOW).toISOString(),...p},geometry:{type:'Point',coordinates:A}});
const collection=(...features)=>({type:'FeatureCollection',features});
const fd=(p={})=>({...feature(p).properties,coordinates:A});
function mockMap(){return {sources:new Map(),layers:new Map(),events:new Map(),zoom:15,
  getSource(id){return this.sources.get(id)},addSource(id,v){this.sources.set(id,{...v,setData(data){this.data=data}})},removeSource(id){this.sources.delete(id)},getLayer(id){return this.layers.get(id)},addLayer(v){this.layers.set(v.id,v)},removeLayer(id){this.layers.delete(id)},on(name,fn){this.events.set(name,fn)},off(name,fn){if(this.events.get(name)===fn)this.events.delete(name)},getZoom(){return this.zoom},isStyleLoaded(){return true},queryRenderedFeatures(){return this.hits??[]}};}
function fakeDoc(){return {createElement(){const n={className:'',textContent:'',children:[],style:{},hidden:false,isConnected:true,append(...items){for(const child of items){child.parentElement=this;this.children.push(child)}}};return n;}}}
class Popup{static created=[];constructor(options){this.options=options;this.opened=false;this.moves=[];Popup.created.push(this)}setLngLat(p){this.moves.push(p);return this}setDOMContent(n){this.node=n;return this}addTo(){this.opened=true;return this}on(_,fn){this.onClose=fn;return this}isOpen(){return this.opened}remove(){this.opened=false;this.onClose?.();return this}}
const flatten=n=>[n.textContent,...n.children.flatMap(flatten)].join(' ');
const wait=(ms=5)=>new Promise(r=>setTimeout(r,ms));
async function waitUntil(predicate,timeout=3000){const end=Date.now()+timeout;while(!predicate()){if(Date.now()>=end)assert.fail('Expected render state was not reached');await wait(10);}}
test('curved connected displayed geometry, not the fallback chord',()=>{const p=pointBetweenDisplayedStations(paths,A,C,.5);assert(ons(p));assert(haversineMeters(p,B)<2);for(let i=0;i<=20;i++)assert(ons(pointBetweenDisplayedStations(paths,A,C,i/20)))});
test('reverse traversal and split reversed official segments',()=>{const rev=[[C,B],[B,A]];assert(haversineMeters(pointBetweenDisplayedStations(rev,C,A,.25),pointBetweenDisplayedStations(paths,A,C,.75))<1);});
test('disconnected railway paths do not create invented connector',()=>{const broken=[[A,[126.942,37.512]],[[126.950,37.512],C]];assert.equal(pointBetweenDisplayedStations(broken,A,C,.5),null);assert.equal(pointBetweenDisplayedStations([],A,C,.5),null)});
test('station snapping stays on displayed track and rejects unreachable stations',()=>{assert(ons(snapToDisplayedRail(paths,[126.9401,37.5101])));assert.equal(snapToDisplayedRail(paths,[127,37.6]),null)});
test('metro positions are drawn on updated rendered curves at every frame',()=>{for(let i=0;i<20;i++){const f=metroToFeatures([metro()],routes,NOW+i*1000,90000,rendered)[0];assert(ons(f.geometry.coordinates));assert.equal(f.properties.nextStation,'C');assert.equal(f.properties.accuracy,'estimated')}});
test('geometric gaps and missing line in rendered index suppress markers',()=>{const broken=new Map([['9호선',[[A,[126.942,37.512]],[[126.950,37.512],C]]]]);assert.equal(metroToFeatures([metro()],routes,NOW,90000,broken).length,0);assert.equal(metroToFeatures([metro()],routes,NOW,90000,new Map()).length,0)});
test('legacy fallback works only before rendered index is published',()=>{const f=metroToFeatures([metro()],routes,NOW);assert.equal(f.length,1);assert.equal(f[0].geometry.coordinates[1],37.51)});
test('arrival and unknown direction do not invent movement',()=>{const f=metroToFeatures([metro({status:'1',station:'C',destination:''})],routes,NOW,90000,rendered)[0];assert(haversineMeters(f.geometry.coordinates,C)<1);const g=metroToFeatures([metro({direction:'',destination:''})],routes,NOW,90000,rendered)[0];assert(haversineMeters(g.geometry.coordinates,A)<1)});
test('destination priority corrects contradictory direction code',()=>{const f=metroToFeatures([metro({station:'C',destination:'A',direction:'0'})],routes,NOW,90000,rendered)[0];assert.equal(f.properties.nextStation,'A');assert(ons(f.geometry.coordinates));const cfg=buildDongjakMetroLines();assert.equal(cfg['9호선'].terminalDirections.중앙보훈병원,'down');assert.equal(cfg['7호선'].terminalDirections.석남,'down')});
test('prior departure progresses along the same line, status/stale guard',()=>{const f=metroToFeatures([metro({status:'3',station:'C',destination:'',direction:'0'})],routes,NOW,90000,rendered)[0];assert(ons(f.geometry.coordinates));const later=metroToFeatures([metro({status:'3',station:'C',destination:'',direction:'0'})],routes,NOW+5000,90000,rendered)[0];assert(haversineMeters(f.geometry.coordinates,later.geometry.coordinates)>1);assert.equal(metroToFeatures([metro({observedAt:new Date(NOW-100000).toISOString()})],routes,NOW,90000,rendered).length,0)});
test('shared map geometry replacement does not affect another map',()=>{const m={},other={};setDisplayedRailPaths(m,rendered);assert.equal(getDisplayedRailPaths(m),rendered);assert.equal(getDisplayedRailPaths(other),undefined);const newer=new Map();setDisplayedRailPaths(m,newer);assert.equal(getDisplayedRailPaths(m),newer)});
test('repeated provider update keeps same event clock',()=>{const item=metro(),old=preserveMetroEvents([item]);assert.equal(preserveMetroEvents([{...item,observedAt:new Date(NOW).toISOString()}],old)[0].eventAt,item.observedAt)});
test('popup moves with selected ID and updates data; other ID cannot move it',()=>{const tracker=createVehiclePopupTracker({}, {Popup},fakeDoc());tracker.open(fd());const popup=Popup.created.at(-1);assert.equal(popup.options.closeOnClick,false);assert(flatten(popup.node).includes('GPS 아님'));assert(flatten(popup.node).includes('중앙보훈병원행'));tracker.render(collection({...feature({id:'other'}),geometry:{coordinates:C}}, {...feature({station:'노량진',status:'1',nextStation:''}),geometry:{coordinates:B}}));assert.deepEqual(popup.moves.at(-1),B);assert(flatten(popup.node).includes('노량진역'));tracker.render(collection(feature({id:'other'})));assert.equal(popup.opened,false)});
test('popup manual close, fast reselect and invalid feed cannot reopen it',()=>{const tracker=createVehiclePopupTracker({}, {Popup},fakeDoc());tracker.open(fd());const first=Popup.created.at(-1);tracker.open(fd({id:'next'}));const second=Popup.created.at(-1);assert(!first.opened&&second.opened);first.onClose?.();tracker.render(collection(feature({id:'next'})));assert(second.opened);second.remove();tracker.render(collection(feature({id:'next'})));assert(!second.opened);tracker.close()});
test('missing fields show explicit unknown, no double destination suffix',()=>{const tracker=createVehiclePopupTracker({}, {Popup},fakeDoc());tracker.open(fd({vehicleLabel:'',destination:'석남행',nextStation:'',station:'장승배기역',status:'bad',observedAt:'bad'}));const text=flatten(Popup.created.at(-1).node);assert(text.includes('열차 번호 미제공'));assert(text.includes('석남행'));assert(!text.includes('석남행행'));assert(!text.includes('장승배기역역'));assert(text.includes('수신 시각 미확인'));tracker.close()});
test('bus position path remains unmodified and existing card preserved',()=>{const tracker=createVehiclePopupTracker({}, {Popup},fakeDoc());tracker.open({id:'b',mode:'bus',name:'500',coordinates:A});const pop=Popup.created.at(-1);assert(pop.options.closeOnClick);assert(flatten(pop.node).includes('500'));const f=payloadToCollection({bus:[{id:'b',routeName:'500',longitude:A[0],latitude:A[1],observedAt:new Date(NOW).toISOString()}]}, {},NOW);assert.deepEqual(f.features[0].geometry.coordinates,A);tracker.close()});
test('render loop tracks exact drawn coordinates and no metro chord after refresh',async()=>{const map=mockMap();let frames=[],click=null,miss=0;setDisplayedRailPaths(map,rendered);const actual=()=>metro({observedAt:new Date(Date.now()-20000).toISOString()});let next=actual();const overlay=attachLiveTransitOverlay(map,{stationLines:routes,renderIntervalMs:100,getVehicles:async()=>({metro:[next],bus:[]}),onVehiclesRendered:f=>frames.push(f),onVehicleClick:f=>click=f,onVehicleMiss:()=>miss++});try{overlay.start();await wait();const f=map.getSource(LIVE_SOURCE).data.features[0];assert(ons(f.geometry.coordinates));map.hits=[{properties:f.properties,geometry:{coordinates:C}}];map.events.get('click')({point:{}});assert.deepEqual(click.coordinates,f.geometry.coordinates);await wait(120);const nextF=frames.at(-1).features[0];assert(ons(nextF.geometry.coordinates));next=metro({observedAt:new Date().toISOString(),station:'C',status:'1'});await overlay.refresh();assert(ons(frames.at(-1).features[0].geometry.coordinates));assert(haversineMeters(frames.at(-1).features[0].geometry.coordinates,C)<1);map.hits=[];map.events.get('click')({point:{}});assert.equal(miss,1);overlay.setVisible('metro',false);assert.equal(frames.at(-1).features.length,0);assert.equal(map.layers.size,2)}finally{overlay.destroy()}assert.equal(map.layers.size,0);assert.equal(map.sources.size,0)});
test('stop/restart ignores old in-flight response and clears selection',async()=>{const map=mockMap();setDisplayedRailPaths(map,rendered);const resolvers=[];const frames=[];const overlay=attachLiveTransitOverlay(map,{stationLines:routes,getVehicles:({signal})=>new Promise(resolve=>resolvers.push({resolve,signal})),onVehiclesRendered:f=>frames.push(f)});const payload={metro:[metro({observedAt:new Date().toISOString()})],bus:[]};try{overlay.start();assert.equal(resolvers.length,1);overlay.stop();assert(resolvers[0].signal.aborted);overlay.start();assert.equal(resolvers.length,2);resolvers[0].resolve(payload);await wait();assert.equal(overlay.getStatus().vehicles,0);resolvers[1].resolve(payload);await wait();assert.equal(overlay.getStatus().vehicles,1);map.zoom=10;await wait(550);assert.equal(frames.at(-1).features.length,0)}finally{overlay.destroy()}});

const heading=(a,b)=>({headingKnown:true,headingFromLng:a[0],headingFromLat:a[1],headingToLng:b[0],headingToLat:b[1]});
test('opposite directions on same displayed track have opposite horizontal icons',()=>{
 const a=metroToFeatures([metro()],routes,NOW-10000,90000,rendered)[0];
 const b=metroToFeatures([metro({station:'C',destination:'A',direction:'1'})],routes,NOW-10000,90000,rendered)[0];
 assert.equal(trainFacing({},a.properties),'right');assert.equal(trainFacing({},b.properties),'left');
});
test('local curve changes facing without changing train direction code',()=>{
 const P=[126.946,37.51],Q=[126.951,37.514],R=[126.947,37.518];
 const curve=new Map([['9호선',[[P,Q],[Q,R]]]]);
 const cfg={'9호선':{stations:[{name:'A',lngLat:P},{name:'C',lngLat:R}],geometry:{coordinates:[P,R]},segmentTimeSeconds:100}};
 const first=metroToFeatures([metro()],cfg,NOW-30000,90000,curve)[0];
 const last=metroToFeatures([metro()],cfg,NOW+30000,90000,curve)[0];
 assert.equal(trainFacing({},first.properties),'right');assert.equal(trainFacing({},last.properties),'left');
});
test('rotated viewport reverses facing, projection failures use geographic tangent',()=>{
 const p=heading(A,C);assert.equal(trainFacing({project:([x,y])=>({x:-x,y:y})},p),'left');
 assert.equal(trainFacing({project(){throw Error('not ready')}},p),'right');
});
test('vertical near-zero screen tangent preserves known facing; missing direction remains unknown',()=>{
 const p=heading(A,[A[0],A[1]+.001]);assert.equal(trainFacing({},p,'left'),'left');assert.equal(trainFacing({},p,'right'),'right');
 assert.notEqual(trainFacing({},p),trainFacing({},heading([A[0],A[1]+.001],A)));
 assert.equal(trainFacing({}, {headingKnown:false}),null);
 const f=metroToFeatures([metro({direction:'',destination:''})],routes,NOW,90000,rendered)[0];assert.equal(f.properties.headingKnown,false);
});
test('stopped train uses outgoing tangent; terminal uses incoming tangent',()=>{
 const a=metroToFeatures([metro({status:'1'})],routes,NOW,90000,rendered)[0];
 const c=metroToFeatures([metro({station:'C',destination:'',status:'1',direction:'0'})],routes,NOW,90000,rendered)[0];
 assert.equal(trainFacing({},a.properties),'right');assert.equal(trainFacing({},c.properties),'right');
});
test('rendered icon key flips with map orientation without moving train',async()=>{
 const map=mockMap();setDisplayedRailPaths(map,rendered);let sign=1;map.project=([x,y])=>({x:sign*x,y});
 const overlay=attachLiveTransitOverlay(map,{stationLines:routes,renderIntervalMs:100,getVehicles:async()=>({metro:[metro({status:'1',observedAt:new Date().toISOString()})],bus:[]})});
 try{overlay.start();const current=()=>map.getSource(LIVE_SOURCE)?.data.features[0];await waitUntil(()=>current()?.properties.trainIcon==='dj-live-train-9호선');const coords=current().geometry.coordinates;sign=-1;await waitUntil(()=>current()?.properties.trainIcon==='dj-live-train-9호선-left');assert.deepEqual(current().geometry.coordinates,coords);sign=1;await waitUntil(()=>current()?.properties.trainIcon==='dj-live-train-9호선');assert.deepEqual(current().geometry.coordinates,coords);}finally{overlay.destroy()}
});

test('high-DPI train icons retain full raster and mirror all pixels',async()=>{
 const {trainIconImage}=await import('../src/features/liveTransit/index.js');
 const ctx=new Proxy({getImageData(x,y,w,h){const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){data[i*4]=i%w;data[i*4+3]=255}return {data}}},{get(t,k){return k in t?t[k]:()=>{}},set(t,k,v){t[k]=v;return true}});
 const doc={createElement:()=>({getContext:()=>ctx})};
 const right=trainIconImage('#123456',doc,'right'),left=trainIconImage('#123456',doc,'left');
 assert.equal(right.width,96);assert.equal(left.height,96);assert.equal(right.data.length,96*96*4);assert.equal(left.data.length,right.data.length);
 for(let y=0;y<96;y++)for(let x=0;x<96;x++)assert.equal(left.data[(y*96+x)*4],right.data[(y*96+95-x)*4]);
});
