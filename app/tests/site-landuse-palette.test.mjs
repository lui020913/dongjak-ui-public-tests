import test from 'node:test';import assert from 'node:assert/strict';import {SITE_LANDUSE_PALETTE,siteLandusePaint,installSiteLanduse,repaintSiteLanduse} from '../src/site-landuse-palette.mjs';
test('site colors are distinct and only mapped landuse is painted beneath road and building layers',()=>{const layers=[{id:'ground',type:'background'},{id:'landuse',type:'fill',source:'base','source-layer':'landuse'},{id:'water',type:'fill','source-layer':'water'},{id:'roads',type:'line','source-layer':'transportation'},{id:'buildings',type:'fill','source-layer':'building'}],added=[],writes=[];const map={getStyle:()=>({layers}),getLayer:()=>null,addLayer:(l,before)=>{added.push([l,before]);layers.push(l)},getPaintProperty:()=>null,setPaintProperty:(...x)=>writes.push(x)};assert.equal(installSiteLanduse({map,app:{dataset:{theme:'light'}}}).length,1);assert.equal(added[0][1],'water');assert.equal(added[0][0]['source-layer'],'landuse');assert.equal(new Set(Object.values(SITE_LANDUSE_PALETTE.light)).size,6);assert.deepEqual(siteLandusePaint('light'),siteLandusePaint('dark'));repaintSiteLanduse(map,{dataset:{theme:'dark'}});assert.equal(writes.length,1);assert.deepEqual(writes[0][2],siteLandusePaint('dark'));});

// Evaluate the subset of MapLibre expressions used by the site palette.
function evaluate(expression,tags){
 if(!Array.isArray(expression))return expression;
 const [op,...args]=expression;
 if(op==='get')return tags[args[0]];
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
   [{amenity:'fire_station'},'public'],[{amenity:'townhall'},'public'],
   [{class:'school'},'education'],[{class:'retail'},'commercial'],
   [{class:'residential',subclass:'apartments'},'residential'],[{class:'industrial'},'industrial']
  ])assert.equal(evaluate(e,tags),p[kind],JSON.stringify(tags));
  assert.equal(evaluate(e,{class:'park'}),'rgba(0,0,0,0)');
  assert.equal(evaluate(e,{class:'residential'}),'rgba(0,0,0,0)');
  assert.equal(p.residential,'#f0eeeb');
 }
});

test('apartment reference color is painted without blending into the base ground',()=>{const layers=[{id:'landuse',type:'fill',source:'base','source-layer':'landuse'}],added=[];installSiteLanduse({map:{getStyle:()=>({layers}),getLayer:()=>null,addLayer:l=>added.push(l)},app:{dataset:{theme:'light'}}});assert.equal(evaluate(added[0].paint['fill-opacity'],{class:'apartments'}),1);});
