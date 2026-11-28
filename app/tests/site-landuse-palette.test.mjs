import test from 'node:test';import assert from 'node:assert/strict';import {SITE_LANDUSE_PALETTE,siteLandusePaint,installSiteLanduse,repaintSiteLanduse,civicParcelCandidate,civicParcelFeature,CIVIC_PARCEL_SOURCE,CIVIC_PARCEL_LAYER} from '../src/site-landuse-palette.mjs';
test('site colors are distinct and only mapped landuse is painted beneath road and building layers',()=>{const layers=[{id:'ground',type:'background'},{id:'landuse',type:'fill',source:'base','source-layer':'landuse'},{id:'water',type:'fill','source-layer':'water'},{id:'roads',type:'line','source-layer':'transportation'},{id:'buildings',type:'fill','source-layer':'building'}],added=[],writes=[];const map={getStyle:()=>({layers}),getLayer:()=>null,addLayer:(l,before)=>{added.push([l,before]);layers.push(l)},getPaintProperty:()=>null,setPaintProperty:(...x)=>writes.push(x)};assert.equal(installSiteLanduse({map,app:{dataset:{theme:'light'}}}).length,1);assert.equal(added[0][1],'water');assert.equal(added[0][0]['source-layer'],'landuse');assert.equal(new Set(Object.values(SITE_LANDUSE_PALETTE.light)).size,6);assert.deepEqual(siteLandusePaint('light'),siteLandusePaint('dark'));repaintSiteLanduse(map,{dataset:{theme:'dark'}});assert.equal(writes.length,1);assert.deepEqual(writes[0][2],siteLandusePaint('dark'));});

// Evaluate the subset of MapLibre expressions used by the site palette.
function evaluate(expression,tags){
 if(!Array.isArray(expression))return expression;
 const [op,...args]=expression;
 if(op==='get')return tags[args[0]];
 if(op==='feature-state')return tags.state?.[args[0]];
 if(op==='boolean')return typeof evaluate(args[0],tags)==='boolean'?evaluate(args[0],tags):args[1];
 if(op==='slice')return evaluate(args[0],tags).slice(args[1]);
 if(op==='==')return evaluate(args[0],tags)===evaluate(args[1],tags);
 if(op==='literal')return args[0];
 if(op==='coalesce')return args.map(x=>evaluate(x,tags)).find(x=>x!=null);
 if(op==='in')return evaluate(args[1],tags).includes(evaluate(args[0],tags));
 if(op==='any')return args.some(x=>evaluate(x,tags));
 if(op==='case'){for(let i=0;i<args.length-1;i+=2)if(evaluate(args[i],tags))return evaluate(args[i+1],tags);return evaluate(args.at(-1),tags);}
 throw new Error('Unexpected expression '+op);
}
test('healthcare and civic polygons get distinct colors ahead of generic site classes with one daytime palette',()=>{
 for(const theme of ['light']){
  const p=SITE_LANDUSE_PALETTE[theme],e=siteLandusePaint(theme);
  assert.equal(new Set(Object.values(p)).size,6);
  for(const [tags,kind] of [
   [{class:'hospital'},'hospital'],[{class:'commercial',healthcare:'clinic'},'hospital'],
   [{amenity:'hospital',landuse:'residential'},'hospital'],[{class:'public'},'public'],
   [{class:'commercial',office:'government'},'public'],[{amenity:'police'},'public'],
   [{amenity:'fire_station'},'public'],[{amenity:'townhall'},'public'],[{class:'town_hall'},'public'],[{class:'commercial',name:'동작구청'},'public'],[{class:'commercial',state:{verifiedCivicSite:true}},'public'],[{class:'commercial',name:'동작구정신건강복지센터'},'public'],
   [{class:'commercial',name:'서울지방병무청'},'public'],[{class:'commercial',name:'상도1동주민센터'},'public'],[{class:'commercial',name:'동작세무서'},'public'],[{class:'public_library'},'public'],[{class:'school'},'education'],[{class:'retail'},'commercial'],
   [{class:'residential',subclass:'apartments'},'residential'],[{class:'industrial'},'industrial']
  ])assert.equal(evaluate(e,tags),p[kind],JSON.stringify(tags));
  assert.equal(evaluate(e,{class:'park'}),'rgba(0,0,0,0)');
  assert.equal(evaluate(e,{class:'residential'}),'rgba(0,0,0,0)');
  assert.equal(p.residential,'#ddd4c8');assert.equal(p.public,'#d1d1cd');
 }
});

test('apartment reference color is painted without blending into the base ground',()=>{const layers=[{id:'landuse',type:'fill',source:'base','source-layer':'landuse'}],added=[];installSiteLanduse({map:{getStyle:()=>({layers}),getLayer:()=>null,addLayer:l=>added.push(l)},app:{dataset:{theme:'light'}}});assert.equal(evaluate(added[0].paint['fill-opacity'],{class:'apartments'}),1);});

test('only a mapped generic parcel at the verified civic anchor is eligible; named unrelated shops and large regions are not',()=>{const place={name:'동작구청'},g={type:'Polygon',coordinates:[[[126.94,37.504],[126.941,37.504],[126.941,37.505],[126.94,37.505],[126.94,37.504]]]};const f={id:42,properties:{class:'commercial'},geometry:g};assert.equal(civicParcelCandidate([f],place),f);assert.equal(civicParcelCandidate([{...f,properties:{class:'commercial',name:'상점'}}],place),null);assert.equal(civicParcelCandidate([{...f,id:undefined}],place),null);});


test('ID-less actual commercial polygon is repainted civic only when it contains the confirmed civic point',()=>{
 const g={type:'Polygon',coordinates:[[[126.94,37.504],[126.941,37.504],[126.941,37.505],[126.94,37.505],[126.94,37.504]]]};
 const f={properties:{class:'commercial'},geometry:g},p={name:'동작구청',lng:126.9402905,lat:37.5042528};
 assert.equal(civicParcelCandidate([f],p),f);assert.deepEqual(civicParcelFeature(f,p).geometry,g);
 assert.equal(civicParcelCandidate([f],{...p,lng:126.939}),null);
 assert.equal(civicParcelCandidate([{...f,properties:{class:'commercial',name:'무관한상점'}}],p),null);
});
test('civic overlay is independent of tile IDs, lies beneath roads and does not republish on idle',()=>{
 const f={properties:{class:'commercial'},geometry:{type:'Polygon',coordinates:[[[126.94,37.504],[126.941,37.504],[126.941,37.505],[126.94,37.505],[126.94,37.504]]]}};
 const layers=[{id:'landuse',type:'fill',source:'base','source-layer':'landuse'},{id:'roads',type:'line','source-layer':'transportation'}],sources=new Map(),handlers={},writes=[];
 const map={getStyle:()=>({layers}),getLayer:id=>layers.find(l=>l.id===id),addLayer:(l,before)=>{const i=layers.findIndex(x=>x.id===before);layers.splice(i<0?layers.length:i,0,l);},addSource:(id,v)=>sources.set(id,{setData:d=>writes.push(d)}),getSource:id=>sources.get(id),on:(n,f)=>handlers[n]=f,project:()=>({x:50,y:50}),getCanvas:()=>({clientWidth:100,clientHeight:100}),getZoom:()=>17,isMoving:()=>false,queryRenderedFeatures:()=>[],querySourceFeatures:(id,o)=>o.sourceLayer==='landuse'?[f]:[]};
 installSiteLanduse({map,app:{dataset:{}}});assert.equal(writes.length,1);assert.equal(writes[0].features.length,1);assert.deepEqual(writes[0].features[0].geometry,f.geometry);
 assert.ok(sources.has(CIVIC_PARCEL_SOURCE));assert.equal(map.getLayer(CIVIC_PARCEL_LAYER).paint['fill-color'],'#d1d1cd');assert.ok(layers.findIndex(l=>l.id===CIVIC_PARCEL_LAYER)<layers.findIndex(l=>l.id==='roads'));
 handlers.idle();handlers.moveend();handlers.idle();assert.equal(writes.length,1);
});
