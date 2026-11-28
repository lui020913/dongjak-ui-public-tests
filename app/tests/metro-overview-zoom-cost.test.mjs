import test from 'node:test';
import assert from 'node:assert/strict';
import {installResponsiveMetroVisibility,METRO_OVERVIEW_LAYERS} from '../src/metro-overview-visibility.js';
test('metro same-band zoom frames skip geometry and layer reads, while crossings and late styles remain accurate',()=>{
 let zoom=17,moving=false,dimensions=0,layouts=0;const handlers=new Map(),values=new Map(METRO_OVERVIEW_LAYERS.map(id=>[id,'visible']));
 const container={get clientWidth(){dimensions++;return 390;},get clientHeight(){dimensions++;return 844;}};
 const map={getZoom:()=>zoom,getContainer:()=>container,getMaxBounds:()=>null,getLayer:id=>values.has(id)?{}:null,getLayoutProperty:id=>{layouts++;return values.get(id);},setLayoutProperty:(id,k,v)=>values.set(id,v),on:(k,f)=>handlers.set(k,f),off:k=>handlers.delete(k),isMoving:()=>moving};
 const app={dataset:{}};const dispose=installResponsiveMetroVisibility({map,app});
 const initial=[dimensions,layouts];for(let i=0;i<100;i++){zoom=16+i/100;handlers.get('zoom')();}
 assert.deepEqual([dimensions,layouts],initial);
 zoom=11;handlers.get('zoom')();assert.ok([...values.values()].every(v=>v==='none'));assert.equal(dimensions,initial[0]);
 zoom=15;handlers.get('zoom')();assert.ok([...values.values()].every(v=>v==='visible'));
 values.set(METRO_OVERVIEW_LAYERS[0],'none');handlers.get('styledata')();moving=true;handlers.get('idle')();assert.equal(values.get(METRO_OVERVIEW_LAYERS[0]),'none');
 moving=false;handlers.get('idle')();assert.equal(values.get(METRO_OVERVIEW_LAYERS[0]),'visible');
 app.dataset.baseMetro='off';handlers.get('moveend')();assert.ok([...values.values()].every(v=>v==='none'));
 dispose();assert.equal(handlers.size,0);
});
